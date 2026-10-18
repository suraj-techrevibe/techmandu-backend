import {
    CancelPaymentResult,
    CancelPaymentErrorResult,
    CreatePaymentResult,
    PaymentMethodHandler,
    SettlePaymentResult,
    SettlePaymentErrorResult,
    LanguageCode,
} from '@vendure/core';
import axios from 'axios';

const khaltiPaymentHandlerProd = new PaymentMethodHandler({
    code: 'khalti-payment-method-prod',
    description: [{ languageCode: LanguageCode.en, value: 'Khalti Payment Provider Prod' }],
    args: {
        returnUrl: {
            type: 'string',
        },
        websiteUrl: {
            type: 'string',
        },
    },

    createPayment: async (ctx, order, amount, args): Promise<CreatePaymentResult> => {
        try {
            // Pull everything from env
            const initiatorUrl =
                process.env.KHALTI_INITIATOR_URL_PROD || 'https://khalti.com/api/v2/epayment/initiate/';
            const khaltiSecret =
                process.env.KHALTI_SECRET_KEY_PROD || process.env.KHALTI_SECRET_KEY_DEV || '';
            const websiteUrl = args.websiteUrl;
            const returnUrl = args.returnUrl;

            const { data } = await axios.post(
                initiatorUrl.endsWith('/') ? initiatorUrl : `${initiatorUrl}/`,
                {
                    return_url: returnUrl,
                    website_url: websiteUrl,
                    amount: amount, // keep the same unit you use across your store
                    purchase_order_id: order.code,
                    purchase_order_name: `Order #${order.id}`,
                    customer_info: {
                        name: order.customer?.firstName || 'Sastodeal customer',
                        email: order.customer?.emailAddress || 'customer@example.com',
                        phone: order.customer?.phoneNumber || '9800000000',
                    },
                    product_details: [
                        ...order.lines.map(line => ({
                            identity: line.productVariant.sku || line.productVariant.id,
                            name: line.productVariant.translations[0].name,
                            total_price: line.listPrice,
                            quantity: line.quantity,
                            unit_price: line.listPrice / line.quantity,
                        })),
                        ...(order.shipping > 0
                            ? [
                                  {
                                      identity: 'shipping',
                                      name: 'Shipping Cost',
                                      total_price: order.shipping,
                                      quantity: 1,
                                      unit_price: order.shipping,
                                  },
                              ]
                            : []),
                    ],
                    // Optional merchant fields — keep if you use them; otherwise remove
                    merchant_username: process.env.KHALTI_MERCHANT_USERNAME || 'MERCHANT_USERNAME',
                    merchant_extra: process.env.KHALTI_MERCHANT_ID || 'MERCHANT_ID',
                },
                {
                    headers: {
                        Authorization: `Key ${khaltiSecret}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return {
                amount,
                state: 'Authorized',
                transactionId: data.pidx,
                metadata: {
                    method: 'khalti',
                    public: {
                        paymentUrl: data.payment_url,
                    },
                },
            };
        } catch (err: any) {
            console.log(err);
            return {
                amount,
                state: 'Declined',
                metadata: {
                    method: 'khalti',
                    errorMessage: err.message ?? 'Failed to initialize Khalti payment',
                },
            };
        }
    },

    settlePayment: async (ctx, order, payment): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
        try {
            const verifierUrl =
                process.env.KHALTI_VERIFIER_URL_PROD || 'https://khalti.com/api/v2/epayment/lookup/';
            const khaltiSecret =
                process.env.KHALTI_SECRET_KEY_PROD || process.env.KHALTI_SECRET_KEY_DEV || '';

            const { data } = await axios.post(
                verifierUrl.endsWith('/') ? verifierUrl : `${verifierUrl}/`,
                { pidx: payment.transactionId },
                {
                    headers: {
                        Authorization: `Key ${khaltiSecret}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (data.status === 'Completed') {
                return { success: true };
            } else {
                return { success: false, errorMessage: 'Payment settlement failed' };
            }
        } catch (err: any) {
            console.log(err);
            return { success: false, errorMessage: err.message ?? 'Khalti verification error' };
        }
    },

    cancelPayment: async (): Promise<CancelPaymentResult | CancelPaymentErrorResult> => {
        try {
            const cancelUrl =
                process.env.KHALTI_CANCEL_URL_PROD || 'https://khalti.com/api/v2/epayment/cancel/';
            const khaltiSecret =
                process.env.KHALTI_SECRET_KEY_PROD || process.env.KHALTI_SECRET_KEY_DEV || '';

            const { data } = await axios.post(
                cancelUrl.endsWith('/') ? cancelUrl : `${cancelUrl}/`,
                { id: '' }, // Khalti expects an identifier; use payment.transactionId (pidx) if applicable
                {
                    headers: {
                        Authorization: `Key ${khaltiSecret}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            if (data?.success) {
                return { success: true };
            } else {
                return { success: false, errorMessage: 'Payment cancellation failed' };
            }
        } catch (err: any) {
            return { success: false, errorMessage: err.message ?? 'Khalti cancellation error' };
        }
    },
});

export { khaltiPaymentHandlerProd };
