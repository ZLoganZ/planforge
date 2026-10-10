import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RedisService } from '../../database/redis/redis.service.js';
import { TokenBlacklistService } from './token-blacklist.service.js';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let redisService: RedisService;
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    redisService = {
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      get: vi.fn(async (key: string) => store.get(key) || null),
      exists: vi.fn(async (key: string) => store.has(key)),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    } as unknown as RedisService;

    service = new TokenBlacklistService(redisService);
  });

  it('should blacklist token by JTI and token hash', async () => {
    const rawToken = 'sample-jwt-token-string';
    const jti = 'uuid-jti-123';
    const futureExp = Math.floor(Date.now() / 1000) + 900;

    await service.blacklistToken(rawToken, futureExp, jti);

    expect(redisService.set).toHaveBeenCalledWith(
      `token:blacklist:jti:${jti}`,
      '1',
      expect.any(Number),
    );

    const isRevokedByJti = await service.isTokenBlacklisted(
      undefined,
      jti,
      undefined,
      undefined,
    );
    expect(isRevokedByJti).toBe(true);

    const isRevokedByToken = await service.isTokenBlacklisted(
      rawToken,
      undefined,
      undefined,
      undefined,
    );
    expect(isRevokedByToken).toBe(true);
  });

  it('should return false for unrevoked tokens', async () => {
    const isRevoked = await service.isTokenBlacklisted(
      'some-fresh-token',
      'fresh-jti',
      Math.floor(Date.now() / 1000),
      'user-1',
    );
    expect(isRevoked).toBe(false);
  });

  it('should revoke all tokens issued before user logout timestamp', async () => {
    const userId = 'user-123';
    const pastIat = Math.floor(Date.now() / 1000) - 100;

    await service.revokeUserTokens(userId);

    const isRevoked = await service.isTokenBlacklisted(
      undefined,
      undefined,
      pastIat,
      userId,
    );
    expect(isRevoked).toBe(true);
  });
});
