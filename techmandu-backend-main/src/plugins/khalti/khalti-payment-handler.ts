import {
  CancelPaymentResult,
  CancelPaymentErrorResult,
  CreatePaymentResult,
  PaymentMethodHandler,
  SettlePaymentResult,
  SettlePaymentErrorResult,
  VendureConfig,
  LanguageCode,
} from "@vendure/core";
import axios from "axios";

const khaltiPaymentHandler = new PaymentMethodHandler({
  code: "khalti-payment-method",
  description: [
    {
      languageCode: LanguageCode.en,
      value: "Khalti Payment Provider",
    },
  ],
  args: {
    secretKey: {
       type: "string",
       },
  },

  createPayment: async (
    ctx,
    order,
    amount,
    args,
    metadata
  ): Promise<CreatePaymentResult> => {
    try {
      const { data } = await axios.post(
        "https://khalti.com/api/v2/epayment/initiate/",
        {
          return_url: `https://techmandu.hyperce.io/payment/callback`,
          website_url: "https://staging.ordernow.com.np",
          amount: amount,
          purchase_order_id: order.code,
          purchase_order_name: `Order #${order.id}`,
          customer_info: {
            name: `${order.customer?.firstName} ${order.customer?.lastName}` || "Techmandu customer",
            email: order.customer?.emailAddress || "customer@example.com",
            phone: order.customer?.phoneNumber || "9800000000",
          },
          product_details: [
            ...order.lines.map((line) => ({
              identity: line.productVariant.sku || line.productVariant.id,
              name: line.productVariant.translations[0].name,
              total_price: line.listPrice,
              quantity: line.quantity,
              unit_price: line.listPrice / line.quantity,
            })),
            ...(order.shipping > 0
              ? [
                  {
                    identity: "shipping",
                    name: "Shipping Cost",
                    total_price: order.shipping,
                    quantity: 1,
                    unit_price: order.shipping,
                  },
                ]
              : []),
          ],
          merchant_username: "techmandu_merchant",
        },
        {
          headers: {
            Authorization: `key ${args.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(data);

      return {
        amount,
        state: "Authorized" as const,
        transactionId: data.pidx,
        metadata: {
          public: {
            paymentUrl: data.payment_url,
          },
        },
      };
    } catch (err: any) {
      console.log(err);
      return {
        amount,
        state: "Declined" as const,
        metadata: {
          errorMessage: err.message,
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
    try {
      const response = await axios.post(
        "https://khalti.com/api/v2/epayment/lookup/",
        {
          pidx: payment.transactionId,
        },
        {
          headers: {
            Authorization: `key ${args.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.status === "Completed") {
        return { success: true };
      } else {
        return {
          success: false,
          errorMessage: "Payment settlement failed",
        };
      }
    } catch (err: any) {
      console.log(err);
      return {
        success: false,
        errorMessage: err.message,
      };
    }
  },

  cancelPayment: async (
    ctx,
    order,
    payment,
    args
  ): Promise<CancelPaymentResult | CancelPaymentErrorResult> => {
    try {
      const response = await axios.post(
        "https://khalti.com/api/v2/epayment/cancel/",
        {
          id: payment.transactionId,
        },
        {
          headers: {
            Authorization: `key ${args.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        return { success: true };
      } else {
        return {
          success: false,
          errorMessage: "Payment cancellation failed",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        errorMessage: err.message,
      };
    }
  },
});

export { khaltiPaymentHandler };
