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

    const MODULE_ALIASES: Record<string, string[]> = {
      nvr_recording: ['nvr_recording', 'nvr_recording_days', 'nvr_recording.php', 'nvr_recording_days.php'],
      nvr_recording_days: ['nvr_recording', 'nvr_recording_days', 'nvr_recording.php', 'nvr_recording_days.php'],
      cctv_inspection: ['cctv_inspection', 'cctv_inspection_form', 'cctv_inspection.php', 'cctv_inspection_form.php'],
      cctv_inspection_form: ['cctv_inspection', 'cctv_inspection_form', 'cctv_inspection.php', 'cctv_inspection_form.php'],
      cctv_angle_check: ['cctv_angle_check', 'cctv_angle_check.php', 'save_angle_check', 'save_angle_check.php', 'edit_cctv_angle'],
      cctv_report: ['cctv_report', 'cctv_report.php', 'save_cctv_report', 'save_cctv_report.php'],
      patrol_checklist: ['patrol_checklist', 'check_list_patrol_new', 'check_list_patrol_new.php', 'check_list_patrol', 'check_list_patrol.php'],
      patrol: ['patrol', 'check_list_patrol_new', 'check_list_patrol_new.php', 'check_list_patrol'],
      handheld_detector: ['handheld_detector', 'check_hand_held', 'check_hand_held.php', 'get_handheld_status', 'metal_detector'],
      metal_detector: ['metal_detector', 'check_hand_held', 'check_hand_held.php', 'walkthrough_metal_detector', 'walkthrough_metal_detector.php'],
      walkthrough_detector: ['walkthrough_detector', 'walkthrough_metal_detector', 'walkthrough_metal_detector.php'],
      guard_duty_log: ['guard_duty_log', 'guard_duty_log.php', 'edit_guard_count'],
      car_parking: ['car_parking', 'car_parking.php', 'edit_car_parking', 'edit_car_parking.php'],
      select_building: ['select_building', 'select_building.php', 'report_building', 'report_building.php'],
      report_page: ['report_page', 'report_page.php', 'report', 'report.php'],
    };

    const targetModules = MODULE_ALIASES[moduleName] || [moduleName, `${moduleName}.php`];

    const permission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId: user.roleId,
        moduleName: {
          in: targetModules,
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
