import { Controller, Get, Query, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
    Channel,
    Ctx,
    ID,
    Order,
    OrderService,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
} from '@vendure/core';
import { Request } from 'express';
import axios from 'axios';
import { PaymentGatewayTransactions } from '../payment-extension/entities/payment-gateway-transactions.entity';

type KhaltiSuccessQuery = {
    pidx: string;
    transaction_id?: string; // sometimes present
    tidx?: string; // sometimes present (aka tIdx)
    txnId?: string; // sometimes present
    amount?: string;
    total_amount?: string;
    mobile?: string;
    status?: string; // e.g. "Completed"
    purchase_order_id?: string;
    purchase_order_name?: string;
    merchant_username?: string;
    merchant_extra?: string;
    [k: string]: any;
};

@Controller('api/khalti')
export class KhaltiController {
    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private reqService: RequestContextService,
    ) {}

    @Get('create')
    async create(
        @Query('orderCode') orderCode: string,
        @Query('channelToken') channelToken: string,
        @Req() req: Request,
    ): Promise<{ success: boolean; message: string; paymentUrl: string | null; orderId?: string | null }> {
        if (!orderCode) {
            return { success: false, message: 'Invalid Order code', paymentUrl: null };
        }
        const ctx = await this.reqService.create({
            apiType: 'shop',
            channelOrToken: channelToken,
        });
        const channel = await this.connection.getRepository(ctx, Channel).findOne({
            where: {
                token: channelToken,
            },
        });
        if (!channel) {
            return {
                success: false,
                message: 'Inavlid channel Token - No such channel found ',
                paymentUrl: null,
            };
        }
        if (!channel.customFields.isKhaltiEnabled) {
            return {
                success: false,
                message: 'Khalti Payment Gateway is not enabled for this channel',
                paymentUrl: null,
            };
        }

        const order = await this.connection.getRepository(ctx, Order).findOne({
            where: { code: orderCode },
            relations: [
                'lines',
                'lines.productVariant',
                'lines.productVariant.translations',
                'customer',
                'shippingLines',
            ],
        });

        if (!order) {
            return { success: false, message: 'Invalid Order code - Order not found', paymentUrl: null };
        }

        if (order.state !== 'ArrangingPayment') {
            return {
                success: false,
                message: `Invalid order - Payment cannot be created for order in state: ${order.state}`,
                paymentUrl: null,
            };
        }

        let initiatorUrl, khaltiSecret;

        if (process.env.PAYMENT_ENV == 'dev') {
            initiatorUrl = process.env.KHALTI_INITIATOR_URL_DEV as string;
            khaltiSecret = process.env.KHALTI_SECRET_KEY_DEV as string;
        } else {
            initiatorUrl = process.env.KHALTI_INITIATOR_URL_PROD as string;
            khaltiSecret = channel.customFields.khaltiToken;
        }

        if (!khaltiSecret) {
            return {
                success: false,
                message: 'Khalti secret key not configured',
                paymentUrl: null,
            };
        }
        console.log(khaltiSecret);

        // Optional but recommended: set your site + return URLs
        const websiteUrl = 'https://hyperce.com';

        const returnUrl = `${process.env.VENDURE_API_HOST}:${process.env.PORT}/api/khalti/webhook/success`;

        // Amount: keep whatever unit you use consistently across your store
        // Vendure's Order typically tracks totals in smallest currency unit (e.g., cents/paise)
        const amount = order.totalWithTax;

        // Build product details (fallbacks to avoid undefined)
        const product_details = [
            ...order.lines.map(line => ({
                identity: line.productVariant?.sku || String(line.productVariant?.id ?? line.id),
                name:
                    line.productVariant?.translations?.[0]?.name ||
                    `Variant ${line.productVariant?.id ?? line.id}`,
                total_price: line.listPrice,
                quantity: line.quantity,
                unit_price: Math.floor(line.listPrice / Math.max(1, line.quantity)),
            })),
            // If you track shipping lines, include them as separate "products"
            ...((order as any).shipping > 0
                ? [
                      {
                          identity: 'shipping',
                          name: 'Shipping Cost',
                          total_price: (order as any).shipping,
                          quantity: 1,
                          unit_price: (order as any).shipping,
                      },
                  ]
                : []),
        ];

        try {
            const { data } = await axios.post(
                initiatorUrl.endsWith('/') ? initiatorUrl : `${initiatorUrl}/`,
                {
                    return_url: returnUrl,
                    website_url: websiteUrl,
                    amount,
                    purchase_order_id: order.code,
                    purchase_order_name: `Order #${order.id}`,
                    customer_info: {
                        name: order.customer?.firstName || 'Sastodeal customer',
                        email: order.customer?.emailAddress || 'customer@example.com',
                        phone: (order.customer as any)?.phoneNumber || '9800000000',
                    },
                    product_details,
                    // Optional merchant fields
                    merchant_username: process.env.KHALTI_MERCHANT_USERNAME || 'MERCHANT_USERNAME',
                    merchant_extra: channelToken,
                },
                {
                    headers: {
                        Authorization: `Key ${khaltiSecret}`,
                        'Content-Type': 'application/json',
                    },
                    // (Optional) reasonable timeout
                    timeout: 15000,
                },
            );
            // Khalti typically returns a payment URL (often `payment_url`) and a pidx
            const paymentUrl: string | null = data?.payment_url ?? null;
            const pidx: string | null = data?.pidx ?? null;
            if (!paymentUrl) {
                return {
                    success: false,
                    message: 'Failed to create Khalti payment: missing payment URL in response',
                    paymentUrl: null,
                };
            }
            if (!pidx) {
                return {
                    success: false,
                    message: 'Failed to create Khalti payment: missing pidx in response',
                    paymentUrl: null,
                };
            }

            await this.connection.getRepository(ctx, PaymentGatewayTransactions).save({
                paymentMethod: 'KHALTI',
                totalTransactionAmount: amount.toString(),
                transactionId: pidx,
                paymentSettled: false,
                orderId: `${order.id}`,
            });
            console.log(ctx.channelId);

            // Success
            return {
                success: true,
                message: 'Payment created successfully',
                paymentUrl,
                orderId: String(order.id),
            };
        } catch (err: any) {
            console.log(err.response.data);
            const apiMsg =
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                err?.message ||
                'Unknown error';
            return {
                success: false,
                message: `Failed to create Khalti payment: ${apiMsg}`,
                paymentUrl: null,
            };
        }
    }

    @Get('webhook/success')
    async success(@Query() query: KhaltiSuccessQuery, @Req() req: Request, @Ctx() ctx: RequestContext) {
        // --- Pretty log all incoming params (masking mobile) ---
        const maskMobile = (m?: string) => (m ? m.replace(/(\d{2})\d{5}(\d{3})/, '$1*****$2') : m);
        const incoming = { ...query, mobile: maskMobile(query.mobile) };

        console.info(
            '[KHALTI] /webhook/success',
            JSON.stringify({ ip: req.ip, ua: req.headers['user-agent'], params: incoming }, null, 2),
        );

        // --- Basic validations ---
        const pidx = query.pidx;
        if (!pidx) {
            throw new BadRequestException('Missing required parameter: pidx');
        }

        // 1) Load your persisted tx (created during /create)
        const txRepo = this.connection.getRepository(ctx, PaymentGatewayTransactions);
        const tx = await txRepo.findOne({
            where: { transactionId: pidx, paymentMethod: 'KHALTI' },
        });

        if (!tx) {
            return {
                success: false,
                message: 'Unknown transaction: no matching record in database',
                request: incoming,
            };
        }

        // 2) Idempotency — already settled?
        if (tx.paymentSettled === true) {
            return {
                success: true,
                message: 'Payment already settled (idempotent acknowledgement)',
                request: incoming,
                checks: { alreadySettled: true },
            };
        }

        // 3) Amount check — compare with what you stored at create()
        const reqAmount = Number(query.total_amount ?? query.amount);
        const dbAmount = Number(tx.totalTransactionAmount ?? 'NaN');

        if (!Number.isFinite(reqAmount) || !Number.isFinite(dbAmount)) {
            return {
                success: false,
                message: 'Invalid amount format (request or DB)',
                request: { amountFromGateway: query.total_amount ?? query.amount },
                db: { totalTransactionAmount: tx.totalTransactionAmount },
            };
        }

        if (reqAmount !== dbAmount) {
            return {
                success: false,
                message: 'Amount mismatch between gateway payload and DB',
                request: { amountFromGateway: reqAmount },
                db: { totalTransactionAmount: dbAmount },
            };
        }

        // (Optional) If you saved orderId in the tx, you can cross-check purchase_order_id
        // with the actual order code:
        // if (tx.orderId) {
        //   const order = await this.connection.getRepository(ctx, Order).findOne({ where: { id: tx.orderId as any } });
        //   if (order && query.purchase_order_id && order.code !== query.purchase_order_id) {
        //     return { success: false, message: 'Order code mismatch', request: { purchase_order_id: query.purchase_order_id }, db: { orderCode: order.code } };
        //   }
        // }

        // 4) Choose verifier URL + secret

        const channel = await this.connection.getRepository(ctx, Channel).findOne({
            where: {
                token: query.merchant_extra,
            },
        });
        console.log(channel?.customFields.khaltiToken);
        let verifierUrl: string | undefined;
        let khaltiSecret: string | undefined;

        if (process.env.PAYMENT_ENV === 'dev') {
            verifierUrl = `${process.env.KHALTI_VERIFIER_URL_DEV}/`;
            khaltiSecret = process.env.KHALTI_SECRET_KEY_DEV;
        } else {
            verifierUrl = `${process.env.KHALTI_VERIFIER_URL_PROD}/`;
            khaltiSecret = channel?.customFields.khaltiToken;
        }

        if (!khaltiSecret || !verifierUrl) {
            throw new UnauthorizedException('Khalti verification not configured');
        }

        // 5) Verify with Khalti lookup
        let lookup: any;
        try {
            const resp = await axios.post(
                verifierUrl,
                { pidx },
                {
                    headers: { Authorization: `Key ${khaltiSecret}`, 'Content-Type': 'application/json' },
                    timeout: 10000,
                },
            );
            lookup = resp.data;
        } catch (err: any) {
            console.error('[KHALTI LOOKUP ERROR]', err?.response?.data || err?.message);
            return {
                success: false,
                message: 'Khalti lookup failed',
                request: incoming,
                error: err?.response?.data || err?.message,
            };
        }

        // 6) Cross-checks from Khalti
        const statusOK = lookup?.status === 'Completed';
        const pidxOK = lookup?.pidx === pidx;

        const lookupAmount = Number(lookup?.total_amount ?? lookup?.amount);
        const amountOK = Number.isFinite(lookupAmount) ? lookupAmount === dbAmount : true;

        const verified = statusOK && pidxOK && amountOK;

        // 7) Idempotent settle on success
        if (verified) {
            try {
                tx.paymentSettled = true;
                await txRepo.save(tx);
            } catch (persistErr: any) {
                console.error('[KHALTI SETTLE SAVE ERROR]', persistErr?.message || persistErr);
                // Even if save fails, report verification result back
            }
        }

        const order = await this.connection
            .getRepository(ctx, Order)
            .findOne({ where: { id: Number(tx.orderId) } });
        if (order) {
            const orderToUpdate = await order;
            if (orderToUpdate) {
                try {
                    // Add Payment to oder directly creates new Payment and adds to the oder

                    await this.orderService.updateCustomFields(ctx, orderToUpdate.id, {
                        isCustomPaymentHandlerFlow: true,
                    });
                    const now = new Date();

                    const formatted = new Intl.DateTimeFormat('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Kathmandu',
                    }).format(now);

                    const data = await this.orderService.addPaymentToOrder(ctx, orderToUpdate.id, {
                        method: 'custom-payment-method',
                        metadata: {
                            transactionId: pidx,
                            paymentMethod: 'KHALTI',
                            paymentVerified: true,
                            paymentVerifiedTime: formatted,
                            amount: dbAmount,
                        },
                    });
                    await this.connection.getRepository(ctx, Order).update(
                        { id: orderToUpdate.id },
                        {
                            state: 'PaymentSettled',
                        },
                    );
                } catch (error: any) {
                    console.log(error.message);
                    return {
                        success: false,
                        message: `Error processing payment : ${error?.message ?? 'unknown error'}`,
                        received: { pidx, total_amount: lookupAmount },
                        lookup: null,
                    };
                }
            }
        }

        return {
            success: verified,
            message: verified ? 'Payment verified' : 'Payment verification failed',
            request: incoming,
            lookup,
            checks: {
                statusOK,
                pidxOK,
                amountOK,
                dbAmount,
                reqAmount,
                lookupAmount,
            },
            orderId: order?.id,
        };
    }

    @Get('webhook/failure')
    async webhookFailure() {
        return { success: false, message: 'Payment failed' };
    }
}
