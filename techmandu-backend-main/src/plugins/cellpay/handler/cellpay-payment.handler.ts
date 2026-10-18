import {
  PaymentMethodHandler,
  CreatePaymentResult,
  SettlePaymentResult,
  SettlePaymentErrorResult,
  CancelPaymentResult,
  CancelPaymentErrorResult,
  LanguageCode,
} from "@vendure/core";
import axios from "axios";
import {
  signPayload,
  generateAESKey,
  encryptAES,
  encryptRSA,
} from "../misc/cellpay-crypto";

export const cellpayPaymentHandler = new PaymentMethodHandler({
  code: "cellpay-wallet",
  description: [
    {
      languageCode: LanguageCode.en,
      value: "CellPay Wallet Payment",
    },
  ],

  /** args intentionally EMPTY */
  args: {},

  createPayment: async (
    ctx,
    order,
    amount
  ): Promise<CreatePaymentResult> => {
    try {
      const channel = ctx.channel;
      const {
        cellpayBaseUrl,
        cellpayUsername,
        cellpayPassword,
        cellpayClientId,
        cellpayMemberId,
        cellpayProductCode,
        cellpayPublicKey,
        cellpayPrivateKey,
      } = channel.customFields;

      /** STEP 1: Login */
      const loginRes = await axios.post(
        `${cellpayBaseUrl}/sdk/login`,
        {
          username: cellpayUsername,
          password: cellpayPassword,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = loginRes.data.accessClient;

      /** STEP 2: Unique token */
      const uniqueToken = `${order.code}-${Date.now()}`.slice(0, 20);

      /** STEP 3: Payload */
      const payload = {
        amount: (amount / 100).toFixed(2),
        description: `Order #${order.code}`,
        redirectUrl: `https://your-domain.com/payment/callback`,
        uniqueToken,
        memberId: cellpayMemberId,
        productCode: cellpayProductCode,
      };

      const payloadString = JSON.stringify(payload);

      /** STEP 4: Encrypt & Sign */
      const aesKey = generateAESKey();
      const encryptedData = encryptAES(payloadString, aesKey);
      const encryptedKey = encryptRSA(aesKey, cellpayPublicKey as string);
      const signature = signPayload(cellpayPrivateKey as string, payloadString);

      /** STEP 5: Payment request */
      await axios.post(
        `${cellpayBaseUrl}/sdk/paymentRequest`,
        {
          signature,
          secret_key: encryptedKey,
          data: encryptedData,
          client_id: cellpayClientId,
        },
        {
          headers: {
            Token: token,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        amount,
        state: "Authorized",
        transactionId: uniqueToken,
        metadata: {
          public: {
            provider: "cellpay",
            uniqueToken,
          },
        },
      };
    } catch (err: any) {
      return {
        amount,
        state: "Declined",
        metadata: {
          errorMessage: err.message ?? "CellPay initiation failed",
        },
      };
    }
  },

  settlePayment: async (
    ctx,
    order,
    payment
  ): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    try {
      const channel = ctx.channel;
      const {
        cellpayBaseUrl,
        cellpayUsername,
        cellpayPassword,
      } = channel.customFields;

      /** Login */
      const loginRes = await axios.post(`${cellpayBaseUrl}/sdk/login`, {
        username: cellpayUsername,
        password: cellpayPassword,
      });

      const token = loginRes.data.accessClient;

      /** Status check */
      const statusRes = await axios.get(
        `${cellpayBaseUrl}/sdk/transactions/${payment.transactionId}/status`,
        {
          headers: { Token: token },
        }
      );

      if (statusRes.data.transactionStatus === "PAID") {
        return { success: true };
      }

      return {
        success: false,
        errorMessage: `CellPay status: ${statusRes.data.transactionStatus}`,
      };
    } catch (err: any) {
      return {
        success: false,
        errorMessage: err.message ?? "CellPay settlement failed",
      };
    }
  },

  cancelPayment: async (): Promise<
    CancelPaymentResult | CancelPaymentErrorResult
  > => {
    return {
      success: false,
      errorMessage: "CellPay does not support payment cancellation",
    };
  },
});
