import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { put } from '@vercel/blob';
import { Request } from 'express';
import { mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getUploadsRoot } from '../../common/uploads-path';
import { FirebaseService } from '../firebase/firebase.service';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_BYTES = 8 * 1024 * 1024;

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly dir = join(getUploadsRoot(), 'vehicles');
  private readonly avatarDir = join(getUploadsRoot(), 'avatars');

  constructor(private readonly firebase: FirebaseService) {
    mkdirSync(this.dir, { recursive: true });
    mkdirSync(this.avatarDir, { recursive: true });
  }

  async saveAvatar(file: Express.Multer.File, req: Request) {
    const { ext, buffer } = this.validateFile(file);
    const filename = `${uuidv4()}${ext}`;
    const url = await this.persist('avatars', filename, buffer, ext, req);
    return { url };
  }

  async saveVehicleImages(files: Express.Multer.File[], req: Request) {
    if (!files?.length) {
      throw new BadRequestException('اختر صورة واحدة على الأقل');
    }

    const urls: string[] = [];
    for (const file of files) {
      const { ext, buffer } = this.validateFile(file);
      const filename = `${uuidv4()}${ext}`;
      urls.push(await this.persist('vehicles', filename, buffer, ext, req));
    }

    return { urls };
  }

  private validateFile(file: Express.Multer.File) {
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
    return { ext, buffer: file.buffer };
  }

  /** Vercel Blob → Firebase → قرص محلي */
  private async persist(
    folder: 'vehicles' | 'avatars',
    filename: string,
    buffer: Buffer,
    ext: string,
    req: Request,
  ): Promise<string> {
    const blobUrl = await this.uploadToVercelBlob(folder, filename, buffer, ext);
    if (blobUrl) return blobUrl;

    if (this.firebase.isReady) {
      try {
        const cloudUrl = await this.firebase.uploadPublicFile(
          folder,
          filename,
          buffer,
          MIME[ext] ?? 'application/octet-stream',
        );
        if (cloudUrl) {
          this.logger.log(`Uploaded to Firebase Storage: ${folder}/${filename}`);
          return cloudUrl;
        }
      } catch (err) {
        this.logger.error(`Firebase upload failed: ${(err as Error).message}`);
      }
    }

    const localDir = folder === 'avatars' ? this.avatarDir : this.dir;
    writeFileSync(join(localDir, filename), buffer);
    return this.buildLocalUrl(req, folder, filename);
  }

  private async uploadToVercelBlob(
    folder: 'vehicles' | 'avatars',
    filename: string,
    buffer: Buffer,
    ext: string,
  ): Promise<string | null> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return null;

    try {
      const pathname = `uploads/${folder}/${filename}`;
      const blob = await put(pathname, buffer, {
        access: 'public',
        contentType: MIME[ext] ?? 'application/octet-stream',
        token,
      });
      this.logger.log(`Uploaded to Vercel Blob: ${pathname}`);
      return blob.url;
    } catch (err) {
      this.logger.error(`Vercel Blob upload failed: ${(err as Error).message}`);
      return null;
    }
  }

  private buildLocalUrl(req: Request, folder: string, filename: string): string {
    const host = req.get('host') ?? `localhost:${process.env.PORT ?? 3000}`;
    const protocol = req.protocol ?? 'http';
    return `${protocol}://${host}/uploads/${folder}/${filename}`;
  }
}
