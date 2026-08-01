import {
  UserRepository,
  UserWithProfile,
} from "../users/user.repository";
import {
  Wallet,
  WalletRepository,
} from "./wallet.repository";
import {
  Balance,
  BalanceRepository,
} from "./balance.repository";

export interface WalletSummary {
  user: {
    id: string;
    email: string;
    user_type: "person" | "company";
    first_name: string | null;
    last_name: string | null;
    legal_name: string | null;
  };
  wallet: Wallet;
  balances: Balance[];
}

export class WalletService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly walletRepository = new WalletRepository(),
    private readonly balanceRepository = new BalanceRepository()
  ) {}

  async getWalletByUserId(userId: string): Promise<WalletSummary> {
    const user: UserWithProfile | null =
      await this.userRepository.findById(userId);

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    if (user.status !== "active") {
      throw new Error("El usuario no está activo");
    }

    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      throw new Error("Billetera no encontrada");
    }

    if (wallet.status !== "active") {
      throw new Error("La billetera no está activa");
    }

    const balances = await this.balanceRepository.findByWalletId(wallet.id);

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
  }
}
