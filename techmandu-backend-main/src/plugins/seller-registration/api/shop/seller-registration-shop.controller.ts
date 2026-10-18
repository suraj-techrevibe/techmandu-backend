import { Controller, Post, Body, Res, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express'; 
import { Ctx, RequestContext, AssetService, ID } from '@vendure/core';
import { SellerRegistrationService } from '../../services/seller-registration.service';
import { Response } from 'express';
import { Readable } from 'stream'; 

@Controller('seller-registration')
export class SellerRegistrationShopController {
    constructor(
        private sellerRegistrationService: SellerRegistrationService,
        private assetService: AssetService,
    ) {}

    @Post('register')
    @UseInterceptors(AnyFilesInterceptor()) 
    async create(
        @Ctx() ctx: RequestContext,
        @Body() body: any, 
        @UploadedFiles() files: Array<any>, 
        @Res() res: Response,
    ) {

        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'POST,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');

        try {
            let panPhotoId: ID | undefined;
            const documentIds: ID[] = [];
            if (files && files.length > 0) {
                for (const file of files) {
                  console.log(`>>> [DEBUG] Processing file: ${file.originalname} (Field: ${file.fieldname})`);
                    const asset = await this.assetService.create(ctx, {
                       file: {
                            createReadStream: () => {
                                const readable = new Readable();
                                readable.push(file.buffer);
                                readable.push(null);
                                return readable;
                        
                    },
                            filename: file.originalname,
                            mimetype: file.mimetype,
                        } as any
                    });
                  
                    if ((asset as any).id) {
                        const assetId = (asset as any).id;
                        documentIds.push(assetId);
                        if (file.fieldname === 'panPhoto' || file.fieldname === 'file') {
                           panPhotoId = assetId;
                        }
                     
                    }
                }
            }
            const input = {
                businessName: body.businessName,
                panNo: body.panNo,
                businessRegistrationNo: body.businessRegistrationNo,
                address: body.address,
                ownerName: body.ownerName,
                phone: body.phone,
                email: body.email,
                panPhoto: panPhotoId ? { id: panPhotoId } : undefined,
                documents: documentIds.map(id => ({ id })),
            };

            const result = await this.sellerRegistrationService.create(ctx, input as any);
            
            return res.status(201).json(result);

        } catch (error: any) {
            console.error('Seller Registration REST Error:', error);
            return res.status(400).json({
                message: error.message || 'Error creating seller registration',
            });
        }
    }
}