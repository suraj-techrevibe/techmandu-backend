import {
  Controller,
  Get,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import axios from "axios";
import {
  TransactionalConnection,
  RequestContextService,
  OrderService,
  Order,
  ChannelService,
  Payment,
} from "@vendure/core";

@Controller("payment")
export class PaymentController {
  constructor(
    private connection: TransactionalConnection,
    private requestContextService: RequestContextService,
    private orderService: OrderService,
    private channelService: ChannelService
  ) {}

  @Get("cellpay/callback")
  async cellpayCallback(@Req() req: Request, @Res() res: Response) {
    const { uniqueToken } = req.query as { uniqueToken: string };

    if (!uniqueToken) {
      return res.status(400).json({ message: "Missing uniqueToken" });
    }

    const ctx = await this.requestContextService.create({
      apiType: "admin",
    });

    try {
      const payment = await this.connection
        .getRepository(ctx, Payment)
        .createQueryBuilder("payment")
        .leftJoinAndSelect("payment.order", "order")
        .where("payment.transactionId = :token", { token: uniqueToken })
        .getOne();

      if (!payment || !payment.order) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const channel = await this.channelService.findOne(
        ctx,
        payment.order.channels[0].id
      );

      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const {
        cellpayBaseUrl,
        cellpayUsername,
        cellpayPassword,
      } = channel.customFields;

      const loginRes = await axios.post(`${cellpayBaseUrl}/sdk/login`, {
        username: cellpayUsername,
        password: cellpayPassword,
      });

      const token = loginRes.data.accessClient;

      const statusRes = await axios.get(
        `${cellpayBaseUrl}/sdk/transactions/${uniqueToken}/status`,
        {
          headers: { Token: token },
        }
      );

      if (statusRes.data.transactionStatus !== "PAID") {
        return res.status(400).json({
          success: false,
          message: "Payment not completed",
          status: statusRes.data.transactionStatus,
        });
      }

      await this.orderService.settlePayment(ctx, payment.id);

      return res.status(200).json({
        success: true,
        message: "Payment settled successfully",
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
}
