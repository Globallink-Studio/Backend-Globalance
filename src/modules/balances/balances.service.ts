import { pool } from "../../db/pool";
import { AppError } from "../../errors/app-error";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import { Balance, BalanceRepository } from "./balances.repository";
import { WalletRepository } from "../wallets/wallet.repository";

export class BalancesService {
  constructor(
    private readonly walletRepository = new WalletRepository(),
    private readonly balanceRepository = new BalanceRepository(),
  ) {}

  async getBalancesByFirebaseUid(
    firebaseUid: string,
  ): Promise<Balance[]> {
    const client = await pool.connect();

    try {
      const user = await findUserByFirebaseUid(client, firebaseUid);

      if (!user) {
        throw new AppError(
          404,
          "USER_NOT_FOUND",
          "Usuario no encontrado.",
        );
      }

      if (user.status !== "active") {
        throw new AppError(
          403,
          "USER_INACTIVE",
          "El usuario no está activo.",
        );
      }

      const wallet = await this.walletRepository.findByUserId(user.id);

      if (!wallet) {
        throw new AppError(
          404,
          "WALLET_NOT_FOUND",
          "Billetera no encontrada.",
        );
      }

      if (wallet.status !== "active") {
        throw new AppError(
          403,
          "WALLET_INACTIVE",
          "La billetera no está activa.",
        );
      }

      return await this.balanceRepository.findByWalletId(wallet.id);
    } finally {
      client.release();
    }
  }
}
