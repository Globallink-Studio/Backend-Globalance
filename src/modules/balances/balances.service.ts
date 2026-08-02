import { pool } from "../../db/pool";
import { findUserByFirebaseUid } from "../auth/auth.repository";
import { Balance, BalanceRepository } from "../wallets/balance.repository";
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
        throw new Error("Usuario no encontrado");
      }

      if (user.status !== "active") {
        throw new Error("El usuario no está activo");
      }

      const wallet = await this.walletRepository.findByUserId(user.id);

      if (!wallet) {
        throw new Error("Billetera no encontrada");
      }

      if (wallet.status !== "active") {
        throw new Error("La billetera no está activa");
      }

      return await this.balanceRepository.findByWalletId(wallet.id);
    } finally {
      client.release();
    }
  }
}
