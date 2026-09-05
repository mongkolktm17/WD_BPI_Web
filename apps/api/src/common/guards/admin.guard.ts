import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Admin-only guard (backend counterpart of useRequireAdmin).
 * Admin = roleId 1, admin role name, or explicit all/admin permission.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const perms: string[] = [];
    const collect = (p: any) => {
      if (typeof p === 'string') perms.push(p);
      else if (p?.moduleName) perms.push(p.moduleName);
      else if (p?.name) perms.push(p.name);
    };
    (user.role?.permissions || []).forEach(collect);
    (user.permissions || []).forEach(collect);

    const role = user.role;
    const isAdmin =
      perms.includes('all') ||
      perms.includes('admin') ||
      user.roleId === 1 ||
      role?.id === 1 ||
      user.roleName === 'admin' ||
      user.roleName === 'ผู้ดูแลระบบ' ||
      role?.roleName === 'admin' ||
      role?.name === 'admin' ||
      role?.roleName === 'ผู้ดูแลระบบ' ||
      role?.name === 'ผู้ดูแลระบบ';

    if (!isAdmin) {
      throw new ForbiddenException('ต้องเป็นผู้ดูแลระบบเท่านั้น');
    }
    return true;
  }
}
