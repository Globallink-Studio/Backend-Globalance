import {
  SESv2Client,
  SendEmailCommand,
} from "@aws-sdk/client-sesv2";
import { env } from "../../config/env";

export interface InlineImage {
  cid: string;
  pngBase64: string;
}

export interface SendEmailInput {
  recipientEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  inlineImages?: InlineImage[];
}

const sesClient = new SESv2Client({
  region: env.AWS_REGION,
});

function wrapBase64(input: string): string {
  const lines: string[] = [];
  for (let i = 0; i < input.length; i += 76) {
    lines.push(input.slice(i, i + 76));
  }
  return lines.join("\r\n");
}

function encodeHeaderValue(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildRawMessage(input: SendEmailInput): string {
  const altBoundary = `ALT_${Math.random().toString(36).slice(2, 12)}`;
  const relBoundary = `REL_${Math.random().toString(36).slice(2, 12)}`;

  const lines: string[] = [];
  lines.push("MIME-Version: 1.0");
  lines.push(`Date: ${new Date().toUTCString()}`);
  lines.push(`From: <${env.SES_FROM_EMAIL}>`);
  lines.push(`To: <${input.recipientEmail}>`);
  lines.push(`Subject: ${encodeHeaderValue(input.subject)}`);
  lines.push(
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
  );
  lines.push("");
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(
    wrapBase64(Buffer.from(input.textBody, "utf8").toString("base64")),
  );
  lines.push(`--${altBoundary}`);
  lines.push(
    `Content-Type: multipart/related; boundary="${relBoundary}"`,
  );
  lines.push("");
  lines.push(`--${relBoundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"');
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(
    wrapBase64(Buffer.from(input.htmlBody, "utf8").toString("base64")),
  );

  for (const image of input.inlineImages ?? []) {
    lines.push(`--${relBoundary}`);
    lines.push(`Content-Type: image/png; name="${image.cid}.png"`);
    lines.push("Content-Transfer-Encoding: base64");
    lines.push(`Content-ID: <${image.cid}>`);
    lines.push(
      `Content-Disposition: inline; filename="${image.cid}.png"`,
    );
    lines.push("");
    lines.push(wrapBase64(image.pngBase64));
  }

  lines.push(`--${relBoundary}--`);
  lines.push(`--${altBoundary}--`);

  return lines.join("\r\n");
}

export async function sendEmailWithSes(
  input: SendEmailInput,
): Promise<string> {
  if (!env.SES_FROM_EMAIL) {
    throw new Error(
      "La variable SES_FROM_EMAIL no está configurada",
    );
  }

  const inlineImages = input.inlineImages ?? [];

  const command = new SendEmailCommand({
    FromEmailAddress: env.SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [input.recipientEmail],
    },
    Content:
      inlineImages.length > 0
        ? {
            Raw: {
              Data: Buffer.from(buildRawMessage(input), "utf8"),
            },
          }
        : {
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
