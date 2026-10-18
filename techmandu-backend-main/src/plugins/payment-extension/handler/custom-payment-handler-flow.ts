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
import crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
/**
 * Args expected from Vendure admin:
 * - esewaInitiatorUrl: e.g. https://rc-epay.esewa.com.np/api/epay/main/v2/form
 * - esewaVerificationUrl: e.g. https://rc-epay.esewa.com.np/api/epay/transaction/status
 * - esewaMerchantId: your product_code / merchant id
 * - esewaInitiatorSecretKey: HMAC signing key
 * - successUrl: your backend callback that verifies & settles
 * - failureUrl: a "payment failed" page
 */
const customPaymentFlowHandler = new PaymentMethodHandler({
    code: 'custom-payment-flow-handler',
    description: [{ languageCode: LanguageCode.en, value: 'Custom Payment Handler' }],
    args: {
        // successUrl: { type: 'string' },
        // failureUrl: { type: 'string' },
    },

    /**
     * CREATE
     * Build the signed form fields for eSewa and return them.
     * Frontend should render an auto-submitting <form> POSTing to esewaInitiatorUrl.
     *
     * NOTE on amounts:
     * - Keep the same unit you use elsewhere (your Khalti handler passes `amount` as-is).
     * - eSewa expects `total_amount` and `amount` to match; you should pass the same value.
     */
    createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
        try {
            return {
                amount: metadata.amount,
                state: 'Settled',
                metadata: {
                    transactionId: metadata.transactionId,
                    paymentMethod: metadata.paymentMethod,
                    paymentVerified: metadata.paymentVerified,
                    paymentVerifiedTime: metadata.paymentVerifiedTime,
                },
            };
        } catch (err: any) {
            return {
                amount,
                state: 'Declined',
                metadata: {
                    method: 'esewa',
                    errorMessage: err?.message ?? 'Failed to initialize eSewa payment',
                },
            };
        }
    },

    /**
     * SETTLE
     * Verify the payment with eSewa. Expect { status: "COMPLETE" } on success.
     * The verification query mirrors your controller:
     *   GET {verificationUrl}?product_code=...&total_amount=...&transaction_uuid=...
     */
    settlePayment: async (
        ctx,
        order,
        payment,
        args,
    ): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
        try {
            const product_code = process.env.ESEWA_MERCHANT_ID_DEV as string;
            const transaction_uuid = payment.transactionId;
            const total_amount = payment.amount; // use the same unit you used in createPayment

            const url =
                `${process.env.ESEWA_INITIATOR_URL_DEV}?product_code=${encodeURIComponent(product_code)}` +
                `&total_amount=${encodeURIComponent(total_amount)}` +
                `&transaction_uuid=${encodeURIComponent(transaction_uuid)}`;

            const { data } = await axios.get(url);

            if (data?.status === 'COMPLETE') {
                return { success: true };
            } else {
                return {
                    success: false,
                    errorMessage: `Payment not complete (status=${data?.status ?? 'unknown'})`,
                };
            }
        } catch (err: any) {
            return { success: false, errorMessage: err?.message ?? 'eSewa verification error' };
        }
    },

    cancelPayment: async (): Promise<CancelPaymentResult | CancelPaymentErrorResult> => {
        return { success: false, errorMessage: 'Cancellation is not supported by eSewa.' };
    },
});

export { customPaymentFlowHandler };
