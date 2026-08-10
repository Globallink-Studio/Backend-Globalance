import { env } from "../../config/env";
import {
  EmailDeliveryContext,
  EmailDeliveryEvent,
  EmailsRepository,
} from "./emails.repository";
import { EmailContent } from "./emails.templates";
import { sendEmailWithSes } from "./ses.client";

export interface TrackedEmailInput {
  context: EmailDeliveryContext;
  event: EmailDeliveryEvent;
  recipientEmail: string;
  content: EmailContent;
}

export type EmailSendResult =
  | {
      status: "sent";
      deliveryId: string;
      providerMessageId: string;
    }
  | {
      status: "failed";
      deliveryId: string | null;
      errorMessage: string;
    }
  | {
      status: "skipped";
    };

export class EmailsServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "EmailsServiceError";
  }
}

export class EmailsService {
  constructor(
    private readonly emailsRepository =
      new EmailsRepository(),
  ) {}

  async sendTrackedEmail(
    input: TrackedEmailInput,
  ): Promise<EmailSendResult> {
    if (!env.EMAIL_DELIVERY_ENABLED) {
      return {
        status: "skipped",
      };
    }

    let deliveryId: string | null = null;

    try {
      const delivery =
        await this.emailsRepository.createPendingDelivery(
          input.context,
          input.event,
          input.recipientEmail,
          input.content,
        );

      deliveryId = delivery.id;

      const providerMessageId = await sendEmailWithSes({
        recipientEmail: input.recipientEmail,
        subject: input.content.subject,
        htmlBody: input.content.htmlBody,
        textBody: input.content.textBody,
      });

      await this.emailsRepository.markAsSent(
        delivery.id,
        providerMessageId,
      );

      return {
        status: "sent",
        deliveryId: delivery.id,
        providerMessageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message.slice(0, 2000)
          : "Error desconocido al enviar el correo";

      if (deliveryId) {
        try {
          await this.emailsRepository.markAsFailed(
            deliveryId,
            errorMessage,
          );
        } catch (persistenceError) {
          console.error(
            "No se pudo registrar el fallo del correo",
            persistenceError,
          );
        }
      }

      console.error("Falló el envío de correo", error);

      return {
        status: "failed",
        deliveryId,
        errorMessage,
      };
    }
  }

  async retryFailedEmail(
    deliveryId: string,
    firebaseUid: string,
  ): Promise<EmailSendResult> {
    if (!env.EMAIL_DELIVERY_ENABLED) {
      throw new EmailsServiceError(
        503,
        "EMAIL_DELIVERY_DISABLED",
        "El envío de correos está deshabilitado",
    );
  }

  const canRetry =
    await this.emailsRepository.canUserRetryDelivery(
      deliveryId,
      firebaseUid,
    );

  if (!canRetry) {
    throw new EmailsServiceError(
      403,
      "EMAIL_RETRY_FORBIDDEN",
      "No tenés permiso para reenviar este correo",
    );
}

  const failedDelivery =
    await this.emailsRepository.findFailedDeliveryById(
      deliveryId,
    );

  if (!failedDelivery) {
    throw new EmailsServiceError(
      404,
      "FAILED_EMAIL_NOT_FOUND",
      "No se encontró un correo fallido con ese identificador",
    );
  }

  if (
    !failedDelivery.subject ||
    !failedDelivery.html_body ||
    !failedDelivery.text_body
  ) {
    throw new EmailsServiceError(
      409,
      "EMAIL_CONTENT_UNAVAILABLE",
      "El correo fallido no tiene contenido guardado para reenviarlo",
    );
  }

  let context: EmailDeliveryContext;

  if (failedDelivery.transaction_id) {
    context = {
      transactionId: failedDelivery.transaction_id,
    };
  } else if (failedDelivery.payment_request_id) {
    context = {
      paymentRequestId:
        failedDelivery.payment_request_id,
    };
  } else {
    throw new EmailsServiceError(
      409,
      "EMAIL_CONTEXT_UNAVAILABLE",
      "El correo fallido no tiene un contexto válido",
    );
  }

  return this.sendTrackedEmail({
    context,
    event: failedDelivery.transaction_event,
    recipientEmail: failedDelivery.recipient_email,
    content: {
      subject: failedDelivery.subject,
      htmlBody: failedDelivery.html_body,
      textBody: failedDelivery.text_body,
    },
  });
}
}