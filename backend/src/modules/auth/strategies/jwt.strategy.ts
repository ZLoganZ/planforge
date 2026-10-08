import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { TokenBlacklistService } from '../token-blacklist.service.js';

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
  iat?: number;
  iatMs?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    const secretOrKey = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => req?.cookies?.['access_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const rawToken =
      ExtractJwt.fromAuthHeaderAsBearerToken()(req) ||
      req?.cookies?.['access_token'];

    const isRevoked = await this.tokenBlacklistService.isTokenBlacklisted(
      rawToken || undefined,
      payload.jti,
      payload.iat,
      payload.sub,
      payload.iatMs,
    );

    if (isRevoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      email: payload.email,
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
