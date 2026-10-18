import { Inject, Injectable } from '@nestjs/common';
import { ID, OrderService, Product, RequestContext, TransactionalConnection } from '@vendure/core';
import { QR_PAYMENT_PLUGIN_OPTIONS } from '../constants';
import { PluginInitOptions } from '../types';

@Injectable()
export class QrManualPaymentService {
    constructor(
        private connection: TransactionalConnection,
        @Inject(QR_PAYMENT_PLUGIN_OPTIONS)
        private options: PluginInitOptions,
        private orderService: OrderService

    ) { }

    async addQrPaymentProof(ctx: RequestContext, assetId: ID, orderCode: string) {
        try {
            const order = await this.connection.getRepository(ctx, 'Order').findOne({
                where: { code: orderCode },
                relations: ['customFields', 'customFields.qrPaymentProof'],
            })
            if (!order) {
                return {
                    success: false,
                    message: 'Order not found',
                }
            }
            const asset = await this.connection.getRepository(ctx, 'Asset').findOne({
                where: { id: assetId },
            })
            if (!asset) {
                return {
                    success: false,
                    message: 'Asset not found',
                }
            }
            const insert = await this.orderService.updateCustomFields(ctx, order.id, {
                qrPaymentProofId: asset.id,
            })
            if (insert) {
                return {
                    success: true,
                    message: 'QR payment proof added successfully',
                }
            }
            else {
                return {
                    success: false,
                    message: 'Failed to add QR payment proof',
                }
            }
        }
        catch (error: any) {
            return {
                success: false,
                message: 'An error occurred: ' + error.message,
            }

        }


    }
}
