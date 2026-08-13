import path from "path";
import fs from "fs";
import {
  createIncomeReceipt,
  createPaymentReceipt,
  createTransferReceipt,
  createExchangeReceipt,
  createPaymentRequestInvitation,
  type EmailContent,
} from "../src/modules/emails/emails.templates";
import { WALLET_BADGE_DATA_URI } from "../src/modules/emails/wallet-icon";

const outputDir = path.join(__dirname, "..", "preview");

interface PreviewItem {
  fileName: string;
  title: string;
  content: EmailContent;
}

const previews: PreviewItem[] = [
  {
    fileName: "1-carga-saldo.html",
    title: "Carga de saldo",
    content: createIncomeReceipt({
      amount: "5000",
      currency: "USD",
      newBalance: "12500.500000000001",
      transactionId: "GLB-20260812-000001",
    }),
  },
  {
    fileName: "2-comprobante-pago-pagador.html",
    title: "Comprobante de pago - Pagador",
    content: createPaymentReceipt({
      recipientRole: "payer",
      counterpartName: "Camila Fernández",
      amount: "150000.000000000000",
      currency: "ARS",
      transactionId: "GLB-20260812-000002",
    }),
  },
  {
    fileName: "3-comprobante-pago-receptor.html",
    title: "Comprobante de pago - Receptor",
    content: createPaymentReceipt({
      recipientRole: "receiver",
      counterpartName: "Julián Roldán",
      amount: "450",
      currency: "EUR",
      transactionId: "GLB-20260812-000003",
    }),
  },
  {
    fileName: "4-comprobante-transferencia-enviada.html",
    title: "Transferencia enviada",
    content: createTransferReceipt({
      direction: "sent",
      counterpartName: "Estudio Meridian SRL",
      amount: "200000",
      currency: "ARS",
      transactionId: "GLB-20260812-000004",
    }),
  },
  {
    fileName: "5-comprobante-transferencia-recibida.html",
    title: "Transferencia recibida",
    content: createTransferReceipt({
      direction: "received",
      counterpartName: "Estudio Meridian SRL",
      amount: "200000",
      currency: "ARS",
      transactionId: "GLB-20260812-000005",
    }),
  },
  {
    fileName: "6-cambio-moneda.html",
    title: "Cambio de moneda",
    content: createExchangeReceipt({
      sourceAmount: "1000",
      sourceCurrency: "USD",
      targetAmount: "1250000",
      targetCurrency: "ARS",
      rate: "1250.123456789",
      transactionId: "GLB-20260812-000006",
    }),
  },
  {
    fileName: "7-solicitud-cobro.html",
    title: "Solicitud de cobro",
    content: createPaymentRequestInvitation({
      requesterName: "María González",
      amount: "320000",
      currency: "ARS",
      paymentUrl: "https://globalance.app/cobros/abc123",
    }),
  },
];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const links: string[] = [];
for (const item of previews) {
  const outputPath = path.join(outputDir, item.fileName);
  const htmlBody = item.content.htmlBody.replaceAll(
    "cid:wallet-badge",
    WALLET_BADGE_DATA_URI,
  );
  fs.writeFileSync(outputPath, htmlBody, "utf-8");
  links.push(
    `      <li><a href="${item.fileName}" target="_blank">${item.title}</a></li>`,
  );
  console.log(`  ${item.title}: ${item.fileName}`);
}

const indexHtml = [
  "<!DOCTYPE html>",
  '<html lang="es">',
  "<head>",
  '  <meta charset="utf-8" />',
  "  <title>Vista previa de correos - Globalance</title>",
  "  <style>",
  "    body { font-family: system-ui, sans-serif; background: #f4f4f6; margin: 0; padding: 32px; }",
  "    h1 { font-size: 20px; margin: 0 0 8px; }",
  "    p { color: #555; margin: 0 0 20px; }",
  "    ul { list-style: none; padding: 0; margin: 0; }",
  "    li { margin-bottom: 8px; }",
  "    a { color: #7365aa; text-decoration: none; font-weight: 600; }",
  "    a:hover { text-decoration: underline; }",
  "  </style>",
  "</head>",
  "<body>",
  "  <h1>Vista previa de correos - Globalance</h1>",
  "  <p>Abrí cada correo y probá con DevTools (F12) el modo mobile.</p>",
  "  <ul>",
  ...links,
  "  </ul>",
  "</body>",
  "</html>",
].join("\n");

fs.writeFileSync(path.join(outputDir, "index.html"), indexHtml, "utf-8");
console.log(`\nVista previa generada en: ${outputDir}\\index.html`);
