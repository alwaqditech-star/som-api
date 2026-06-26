import { BadRequestException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getUploadsRoot } from '../../common/uploads-path';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_BYTES = 8 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly dir = join(getUploadsRoot(), 'vehicles');
  private readonly avatarDir = join(getUploadsRoot(), 'avatars');

  constructor() {
    mkdirSync(this.dir, { recursive: true });
    mkdirSync(this.avatarDir, { recursive: true });
  }

  saveAvatar(file: Express.Multer.File, req: Request) {
    if (!file) {
      throw new BadRequestException('اختر صورة');
    }
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) {
      throw new BadRequestException('نوع الصورة غير مدعوم — استخدم JPG أو PNG أو WEBP');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('حجم الصورة كبير جداً (الحد 8 ميجابايت)');
    }

    const filename = `${uuidv4()}${ext}`;
    writeFileSync(join(this.avatarDir, filename), file.buffer);
    const host = req.get('host') ?? `localhost:${process.env.PORT ?? 3000}`;
    const protocol = req.protocol ?? 'http';
    return { url: `${protocol}://${host}/uploads/avatars/${filename}` };
  }

  saveVehicleImages(files: Express.Multer.File[], req: Request) {
    if (!files?.length) {
      throw new BadRequestException('اختر صورة واحدة على الأقل');
    }

    const urls: string[] = [];

    for (const file of files) {
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED.has(ext)) {
        throw new BadRequestException('نوع الصورة غير مدعوم — استخدم JPG أو PNG أو WEBP');
      }
      if (file.size > MAX_BYTES) {
        throw new BadRequestException('حجم الصورة كبير جداً (الحد 8 ميجابايت)');
      }

      const filename = `${uuidv4()}${ext}`;
      writeFileSync(join(this.dir, filename), file.buffer);

      urls.push(this.buildPublicUrl(req, filename));
    }

    return { urls };
  }

  private buildPublicUrl(req: Request, filename: string): string {
    const host = req.get('host') ?? `localhost:${process.env.PORT ?? 3000}`;
    const protocol = req.protocol ?? 'http';
    return `${protocol}://${host}/uploads/vehicles/${filename}`;
  }
}
