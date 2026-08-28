import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { MigrationService, MigrationOptions } from './migration.service';
import * as fs from 'fs';
import * as path from 'path';

interface UploadedMulterFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

@Controller('system/migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  async getStatus() {
    return this.migrationService.getDatabaseStatus();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('validate')
  async validateDump(@Body() body: { customFilePath?: string }) {
    return this.migrationService.validateDumpFile(body.customFilePath);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('execute')
  async executeMigration(@Body() options: MigrationOptions) {
    return this.migrationService.executeMigration(options);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('verify')
  async runDeepVerification() {
    return this.migrationService.runDeepVerification();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDumpFile(@UploadedFile() file?: UploadedMulterFile) {
    if (!file) {
      throw new BadRequestException('กรุณาเลือกไฟล์ SQL ที่ต้องการอัปโหลด');
    }

    const uploadDir = path.resolve(process.cwd(), 'tmp/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const targetPath = path.join(uploadDir, `uploaded_dump_${Date.now()}.sql`);
    fs.writeFileSync(targetPath, file.buffer);

    return {
      message: 'อัปโหลดไฟล์สำรองข้อมูลสำเร็จ',
      fileName: file.originalname,
      sizeBytes: file.size,
      filePath: targetPath,
    };
  }
}
