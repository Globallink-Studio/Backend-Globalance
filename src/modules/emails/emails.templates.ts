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

export function createIncomeReceipt(
  input: IncomeReceiptInput,
): EmailContent {
  const amount = escapeHtml(input.amount);
  const currency = escapeHtml(input.currency);
  const transactionId = escapeHtml(input.transactionId);
  const newBalance = escapeHtml(input.newBalance);

  return {
    subject: "Carga de saldo en Globalance",
    htmlBody: `
      <h1>Carga de saldo</h1>
      <p><strong>Importe acreditado:</strong> ${amount} ${currency}</p>
      <p><strong>Saldo actual:</strong> ${newBalance} ${currency}</p>
      <p><strong>Transacción:</strong> ${transactionId}</p>
    `,
    textBody:
      `Carga de saldo. Importe acreditado: ${input.amount} ` +
      `${input.currency}. Saldo actual: ${input.newBalance} ` +
      `${input.currency}. Transacción: ${input.transactionId}.`,
  };
}

export function createExchangeReceipt(
  input: ExchangeReceiptInput,
): EmailContent {
  const sourceAmount = escapeHtml(input.sourceAmount);
  const sourceCurrency = escapeHtml(input.sourceCurrency);
  const targetAmount = escapeHtml(input.targetAmount);
  const targetCurrency = escapeHtml(input.targetCurrency);
  const rate = escapeHtml(input.rate);
  const transactionId = escapeHtml(input.transactionId);

  return {
    subject: `Cambio de ${sourceCurrency} a ${targetCurrency} en Globalance`,
    htmlBody: `
      <h1>Cambio de moneda</h1>
      <p><strong>Enviaste:</strong> ${sourceAmount} ${sourceCurrency}</p>
      <p><strong>Recibiste:</strong> ${targetAmount} ${targetCurrency}</p>
      <p><strong>Tasa aplicada:</strong> 1 ${sourceCurrency} = ${rate} ${targetCurrency}</p>
      <p><strong>Transacción:</strong> ${transactionId}</p>
    `,
    textBody:
      `Cambio de ${input.sourceCurrency} a ${input.targetCurrency}. ` +
      `Enviaste ${input.sourceAmount} ${input.sourceCurrency}. ` +
      `Recibiste ${input.targetAmount} ${input.targetCurrency}. ` +
      `Tasa aplicada: 1 ${input.sourceCurrency} = ${input.rate} ${input.targetCurrency}. ` +
      `Transacción: ${input.transactionId}.`,
  };
}