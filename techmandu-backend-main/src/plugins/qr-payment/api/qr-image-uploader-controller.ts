import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetService, Ctx, RequestContext,OrderService } from '@vendure/core';
import { Readable } from 'stream';
import type { Express } from 'express';

@Controller('qr-payment')
export class QrImageUploaderController {
  constructor(
    private readonly assetService: AssetService,
    private orderService: OrderService
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadQrImage(
    @UploadedFile() file: Express.Multer.File,
    @Ctx() ctx: RequestContext,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const asset = await this.assetService
      .create(ctx, {
        file: {
          createReadStream: () => {
            const stream = new Readable();
            stream.push(file.buffer);
            stream.push(null);
            return stream;
          },
          filename: file.originalname,
          mimetype: file.mimetype,
        },
        customFields:{
            isQrPaymentProofImage:true
        }
      })
      .then(a => {
        if ((a as any).message && (a as any).name === 'MimeTypeError') {
          throw new BadRequestException(
            `Asset creation failed: ${(a as any).message}`,
          );
        }
        return a;
      });

    return asset
  }
}
