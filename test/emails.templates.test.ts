import { describe, expect, it } from "vitest";
import {
  createExchangeReceipt,
  createIncomeReceipt,
} from "../src/modules/emails/emails.templates";

describe("createIncomeReceipt", () => {
  it("arma el recibo de carga de saldo", () => {
    const content = createIncomeReceipt({
      amount: "5000",
      currency: "ARS",
      transactionId: "tx-1",
      newBalance: "1550000",
    });

    expect(content.subject).toBe("Carga de saldo en Globalance");
    expect(content.htmlBody).toContain("Carga de saldo");
    expect(content.htmlBody).toContain("5.000,00 ARS");
    expect(content.htmlBody).toContain("1.550.000,00 ARS");
    expect(content.htmlBody).toContain("tx-1");
    expect(content.textBody).toContain("Carga de saldo");
  });

  it("recorta los montos a dos decimales", () => {
    const content = createIncomeReceipt({
      amount: "5000.500000000001",
      currency: "ARS",
      transactionId: "tx-3",
      newBalance: "10000.123456",
    });

    expect(content.htmlBody).toContain("5.000,50 ARS");
    expect(content.htmlBody).toContain("10.000,12 ARS");
    expect(content.htmlBody).not.toContain("5000.500000000001");
  });

  it("escapa caracteres HTML del input", () => {
    const content = createIncomeReceipt({
      amount: "<100>",
      currency: "ARS",
      transactionId: "tx & 1",
      newBalance: "0",
    });

    expect(content.htmlBody).not.toContain("<100>");
    expect(content.htmlBody).toContain("&lt;100&gt;");
    expect(content.htmlBody).toContain("tx &amp; 1");
  });

  it("muestra la billetera como img con cid (no svg inline) para Gmail", () => {
    const content = createIncomeReceipt({
      amount: "5000",
      currency: "ARS",
      transactionId: "tx-1",
      newBalance: "10000",
    });

    expect(content.htmlBody).toContain('src="cid:wallet-badge"');
    expect(content.htmlBody).not.toContain("<svg");
  });
});

describe("createExchangeReceipt", () => {
  it("arma el recibo de cambio de moneda", () => {
    const content = createExchangeReceipt({
      sourceAmount: "100",
      sourceCurrency: "USD",
      targetAmount: "149812",
      targetCurrency: "ARS",
      rate: "1498.12",
      transactionId: "tx-2",
    });

    expect(content.subject).toBe(
      "Cambio de USD a ARS en Globalance",
    );
    expect(content.htmlBody).toContain("100,00 USD");
    expect(content.htmlBody).toContain("149.812,00 ARS");
    expect(content.htmlBody).toContain("1 USD = 1.498,12 ARS");
    expect(content.textBody).toContain("Tasa aplicada");
  });

  it("mantiene hasta 4 decimales en tasas pequeñas", () => {
    const content = createExchangeReceipt({
      sourceAmount: "0.0008",
      sourceCurrency: "ARS",
      targetAmount: "1",
      targetCurrency: "USD",
      rate: "0.0008",
      transactionId: "tx-4",
    });

    expect(content.htmlBody).toContain("1 ARS = 0,0008 USD");
  });
});
