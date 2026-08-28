import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'wdbpi_super_secret_jwt_key_2026',
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token ไม่ถูกต้อง');
    }
    return {
      id: payload.sub,
      username: payload.username,
      fullName: payload.fullName,
      roleId: payload.roleId,
      roleName: payload.roleName,
    };
  }
}
