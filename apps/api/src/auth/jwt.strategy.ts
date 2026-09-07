import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required (no default allowed in production)');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token ไม่ถูกต้อง');
    }
    // Re-check account status on every request so disabled/deleted
    // accounts lose access immediately instead of lingering until expiry.
    const user = await this.prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('บัญชีถูกระงับหรือไม่พบผู้ใช้');
    }
    return {
      id: payload.sub,
      username: payload.username,
      fullName: payload.fullName,
      employeeId: payload.employeeId ?? null,
      roleId: payload.roleId,
      roleName: payload.roleName,
    };
  }
}
