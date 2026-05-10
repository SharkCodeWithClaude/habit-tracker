export const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://habit:habit_dev@localhost:5432/habit_tracker";

export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
export const JWT_EXPIRES_IN = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days
export const BCRYPT_ROUNDS = 10;
export const TOKEN_BUDGET_THRESHOLD = Number(process.env.TOKEN_BUDGET_THRESHOLD ?? 4000);
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "0".repeat(64);
