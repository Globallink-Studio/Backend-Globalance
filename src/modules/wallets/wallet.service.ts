import { pool } from "../../db/pool";
import { AppError } from "../../errors/app-error";
import {
  findUserWithProfileByFirebaseUid,
  UserWithProfile,
} from "../users/users.repository";
import {
  Wallet,
  WalletRepository,
} from "./wallet.repository";
import {
  Balance,
  BalanceRepository,
} from "../balances/balances.repository";

export interface WalletSummary {
  user: {
    id: string;
    email: string;
    user_type: "person" | "company" | null;
    first_name: string | null;
    last_name: string | null;
    legal_name: string | null;
  };
  wallet: Wallet;
  balances: Balance[];
}

export class WalletService {
  constructor(
    private readonly walletRepository = new WalletRepository(),
    private readonly balanceRepository = new BalanceRepository(),
  ) {}

  async getWalletByFirebaseUid(
    firebaseUid: string,
  ): Promise<WalletSummary> {
    const client = await pool.connect();

    try {
      const user: UserWithProfile | null =
        await findUserWithProfileByFirebaseUid(client, firebaseUid);

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

      const balances =
        await this.balanceRepository.findByWalletId(wallet.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          user_type: user.user_type,
          first_name: user.first_name,
          last_name: user.last_name,
          legal_name: user.legal_name,
        },
        wallet,
        balances,
      };
    } finally {
      client.release();
    }
  }
}
