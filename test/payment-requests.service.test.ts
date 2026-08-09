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

vi.mock("../src/modules/payment-requests/payment-requests.repository", () => ({
  PaymentRequestsRepository: vi.fn(),
}));

vi.mock("../src/modules/transactions/transactions.repository", () => ({
  TransactionsRepository: vi.fn(),
}));

import { pool } from "../src/db/pool";
import { findUserByFirebaseUid } from "../src/modules/auth/auth.repository";
import { PaymentRequestsRepository } from "../src/modules/payment-requests/payment-requests.repository";
import { TransactionsRepository } from "../src/modules/transactions/transactions.repository";
import { PaymentRequestsService } from "../src/modules/payment-requests/payment-requests.service";

function createRepositoryMock() {
  return {
    findUserByEmail: vi.fn(),
    findByIdForUpdate: vi.fn(),
    findByTokenForUpdate: vi.fn(),
    findUserById: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    markAsExpired: vi.fn(),
    markAsPaid: vi.fn(),
  };
}

function createTransactionsMock() {
  return {
    findWalletByUserId: vi.fn(),
    findTransferBalancesForUpdate: vi.fn(),
    createTransferTransaction: vi.fn(),
    createInternalTransferDetail: vi.fn(),
    decreaseBalance: vi.fn(),
    increaseBalance: vi.fn(),
    createDebitMovement: vi.fn(),
    createCreditMovement: vi.fn(),
  };
}

type RepositoryMock = ReturnType<typeof createRepositoryMock>;
type TransactionsMock = ReturnType<typeof createTransactionsMock>;

describe("PaymentRequestsService", () => {
  let repositoryMock: RepositoryMock;
  let transactionsMock: TransactionsMock;
  let service: PaymentRequestsService;

  beforeEach(() => {
    vi.clearAllMocks();

    repositoryMock = createRepositoryMock();
    transactionsMock = createTransactionsMock();
    service = new PaymentRequestsService(
      repositoryMock as unknown as PaymentRequestsRepository,
      transactionsMock as unknown as TransactionsRepository,
    );

    (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(
      fakeClient,
    );
    fakeClient.query.mockImplementation(async () => ({ rows: [] }));
    fakeClient.release.mockImplementation(() => undefined);
  });

  describe("payPaymentRequest", () => {
    it("rechaza con 403 si el pagador no es el destinatario", async () => {
      const payer = { id: "u-payer", status: "active" };
      const paymentRequest = {
        id: "pr-1",
        requester_user_id: "u-req",
        payer_user_id: "u-otro",
        status: "pending",
        currency_code: "ARS",
        amount: "100",
        expires_at: new Date(Date.now() + 60_000),
      };

      vi.mocked(findUserByFirebaseUid).mockResolvedValue(
        payer as never,
      );
      repositoryMock.findByTokenForUpdate.mockResolvedValue(
        paymentRequest,
      );

      await expect(
        service.payPaymentRequest("fb-payer", "token-1", "key-1"),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "PAYMENT_REQUEST_FORBIDDEN",
      });
    });

    it("marca como vencida y rechaza con 409 si la solicitud expiró", async () => {
      const payer = { id: "u-payer", status: "active" };
      const paymentRequest = {
        id: "pr-1",
        requester_user_id: "u-req",
        payer_user_id: "u-payer",
        status: "pending",
        currency_code: "ARS",
        amount: "100",
        expires_at: new Date(Date.now() - 1000),
      };

      vi.mocked(findUserByFirebaseUid).mockResolvedValue(
        payer as never,
      );
      repositoryMock.findByTokenForUpdate.mockResolvedValue(
        paymentRequest,
      );
      repositoryMock.markAsExpired.mockResolvedValue({
        ...paymentRequest,
        status: "expired",
      });

      await expect(
        service.payPaymentRequest("fb-payer", "token-1", "key-1"),
      ).rejects.toMatchObject({
        statusCode: 409,
        code: "PAYMENT_REQUEST_EXPIRED",
      });
      expect(repositoryMock.markAsExpired).toHaveBeenCalledTimes(1);
    });

    it("rechaza con 400 si el saldo del pagador no alcanza", async () => {
      const payer = { id: "u-payer", status: "active" };
      const requester = { id: "u-req", status: "active" };
      const paymentRequest = {
        id: "pr-1",
        requester_user_id: "u-req",
        payer_user_id: "u-payer",
        status: "pending",
        currency_code: "ARS",
        amount: "100",
        expires_at: new Date(Date.now() + 60_000),
      };

      vi.mocked(findUserByFirebaseUid).mockResolvedValue(
        payer as never,
      );
      repositoryMock.findByTokenForUpdate.mockResolvedValue(
        paymentRequest,
      );
      repositoryMock.findUserById.mockResolvedValue(requester);
      transactionsMock.findWalletByUserId.mockResolvedValue({
        id: "w-payer",
        status: "active",
      });
      transactionsMock.findTransferBalancesForUpdate.mockResolvedValue(
        [
          { wallet_id: "w-payer", id: "b-p", amount: "10" },
          { wallet_id: "w-req", id: "b-r", amount: "1000" },
        ],
      );
      transactionsMock.createTransferTransaction.mockResolvedValue(
        "tx-1",
      );
      transactionsMock.createInternalTransferDetail.mockResolvedValue(
        undefined,
      );
      transactionsMock.decreaseBalance.mockResolvedValue(null);

      await expect(
        service.payPaymentRequest("fb-payer", "token-1", "key-1"),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "INSUFFICIENT_FUNDS",
      });
    });
  });

  describe("cancelPaymentRequest", () => {
    it("rechaza con 403 si quien cancela no es el creador", async () => {
      const requester = { id: "u-requester" };
      const paymentRequest = {
        id: "pr-1",
        requester_user_id: "u-otro",
        payer_user_id: "u-payer",
        status: "pending",
        currency_code: "ARS",
        amount: "100",
        expires_at: new Date(Date.now() + 60_000),
      };

      vi.mocked(findUserByFirebaseUid).mockResolvedValue(
        requester as never,
      );
      repositoryMock.findByIdForUpdate.mockResolvedValue(
        paymentRequest,
      );

      await expect(
        service.cancelPaymentRequest("fb-requester", "pr-1"),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: "PAYMENT_REQUEST_FORBIDDEN",
      });
    });
  });
});
