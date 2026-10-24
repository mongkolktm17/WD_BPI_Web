import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Admin-only guard (backend counterpart of useRequireAdmin).
 * Admin = roleId 1, roleId 6 (Corporate Executive), username admin/itadmin,
 * admin role name, or explicit all/admin permission.
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
    const roleName = String(user.roleName || role?.roleName || role?.name || '');
    const roleId = Number(user.roleId ?? role?.id ?? 0);

    const isAdmin =
      perms.includes('all') ||
      perms.includes('admin') ||
      roleId === 1 ||
      roleId === 6 ||
      user.username === 'admin' ||
      user.username === 'itadmin' ||
      user.isExecutive === true ||
      roleName.toLowerCase().includes('admin') ||
      roleName.includes('ผู้ดูแลระบบ') ||
      roleName.includes('ผู้บริหาร');

    if (!isAdmin) {
      throw new ForbiddenException('ต้องเป็นผู้ดูแลระบบเท่านั้น');
    }
    return true;
  }
}
