import { createHash, randomUUID } from 'crypto';

import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';

import { PrismaService } from '../../database/prisma.service.js';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto.js';
import { TokenBlacklistService } from './token-blacklist.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  // ─── Register ──────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    this.logger.log(`User registered: ${user.email}`);

    return user;
  }

  // ─── Login ─────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const passwordValid = await compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    // Store refresh token hash
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  // ─── Refresh Tokens ────────────────────────────────────────

  async refreshTokens(userId: string, oldRefreshToken: string) {
    const tokenHash = this.hashToken(oldRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.userId !== userId
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new pair
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
    );

    // Store new refresh token
    await this.storeRefreshToken(storedToken.user.id, tokens.refreshToken);

    return tokens;
  }

  // ─── Logout ────────────────────────────────────────────────

  async logout(
    userId: string,
    refreshToken?: string,
    accessToken?: string,
    jti?: string,
    exp?: number,
  ) {
    // 1. Revoke the current device's refresh token
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenHash,
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    // 2. Blacklist the current device's access token (by jti and token hash)
    if (accessToken || jti) {
      await this.tokenBlacklistService.blacklistToken(accessToken, exp, jti);
    }

    this.logger.log(`User logged out from current device: ${userId}`);
  }

  // ─── Logout All Devices ──────────────────────────────────────

  async logoutAll(userId: string) {
    // Revoke all active refresh tokens in database
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    // Invalidate all access tokens issued prior to this moment
    await this.tokenBlacklistService.revokeUserTokens(userId);

    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  // ─── Profile ───────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async generateAuthResponse(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }) {
    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl ?? null,
      },
      ...tokens,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email, jti: randomUUID(), iatMs: Date.now() };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ||
          '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
          '7d') as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
