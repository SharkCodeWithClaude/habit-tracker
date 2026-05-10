import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";
import { UserRepository } from "../repositories/user.repository.js";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository.js";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  BCRYPT_ROUNDS,
} from "../config/env.js";
import type { Database } from "../config/database.js";
import type { UserPublic } from "@habit-tracker/shared";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

function toPublicUser(user: { id: string; email: string; displayName: string | null }): UserPublic {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export class AuthService {
  private userRepo: UserRepository;
  private tokenRepo: RefreshTokenRepository;

  constructor(db: Database) {
    this.userRepo = new UserRepository(db);
    this.tokenRepo = new RefreshTokenRepository(db);
  }

  async register(email: string, password: string, displayName?: string) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new AuthError("Email already registered", 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.userRepo.create({ email, passwordHash, displayName });

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return { user: toPublicUser(user), accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AuthError("Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError("Invalid email or password", 401);
    }

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return { user: toPublicUser(user), accessToken, refreshToken };
  }

  async refresh(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const stored = await this.tokenRepo.findValidByHash(tokenHash);
    if (!stored) {
      throw new AuthError("Invalid or expired refresh token", 401);
    }

    await this.tokenRepo.deleteByHash(tokenHash);

    const user = await this.userRepo.findById(stored.userId);
    if (!user) {
      throw new AuthError("User not found", 401);
    }

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const newRefreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    await this.tokenRepo.deleteByHash(tokenHash);
  }

  private async generateAccessToken(userId: string, email: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return sign(
      { sub: userId, email, iat: now, exp: now + JWT_EXPIRES_IN },
      JWT_SECRET
    );
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = generateRefreshToken();
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000);
    await this.tokenRepo.create({ userId, tokenHash, expiresAt });
    return raw;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
