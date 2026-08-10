import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`La variable de entorno ${name} no está definida.`);
  }

  return value;
}

export const env = {
  PORT: process.env.PORT ?? "3000",
  DATABASE_URL: required("DATABASE_URL"),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  DEMO_FUNDING_ENABLED: process.env.DEMO_FUNDING_ENABLED === "true",
  EXCHANGE_RATE_API_KEY: process.env.EXCHANGE_RATE_API_KEY ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  FIREBASE_PROJECT_ID: required("FIREBASE_PROJECT_ID"),
  FIREBASE_CLIENT_EMAIL: required("FIREBASE_CLIENT_EMAIL"),
  FIREBASE_PRIVATE_KEY: required("FIREBASE_PRIVATE_KEY"),
};
