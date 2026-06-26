import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('vehicle-images')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'رفع صور سيارة من الجهاز' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 12, {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024, files: 12 },
    }),
  )
  uploadVehicleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    return this.uploadsService.saveVehicleImages(files, req);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'رفع صورة الملف الشخصي' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    }),
  )
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.uploadsService.saveAvatar(file, req);
  }
}
