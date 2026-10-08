import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { JwtStrategy } from './jwt.strategy.js';
import { TokenBlacklistService } from '../token-blacklist.service.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let tokenBlacklistService: TokenBlacklistService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      getOrThrow: vi.fn().mockReturnValue('test-access-secret'),
    } as unknown as ConfigService;

    tokenBlacklistService = {
      isTokenBlacklisted: vi.fn(),
    } as unknown as TokenBlacklistService;

    strategy = new JwtStrategy(configService, tokenBlacklistService);
  });

  it('should validate successfully when token is not blacklisted', async () => {
    vi.mocked(tokenBlacklistService.isTokenBlacklisted).mockResolvedValue(false);

    const mockReq = {
      headers: {
        authorization: 'Bearer valid.jwt.token',
      },
    } as any;

    const payload = {
      sub: 'user-123',
      email: 'user@example.com',
      jti: 'jti-abc',
      iat: 1000,
      exp: 2000,
    };

    const result = await strategy.validate(mockReq, payload);
    expect(result).toEqual({
      id: 'user-123',
      email: 'user@example.com',
      jti: 'jti-abc',
      iat: 1000,
      exp: 2000,
    });
  });

  it('should throw UnauthorizedException when token is blacklisted', async () => {
    vi.mocked(tokenBlacklistService.isTokenBlacklisted).mockResolvedValue(true);

    const mockReq = {
      headers: {
        authorization: 'Bearer revoked.jwt.token',
      },
    } as any;

    const payload = {
      sub: 'user-123',
      email: 'user@example.com',
      jti: 'jti-revoked',
      iat: 1000,
      exp: 2000,
    };

    await expect(strategy.validate(mockReq, payload)).rejects.toThrow(
      new UnauthorizedException('Token has been revoked'),
    );
  });
});
