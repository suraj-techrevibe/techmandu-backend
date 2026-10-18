import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { Allow, Ctx, RequestContext, Transaction } from '@vendure/core';
import { QrManualPaymentService } from '../services/qr-manual-payment.service';

@Resolver()
export class QrManualPaymentShopResolver {
    constructor(private qrManualPaymentService: QrManualPaymentService) {}

    @Mutation()
    @Transaction()
    async addQrPaymentProof(@Ctx() ctx: RequestContext, @Args() args: { assetId: ID; orderCode: string }) {
        return this.qrManualPaymentService.addQrPaymentProof(ctx, args.assetId, args.orderCode);
    }
}
