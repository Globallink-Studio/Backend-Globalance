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
}