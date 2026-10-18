import { Controller, Post, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import axios from "axios";
import {
  Channel,
  RequestContextService,
  TransactionalConnection,
  OrderService,
  Payment,
  RequestContext,
  Ctx,
  Order,
  ChannelService,
} from "@vendure/core";

@Controller("payment")
export class PaymentController {
  constructor(
    private connection: TransactionalConnection,
    private reqService: RequestContextService,
    private orderService: OrderService,
    private channelService: ChannelService
  ) {}

  @Get("callback")
  async handleCallback(@Req() req: Request, @Res() res: Response,@Ctx() ctx: RequestContext ) {
    const paymentResponse = req.query;
    const purchase_order_id = req.query
    const defaultChannel = await this.channelService.findOne(ctx,1);
    const khaltiSecretKey = defaultChannel?.customFields.khaltiSecretKey

    try {
      const { data } = await axios.post(
        "https://khalti.com/api/v2/epayment/lookup/",
        {
          pidx: paymentResponse.pidx,
        },
        {
          headers: {
            Authorization: `key ${khaltiSecretKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.status === "Completed") {
        // Get order by purchase_order_id (order code)
        const response =  await this.connection.getRepository(ctx, Order).update(
                        { code:data.purchase_order_id },
                        {
                            state: 'PaymentSettled',
                        },
                    );
        
        res.status(200).json({
          status: true,
          message: "payment Successful",
        });
      } else {
        res.status(400).json({
          status: false,
          message: "payment failed",
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Payment handling failed" });
    }
  }
}
