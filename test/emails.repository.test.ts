import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db/pool", () => ({
  pool: { query: vi.fn() },
}));

import { pool } from "../src/db/pool";
import { EmailsRepository } from "../src/modules/emails/emails.repository";

describe("EmailsRepository", () => {
  let repository: EmailsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new EmailsRepository();
  });

  describe("createPendingDelivery", () => {
    it("registra un envío pendiente para 'payment_request_created' enviando el valor completo y usando casts explícitos", async () => {
      const mockResult = { id: "d-1", attempt_number: 1 };
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [mockResult],
      });

      const context = { paymentRequestId: "pr-123" };
      const content = {
        subject: "Nueva solicitud de cobro",
        htmlBody: "<p>Hola</p>",
        textBody: "Hola",
      };

      const result = await repository.createPendingDelivery(
        context,
        "payment_request_created",
        "pagador@correo.com",
        content
      );

      expect(result).toEqual(mockResult);

      // 1. Verificar los casts explícitos en la consulta
      const sqlCall = vi.mocked(pool.query).mock.calls[0][0] as string;
      expect(sqlCall).toContain("$3::varchar");
      expect(sqlCall).toContain("transaction_event = $3::varchar");

      // 2. Verificar que 'payment_request_created' se envía sin truncarse
      const paramsCall = vi.mocked(pool.query).mock.calls[0][1] as any[];
      expect(paramsCall[2]).toBe("payment_request_created");
      expect(paramsCall[2].length).toBe(23);
    });

    it("retorna el attempt_number informado por la base de datos", async () => {
      const mockResult = { id: "d-2", attempt_number: 3 };
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [mockResult],
      });

      const context = { transactionId: "tx-456" };
      const content = {
        subject: "Comprobante de transferencia",
        htmlBody: "<p>Enviado</p>",
        textBody: "Enviado",
      };

      const result = await repository.createPendingDelivery(
        context,
        "transfer_completed",
        "receptor@correo.com",
        content
      );

      expect(result).toEqual(mockResult);
      expect(result.attempt_number).toBe(3);
    });
  });
});
