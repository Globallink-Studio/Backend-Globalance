export const DEMO_FUNDING_LIMITS = {
  ARS: "10000000",
  USD: "10000",
  EUR: "10000",
} as const;

export type DemoFundingCurrency = keyof typeof DEMO_FUNDING_LIMITS;
