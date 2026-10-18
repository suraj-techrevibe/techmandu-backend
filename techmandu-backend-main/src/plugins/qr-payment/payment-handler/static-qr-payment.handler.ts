import {
  CancelPaymentResult,
  CancelPaymentErrorResult,
  CreatePaymentResult,
  PaymentMethodHandler,
  SettlePaymentResult,
  SettlePaymentErrorResult,
  LanguageCode,
  Injector,
  GlobalSettingsService,
  TransactionalConnection,
  GlobalSettings,
} from '@vendure/core';

let globalSettingsService: GlobalSettingsService;
let connection: TransactionalConnection
export const qrPaymentHandler = new PaymentMethodHandler({
  code: 'qr-payment-method',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'Static QR Payment',
    },
  ],
  args: {
    // qrImageUrl: {
    //   type: 'string',
    //   label: [
    //     {
    //       languageCode: LanguageCode.en,
    //       value: 'QR Image URL',
    //     },
    //   ],
    //   description: [
    //     {
    //       languageCode: LanguageCode.en,
    //       value: 'Public URL of the static QR image to show to the customer.',
    //     },
    //   ],
    // },
  },
  init: (injector: Injector) => {
        globalSettingsService = injector.get(GlobalSettingsService)
        connection = injector.get(TransactionalConnection)
    },
  // Just return the static QR image info, no external calls
  createPayment: async (
    ctx,
    order,
    amount,
    args,
    metadata
  ): Promise<CreatePaymentResult> => {
    const globalSettingsConfig = await globalSettingsService.getSettings(ctx);
    const globalSettings = await connection.getRepository(ctx, GlobalSettings).findOne({
      where:{
        id:globalSettingsConfig.id
      },
      relations:['customFields','customFields.manualPaymentQrImage']
    })
    if(!globalSettings?.customFields.manualPaymentQrImage){
      throw new Error("Manual Payment QR Image is not configured")
    }
    else{
    const backendUrl = process.env.SERVER_URL?.replace(/\/$/, '');
    console.log(`${backendUrl}/assets/${globalSettings.customFields.manualPaymentQrImage.source}`)
    return {
      amount,
      state: 'Authorized' as const, 
      transactionId: order.code,
      metadata: {
        public: {
          staticQrImageUrl: `${backendUrl}/assets/${globalSettings.customFields.manualPaymentQrImage.source}`,
          orderCode: order.code
        },
      },
    };
    }
  },

  settlePayment: async (
    ctx,
    order,
    payment,
    args
  ): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    return { success: true };
  },

  cancelPayment: async (
    ctx,
    order,
    payment,
    args
  ): Promise<CancelPaymentResult | CancelPaymentErrorResult> => {
    return { success: true };
  },
});
