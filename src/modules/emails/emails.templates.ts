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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createPaymentRequestInvitation(
  input: PaymentRequestInvitationInput,
): EmailContent {
  const requesterName = escapeHtml(input.requesterName);
  const amount = escapeHtml(input.amount);
  const currency = escapeHtml(input.currency);
  const paymentUrl = escapeHtml(input.paymentUrl);

  return {
    subject: "Tenés una solicitud de cobro en Globalance",
    htmlBody: `
      <h1>Solicitud de cobro</h1>
      <p>${requesterName} te envió una solicitud de cobro.</p>
      <p><strong>Importe:</strong> ${amount} ${currency}</p>
      <p>
        <a href="${paymentUrl}">
          Ver solicitud en Globalance
        </a>
      </p>
      <p>La solicitud vence dentro de 7 días.</p>
    `,
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

  const counterpartName = escapeHtml(input.counterpartName);
  const amount = escapeHtml(input.amount);
  const currency = escapeHtml(input.currency);
  const transactionId = escapeHtml(input.transactionId);

  return {
    subject: `${action} en Globalance`,
    htmlBody: `
      <h1>${action}</h1>
      <p><strong>Contraparte:</strong> ${counterpartName}</p>
      <p><strong>Importe:</strong> ${amount} ${currency}</p>
      <p><strong>Transacción:</strong> ${transactionId}</p>
    `,
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

  const counterpartName = escapeHtml(input.counterpartName);
  const amount = escapeHtml(input.amount);
  const currency = escapeHtml(input.currency);
  const transactionId = escapeHtml(input.transactionId);

  return {
    subject: `${action} en Globalance`,
    htmlBody: `
      <h1>${action}</h1>
      <p><strong>Contraparte:</strong> ${counterpartName}</p>
      <p><strong>Importe:</strong> ${amount} ${currency}</p>
      <p><strong>Transacción:</strong> ${transactionId}</p>
    `,
    textBody:
      `${action}. Contraparte: ${input.counterpartName}. ` +
      `Importe: ${input.amount} ${input.currency}. ` +
      `Transacción: ${input.transactionId}.`,
  };
}