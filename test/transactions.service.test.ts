import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeClient, emailsServiceMock } = vi.hoisted(() => ({
  fakeClient: {
    query: vi.fn(),
    release: vi.fn(),
  },
  emailsServiceMock: {
    sendTrackedEmail: vi.fn(),
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

vi.mock("../src/modules/emails/emails.service", () => ({
  EmailsService: vi.fn(),
}));

import { pool } from "../src/db/pool";
import { TransactionsServiceError } from "../src/errors/service-errors";
import { findUserByFirebaseUid } from "../src/modules/auth/auth.repository";
import { RateProvider } from "../src/modules/exchange/rate-provider";
import { TransactionsRepository } from "../src/modules/transactions/transactions.repository";
import { TransactionsService } from "../src/modules/transactions/transactions.service";

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
    findHistoryByWalletId: vi.fn(),
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
      emailsServiceMock as unknown as never,
    );

    (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeClient,
    );
    fakeClient.query.mockImplementation(async () => ({ rows: [] }));
    fakeClient.release.mockImplementation(() => undefined);

    user = {
      id: "u1",
      firebase_uid: "fb1",
      email: "manu@globalance.com",
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
    emailsServiceMock.sendTrackedEmail.mockResolvedValue({
      status: "skipped",
    });
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

  it("envía el correo de cambio al completar la conversión", async () => {
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

    await service.createExchange("fb1", input, "key-1");

    expect(
      emailsServiceMock.sendTrackedEmail,
    ).toHaveBeenCalledWith({
      context: { transactionId: "tx-1" },
      event: "exchange_completed",
      recipientEmail: "manu@globalance.com",
      content: expect.objectContaining({
        subject: "Cambio de USD a ARS en Globalance",
      }),
    });
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

describe("TransactionsService.listTransactions", () => {
  let repositoryMock: RepositoryMock;
  let service: TransactionsService;

  const query = {
    type: "sale" as const,
    currency: "USD" as const,
    limit: 20,
    offset: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    repositoryMock = createRepositoryMock();
    service = new TransactionsService(
      repositoryMock as unknown as TransactionsRepository,
      undefined as unknown as RateProvider,
      emailsServiceMock as unknown as never,
    );

    (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeClient,
    );
    fakeClient.query.mockImplementation(async () => ({ rows: [] }));
    fakeClient.release.mockImplementation(() => undefined);

    vi.mocked(findUserByFirebaseUid).mockResolvedValue({
      id: "u1",
      firebase_uid: "fb1",
      status: "active",
    } as never);
    repositoryMock.findWalletByUserId.mockResolvedValue({
      id: "w1",
      user_id: "u1",
      status: "active",
    });
  });

  it("devuelve el historial filtrado y commitea", async () => {
    const history = [
      {
        id: "tx-1",
        type: "sale",
        status: "completed",
        movements: [],
      },
    ];
    repositoryMock.findHistoryByWalletId.mockResolvedValue(history);

    const result = await service.listTransactions("fb1", query);

    expect(result).toBe(history);
    expect(
      repositoryMock.findHistoryByWalletId,
    ).toHaveBeenCalledWith(
      fakeClient,
      "w1",
      "sale",
      "USD",
      20,
      0,
    );
    expect(fakeClient.query).toHaveBeenCalledWith("COMMIT");
  });

  it("pasa null a los filtros cuando no vienen", async () => {
    repositoryMock.findHistoryByWalletId.mockResolvedValue([]);

    await service.listTransactions("fb1", { limit: 10, offset: 5 });

    expect(
      repositoryMock.findHistoryByWalletId,
    ).toHaveBeenCalledWith(
      fakeClient,
      "w1",
      null,
      null,
      10,
      5,
    );
  });

  it("rechaza con 404 si el usuario no existe", async () => {
    vi.mocked(findUserByFirebaseUid).mockResolvedValue(null);

    await expect(
      service.listTransactions("fb1", query),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "USER_NOT_FOUND",
    });
    expect(
      repositoryMock.findHistoryByWalletId,
    ).not.toHaveBeenCalled();
  });

  it("rechaza con 404 si la billetera no existe", async () => {
    repositoryMock.findWalletByUserId.mockResolvedValue(null);

    await expect(
      service.listTransactions("fb1", query),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "WALLET_NOT_FOUND",
    });
  });
});
