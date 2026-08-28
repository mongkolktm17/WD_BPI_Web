import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../guards/permission.guard';

export const RequirePermission = (permission: string) => SetMetadata(PERMISSIONS_KEY, permission);
