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
import { AdminGuard } from '../common/guards/admin.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { MigrationService, MigrationOptions } from './migration.service';
import * as fs from 'fs';
import * as path from 'path';

interface UploadedMulterFile {
  originalname: string;
  size: number;
  buffer: Buffer;
}

const SQL_DUMP_EXTENSIONS = ['.sql', '.dump', '.txt'];
const MAX_DUMP_BYTES = 100 * 1024 * 1024; // 100MB

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('system/migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('status')
  async getStatus() {
    return this.migrationService.getDatabaseStatus();
  }

  @Post('validate')
  async validateDump(@Body() body: { customFilePath?: string }) {
    return this.migrationService.validateDumpFile(body.customFilePath);
  }

  @Post('execute')
  async executeMigration(@Body() options: MigrationOptions) {
    return this.migrationService.executeMigration(options);
  }

  @Get('verify')
  async runDeepVerification() {
    return this.migrationService.runDeepVerification();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DUMP_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!SQL_DUMP_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException('รองรับเฉพาะไฟล์ .sql / .dump / .txt'), false);
        }
        cb(null, true);
      },
    }),
  )
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
