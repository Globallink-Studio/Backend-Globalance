import path from "path";
import fs from "fs";

export interface EmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

interface PaymentRequestInvitationInput {
  requesterName: string;
  amount: string;
  currency: string;
  paymentUrl: string;
}

interface PaymentReceiptInput {
  recipientRole: "payer" | "receiver";
  counterpartName: string;
  amount: string;
  currency: string;
  transactionId: string;
}

interface TransferReceiptInput {
  direction: "sent" | "received";
  counterpartName: string;
  amount: string;
  currency: string;
  transactionId: string;
}

interface IncomeReceiptInput {
  amount: string;
  currency: string;
  transactionId: string;
  newBalance: string;
}

interface ExchangeReceiptInput {
  sourceAmount: string;
  sourceCurrency: string;
  targetAmount: string;
  targetCurrency: string;
  rate: string;
  transactionId: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const templateCache: Record<string, string> = {};

function loadAndRenderTemplate(
  templateName: string,
  variables: Record<string, string>,
): string {
  let template = templateCache[templateName];
  if (!template) {
    const filePath = path.join(__dirname, "templates", `${templateName}.html`);
    template = fs.readFileSync(filePath, "utf-8");
    templateCache[templateName] = template;
  }

  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const escapedValue = escapeHtml(value);
    rendered = rendered.replaceAll(`{{${key}}}`, escapedValue);
  }

  const missingPlaceholderRegex = /\{\{[^{}]+\}\}/;
  const match = rendered.match(missingPlaceholderRegex);
  if (match) {
    throw new Error(
      `El marcador ${match[0]} en la plantilla '${templateName}' no fue reemplazado.`,
    );
  }

  return rendered;
}

export function createPaymentRequestInvitation(
  input: PaymentRequestInvitationInput,
): EmailContent {
  const htmlBody = loadAndRenderTemplate("solicitud-cobro", {
    requesterName: input.requesterName,
    amount: input.amount,
    currency: input.currency,
    paymentUrl: input.paymentUrl,
  });

  return {
    subject: "Tenés una solicitud de cobro en Globalance",
    htmlBody,
    textBody:
      `${input.requesterName} te envió una solicitud de cobro ` +
      `por ${input.amount} ${input.currency}. ` +
      `Podés verla en ${input.paymentUrl}. ` +
      "La solicitud vence dentro de 7 días.",
  };
}

export function createPaymentReceipt(
  input: PaymentReceiptInput,
): EmailContent {
  const action =
    input.recipientRole === "payer"
      ? "Realizaste un pago"
      : "Recibiste un pago";

  const htmlBody = loadAndRenderTemplate("comprobante-pago", {
    action,
    counterpartName: input.counterpartName,
    amount: input.amount,
    currency: input.currency,
    transactionId: input.transactionId,
  });

  return {
    subject: `${action} en Globalance`,
    htmlBody,
    textBody:
      `${action}. Contraparte: ${input.counterpartName}. ` +
      `Importe: ${input.amount} ${input.currency}. ` +
      `Transacción: ${input.transactionId}.`,
  };
}

export function createTransferReceipt(
  input: TransferReceiptInput,
): EmailContent {
  const action =
    input.direction === "sent"
      ? "Enviaste una transferencia"
      : "Recibiste una transferencia";

  const htmlBody = loadAndRenderTemplate("comprobante-transferencia", {
    action,
    counterpartName: input.counterpartName,
    amount: input.amount,
    currency: input.currency,
    transactionId: input.transactionId,
  });

  return {
    subject: `${action} en Globalance`,
    htmlBody,
    textBody:
      `${action}. Contraparte: ${input.counterpartName}. ` +
      `Importe: ${input.amount} ${input.currency}. ` +
      `Transacción: ${input.transactionId}.`,
  };
}

export function createIncomeReceipt(
  input: IncomeReceiptInput,
): EmailContent {
  const htmlBody = loadAndRenderTemplate("carga-saldo", {
    amount: input.amount,
    currency: input.currency,
    newBalance: input.newBalance,
    transactionId: input.transactionId,
  });

  return {
    subject: "Carga de saldo en Globalance",
    htmlBody,
    textBody:
      `Carga de saldo. Importe acreditado: ${input.amount} ` +
      `${input.currency}. Saldo actual: ${input.newBalance} ` +
      `${input.currency}. Transacción: ${input.transactionId}.`,
  };
}

export function createExchangeReceipt(
  input: ExchangeReceiptInput,
): EmailContent {
  const htmlBody = loadAndRenderTemplate("cambio-moneda", {
    sourceAmount: input.sourceAmount,
    sourceCurrency: input.sourceCurrency,
    targetAmount: input.targetAmount,
    targetCurrency: input.targetCurrency,
    rate: input.rate,
    transactionId: input.transactionId,
  });

  return {
    subject: `Cambio de ${input.sourceCurrency} a ${input.targetCurrency} en Globalance`,
    htmlBody,
    textBody:
      `Cambio de ${input.sourceCurrency} a ${input.targetCurrency}. ` +
      `Enviaste ${input.sourceAmount} ${input.sourceCurrency}. ` +
      `Recibiste ${input.targetAmount} ${input.targetCurrency}. ` +
      `Tasa aplicada: 1 ${input.sourceCurrency} = ${input.rate} ${input.targetCurrency}. ` +
      `Transacción: ${input.transactionId}.`,
  };
}