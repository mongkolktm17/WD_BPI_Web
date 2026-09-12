import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const PERMISSIONS_KEY = 'require_permission';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Method-level metadata wins, falls back to controller-level.
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // Admin (id=1) and Corporate Executive (id=6) bypass all module checks
    if (user.roleId === 1 || user.roleId === 6 || user.role?.roleName?.includes('Admin') || user.role?.roleName?.includes('Corporate')) return true;

    const [moduleName, action] = requiredPermission.split(':');

    const permission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId: user.roleId,
        moduleName: {
          in: [moduleName, `${moduleName}.php`],
        },
      },
    });

    if (!permission) return false;

    switch (action) {
      case 'read': return permission.canRead;
      case 'write': return permission.canWrite;
      case 'delete': return permission.canDelete;
      default: return false;
    }
  }
}
