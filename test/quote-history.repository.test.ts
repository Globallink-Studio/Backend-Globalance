import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/db/pool", () => ({
  pool: { query: vi.fn() },
}));

import { pool } from "../src/db/pool";
import { findQuoteHistory } from "../src/modules/exchange/quote-history.repository";

describe("quote-history.repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findQuoteHistory", () => {
    it("devuelve el historial ordenado por fecha ascendente", async () => {
      const mockRows = [
        {
          quote_date: "2026-08-10",
          rate: "1498.1200000000",
          provider: "frankfurter",
        },
      ];
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: mockRows,
      });

      const result = await findQuoteHistory("USD", "ARS", 7);

      expect(result).toEqual(mockRows);

      const sqlCall = vi.mocked(pool.query).mock.calls[0][0] as string;
      expect(sqlCall).toContain("FROM exchange_quote_history");
      expect(sqlCall).toContain("quote_date::text AS quote_date");
      expect(sqlCall).toContain("quote_date >= (CURRENT_DATE - $3::integer + 1)");
      expect(sqlCall).toContain("ORDER BY quote_date ASC");

      const paramsCall = vi.mocked(pool.query).mock.calls[0][1] as any[];
      expect(paramsCall).toEqual(["USD", "ARS", 7]);
    });
  });
});
