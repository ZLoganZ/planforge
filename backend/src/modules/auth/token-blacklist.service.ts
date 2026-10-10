import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../database/redis/redis.service.js';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Blacklist an individual access token by JTI and/or token hash.
   * TTL is computed from token expiration timestamp or defaults to 15 minutes.
   */
  async blacklistToken(
    token?: string,
    exp?: number,
    jti?: string,
  ): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttlSeconds =
      exp && exp > nowSeconds
        ? exp - nowSeconds + 30 // add 30s buffer
        : 15 * 60; // default 15 minutes

    const promises: Promise<void>[] = [];

    if (jti) {
      promises.push(
        this.redisService.set(`token:blacklist:jti:${jti}`, '1', ttlSeconds),
      );
    }

    if (token && token.trim().length > 0) {
      const hash = this.hashToken(token);
      promises.push(
        this.redisService.set(`token:blacklist:token:${hash}`, '1', ttlSeconds),
      );
    }

    await Promise.all(promises);
    this.logger.debug(
      `Token blacklisted (jti: ${jti || 'none'}, ttl: ${ttlSeconds}s)`,
    );
  }

  /**
   * Record user-level logout timestamp in milliseconds.
   * Any token issued at or before this timestamp will be treated as revoked.
   */
  async revokeUserTokens(userId: string): Promise<void> {
    const nowMs = Date.now();
    // Retain logout timestamp for 7 days (matching max refresh token lifetime)
    const ttlSeconds = 7 * 24 * 60 * 60;

    await this.redisService.set(
      `user:logout:${userId}`,
      nowMs.toString(),
      ttlSeconds,
    );
    this.logger.debug(`User tokens revoked for user ${userId} at ${nowMs}ms`);
  }

  /**
   * Check whether a token has been revoked / blacklisted.
   */
  async isTokenBlacklisted(
    token?: string,
    jti?: string,
    iat?: number,
    userId?: string,
    iatMs?: number,
  ): Promise<boolean> {
    // 1. Check JTI blacklist
    if (jti) {
      const isJtiRevoked = await this.redisService.exists(
        `token:blacklist:jti:${jti}`,
      );
      if (isJtiRevoked) {
        return true;
      }
    }

    // 2. Check token hash blacklist
    if (token && token.trim().length > 0) {
      const hash = this.hashToken(token);
      const isTokenRevoked = await this.redisService.exists(
        `token:blacklist:token:${hash}`,
      );
      if (isTokenRevoked) {
        return true;
      }
    }

    // 3. Check user-level logout timestamp
    if (userId) {
      const logoutTimestampStr = await this.redisService.get(
        `user:logout:${userId}`,
      );
      if (logoutTimestampStr) {
        const logoutMs = parseInt(logoutTimestampStr, 10);
        const tokenTimeMs =
          iatMs ?? (typeof iat === 'number' ? iat * 1000 : null);
        if (tokenTimeMs && !isNaN(logoutMs) && tokenTimeMs <= logoutMs) {
          return true;
        }
      }
    }

    return false;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token.trim()).digest('hex');
  }
}
