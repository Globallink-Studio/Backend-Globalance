import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeClient } = vi.hoisted(() => ({
  fakeClient: {
    query: vi.fn(),
    release: vi.fn(),
  },
}));

vi.mock("../src/db/pool", () => ({
  pool: { connect: vi.fn() },
}));

vi.mock("../src/modules/auth/auth.repository", () => ({
  findUserByFirebaseUid: vi.fn(),
}));

vi.mock("../src/modules/transactions/transactions.repository", () => ({
  TransactionsRepository: vi.fn(),
}));

vi.mock("../src/modules/exchange/rate-provider", () => ({
  RateProvider: vi.fn(),
  RateProviderError: class RateProviderError extends Error {},
}));

import { pool } from "../src/db/pool";
import { findUserByFirebaseUid } from "../src/modules/auth/auth.repository";
import { RateProvider } from "../src/modules/exchange/rate-provider";
import { TransactionsRepository } from "../src/modules/transactions/transactions.repository";
import {
  TransactionsService,
  TransactionsServiceError,
} from "../src/modules/transactions/transactions.service";

function createRepositoryMock() {
  return {
    findWalletByUserId: vi.fn(),
    findExchangeByIdempotencyKey: vi.fn(),
    countDailyExchangeOperations: vi.fn(),
    findBalanceForUpdate: vi.fn(),
    createExchangeTransaction: vi.fn(),
    createConversion: vi.fn(),
    decreaseBalance: vi.fn(),
    createDebitMovement: vi.fn(),
    increaseBalance: vi.fn(),
    createCreditMovement: vi.fn(),
  };
}

type RepositoryMock = ReturnType<typeof createRepositoryMock>;

describe("TransactionsService.createExchange", () => {
  let repositoryMock: RepositoryMock;
  let rateProviderMock: { getRate: ReturnType<typeof vi.fn> };
  let service: TransactionsService;
  let user: Record<string, unknown>;
  let wallet: Record<string, unknown>;

  const rate = {
    source: "USD",
    target: "ARS",
    rate: 1498.12,
    provider: "frankfurter",
    fetchedAt: new Date(),
  };

  const input = {
    sourceCurrency: "USD",
    targetCurrency: "ARS",
    sourceAmount: "100",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    repositoryMock = createRepositoryMock();
    rateProviderMock = { getRate: vi.fn() };
    service = new TransactionsService(
      repositoryMock as unknown as TransactionsRepository,
      rateProviderMock as unknown as RateProvider,
    );

    (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeClient,
    );
    fakeClient.query.mockImplementation(async () => ({ rows: [] }));
    fakeClient.release.mockImplementation(() => undefined);

    user = {
      id: "u1",
      firebase_uid: "fb1",
      status: "active",
      display_currency: "ARS",
      timezone: "America/Argentina/Buenos_Aires",
    };
    wallet = { id: "w1", user_id: "u1", status: "active" };

    vi.mocked(findUserByFirebaseUid).mockResolvedValue(
      user as never,
    );
    repositoryMock.findWalletByUserId.mockResolvedValue(wallet);
    rateProviderMock.getRate.mockResolvedValue(rate);
    repositoryMock.findExchangeByIdempotencyKey.mockResolvedValue(
      null,
    );
  });

  it("devuelve la transacción existente si la Idempotency-Key ya se usó", async () => {
    const existing = {
      transaction_id: "tx-1",
      type: "sale",
      status: "completed",
    };
    repositoryMock.findExchangeByIdempotencyKey.mockResolvedValue(
      existing,
    );

    const result = await service.createExchange(
      "fb1",
      input,
      "key-repetida",
    );

    expect(result).toBe(existing);
    expect(
      repositoryMock.countDailyExchangeOperations,
    ).not.toHaveBeenCalled();
    expect(
      repositoryMock.createExchangeTransaction,
    ).not.toHaveBeenCalled();
  });

  it("rechaza con 429 cuando se alcanza el límite diario de 30", async () => {
    repositoryMock.countDailyExchangeOperations.mockResolvedValue(
      30,
    );

    await expect(
      service.createExchange("fb1", input, "key-1"),
    ).rejects.toMatchObject({
      statusCode: 429,
      code: "EXCHANGE_DAILY_LIMIT_REACHED",
    });
  });

  it("rechaza con 422 si el saldo de origen no alcanza", async () => {
    repositoryMock.countDailyExchangeOperations.mockResolvedValue(
      0,
    );
    repositoryMock.findBalanceForUpdate.mockImplementation(
      async (
        _client: unknown,
        _walletId: unknown,
        currency: string,
      ) =>
        currency === "USD"
          ? { id: "b-usd", wallet_id: "w1", amount: "100" }
          : { id: "b-ars", wallet_id: "w1", amount: "999999" },
    );

    await expect(
      service.createExchange(
        "fb1",
        { ...input, sourceAmount: "200" },
        "key-1",
      ),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: "INSUFFICIENT_FUNDS",
    });
  });

  it("convierte con éxito y commitea la transacción", async () => {
    repositoryMock.countDailyExchangeOperations.mockResolvedValue(
      0,
    );
    repositoryMock.findBalanceForUpdate.mockImplementation(
      async (
        _client: unknown,
        _walletId: unknown,
        currency: string,
      ) =>
        currency === "USD"
          ? { id: "b-usd", wallet_id: "w1", amount: "1000" }
          : { id: "b-ars", wallet_id: "w1", amount: "0" },
    );
    repositoryMock.createExchangeTransaction.mockResolvedValue(
      "tx-1",
    );
    repositoryMock.createConversion.mockResolvedValue("149812.00");
    repositoryMock.decreaseBalance.mockResolvedValue("900");
    repositoryMock.increaseBalance.mockResolvedValue("149812.00");
    repositoryMock.findExchangeByIdempotencyKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        transaction_id: "tx-1",
        type: "sale",
        status: "completed",
        source_currency: "USD",
        target_currency: "ARS",
      });

    const result = await service.createExchange(
      "fb1",
      input,
      "key-1",
    );

    expect(result.transaction_id).toBe("tx-1");
    expect(fakeClient.query).toHaveBeenCalledWith("COMMIT");
  });

  it("propaga errores del servicio con su código", async () => {
    const error = new TransactionsServiceError(
      422,
      "INSUFFICIENT_FUNDS",
      "Saldo insuficiente",
    );
    repositoryMock.findBalanceForUpdate.mockRejectedValue(error);

    await expect(
      service.createExchange("fb1", input, "key-1"),
    ).rejects.toBe(error);
  });
});
