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
    expect(content.htmlBody).toContain("Importe acreditado");
    expect(content.htmlBody).toContain("5000 ARS");
    expect(content.htmlBody).toContain("1550000 ARS");
    expect(content.htmlBody).toContain("tx-1");
    expect(content.textBody).toContain("Carga de saldo");
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
    expect(content.htmlBody).toContain("100 USD");
    expect(content.htmlBody).toContain("149812 ARS");
    expect(content.htmlBody).toContain("1 USD = 1498.12 ARS");
    expect(content.textBody).toContain("Tasa aplicada");
  });
});
