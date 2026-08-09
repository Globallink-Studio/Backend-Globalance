import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
import { env } from "../../config/env";

export interface SendEmailInput {
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

const sesClient = new SESv2Client({
  region: env.AWS_REGION,
});

export async function sendEmailWithSes(
  input: SendEmailInput,
): Promise<string> {
  if (!env.SES_FROM_EMAIL) {
    throw new Error(
      "La variable SES_FROM_EMAIL no está configurada",
    );
  }

  const command = new SendEmailCommand({
    FromEmailAddress: env.SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [input.recipientEmail],
    },
    Content: {
      Simple: {
        Subject: {
          Data: input.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: input.htmlBody,
            Charset: "UTF-8",
          },
          Text: {
            Data: input.textBody,
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  const result = await sesClient.send(command);

  if (!result.MessageId) {
    throw new Error(
      "Amazon SES no devolvió un identificador de mensaje",
    );
  }

  return result.MessageId;
}