import {
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
  Res,
  Req,
} from "@nestjs/common";
import {
  RequestContextService,
  TransactionalConnection,
  AssetService,
  ID,
  MimeTypeError,
  Asset,
  SessionService,
  // UnauthorizedError,
  Customer,
} from "@vendure/core";
import { FilesInterceptor } from "@nestjs/platform-express";
import { Readable } from "stream";
import { Response } from "express";

@Controller("dp")
export class dpUploadController {
  constructor(
    private connection: TransactionalConnection,
    private ctxService: RequestContextService,
    private assetService: AssetService,
    private sessionService: SessionService,
  ) {}

  @Post("upload/:id")
  @UseInterceptors(FilesInterceptor("files"))
  async uploadFile(
    @UploadedFiles()
    files: any,
    @Param("id") id: ID,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      //@ts-ignore
      // const vendureToken = req.headers["vendure-auth-token"];
      //
      // console.log("vendureToken", vendureToken);
      //
      // const user = await this.sessionService.getSessionFromToken(vendureToken);
      //
      // console.log("user", user);
      //
      // if (!user) {
      //   throw new UnauthorizedError();
      // }

      const ctx = await this.ctxService.create({ apiType: "shop" });

      const customerRepo = this.connection.getRepository(ctx, Customer);
      const customer = await customerRepo.findOne({
        where: { id },
      });

      if (!customer) throw new NotFoundException("No such review found");
      if (!files || Object.keys(files).length === 0)
        throw new NotFoundException("No files uploaded");

      const uploadAsset = async (file: any) => {
        const asset = await this.assetService.create(ctx, {
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
        });

        if (asset instanceof MimeTypeError) {
          throw new HttpException(
            {
              status: false,
              message: `Asset creation failed: ${asset.message}`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        return asset as Asset;
      };

      for (const file of files) {
        const asset = await uploadAsset(file);
        customer.customFields.avatarUrl = asset;
        await customerRepo.save(customer);
      }

      return res.status(HttpStatus.OK).json({
        status: true,
        message: "Profile picture succecssfully uploaded.",
        customeId: customer.id,
        customerDetails: customer,
      });
    } catch (error) {
      Logger.error("Error uploading profile picture:", error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: false,
        message:
          "An unexpected error occurred while uploading profile picture.",
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}
