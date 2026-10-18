import { Injectable } from "@nestjs/common";
import axios from "axios";
import { computeNearestBranch } from "../util/branch-match.util";
import { haversineDistance } from "../util/distance-compute.util";
import { geocodeAddress } from "../util/geocode.util";
import {
  TransactionalConnection,
  RequestContext,
  ShippingCalculationResult,
  ID,
  Order,
  Channel,
  Logger,
} from "@vendure/core";
import { NCM_SHIPPING_CALCULATOR, NCM_SHIPPING_METHOD_CODE } from "../contstants";

@Injectable()
export class NcmService {
  // --- Branch list cache (memoization) ---
  private branchCache: { data: any[]; fetchedAt: number } | null = null;
  private branchFetchPromise: Promise<any[] | null> | null = null;
  private readonly BRANCH_TTL_MS = 1000 * 60 * 30; // 30 minutes
  public geocodeCache: Map<string, { lat: number; lon: number; fetchedAt: number }> = new Map();
  public readonly GEOCODE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
  private readonly ncmApiBase = (process.env.NCM_API_BASE_URL || 'https://portal.nepalcanmove.com').replace(/\/$/, '');

  public async getBranches(): Promise<any[] | null> {
    const now = Date.now();
    if (
      this.branchCache &&
      now - this.branchCache.fetchedAt < this.BRANCH_TTL_MS &&
      Array.isArray(this.branchCache.data)
    ) {
      return this.branchCache.data;
    }
    if (this.branchFetchPromise) {
      return this.branchFetchPromise;
    }

    const branchApiUrl =
      process.env.NCM_BRANCH_API_URL ||
      "https://docs.hyperce.io/hyperclicks/branches_with_geocode.json";

    this.branchFetchPromise = axios
      .get(branchApiUrl, { timeout: 8000 })
      .then((res) => {
        if (!Array.isArray(res.data)) {
          throw new Error("Invalid branches payload");
        }
        this.branchCache = { data: res.data, fetchedAt: Date.now() };
        return res.data;
      })
      .catch((error) => {
        Logger.warn(
          `Failed fetching NCM branches: ${error instanceof Error ? error.message : String(
            error
          )}`,
          "NcmService"
        );
        return this.branchCache?.data || null;
      })
      .finally(() => {
        this.branchFetchPromise = null;
      });

    return this.branchFetchPromise;
  }

  private async getChannelConfig(
    ctx: RequestContext
  ): Promise<{ apiKey: string; creationBranch: string } | null> {
    const channel = ctx.channel as Channel | undefined;
    const customFields = channel?.customFields as
      | { ncmApiKey?: string; ncmCreationBranch?: string }
      | undefined;

    const apiKey = customFields?.ncmApiKey?.trim();
    const creationBranch = customFields?.ncmCreationBranch?.trim();
    if (apiKey && creationBranch) {
      return { apiKey, creationBranch };
    }

    const channelRepo = this.connection.getRepository(ctx, Channel);
    const persistedChannel = await channelRepo.findOne({ where: { id: ctx.channelId } });
    const fallbackApiKey = persistedChannel?.customFields?.ncmApiKey?.trim();
    const fallbackCreation =
      persistedChannel?.customFields?.ncmCreationBranch?.trim();

    if (fallbackApiKey && fallbackCreation) {
      return { apiKey: fallbackApiKey, creationBranch: fallbackCreation };
    }

    return null;
  }

  async hasActiveChannelConfig(ctx: RequestContext): Promise<boolean> {
    return Boolean(await this.getChannelConfig(ctx));
  }

  private orderUsesNcm(order: Order): boolean {
    return (order.shippingLines ?? []).some((line) => {
      const code = line.shippingMethod?.code;
      return (
        code === NCM_SHIPPING_METHOD_CODE ||
        code === NCM_SHIPPING_CALCULATOR
      );
    });
  }

  private async loadOrder(
    ctx: RequestContext,
    orderId: ID,
    relations: string[] = []
  ): Promise<Order | null> {
    return this.connection.getRepository(ctx, Order).findOne({
      where: { id: orderId },
      relations,
    });
  }

  private isValidNepalAddress(order: Order): boolean {
    const address = order.shippingAddress;
    if (!address) {
      return false;
    }
    const countryCode =
      typeof address.countryCode === "string"
        ? address.countryCode.toUpperCase()
        : "";
    if (countryCode !== "NP") {
      return false;
    }
    const streetLine1 =
      typeof address.streetLine1 === "string"
        ? address.streetLine1.trim()
        : "";
    const city =
      typeof address.city === "string" ? address.city.trim() : "";
    return Boolean(streetLine1 && city);
  }

  private async requestShippingRate(
    apiKey: string,
    creationBranch: string,
    destinationBranch: string,
    type: string
  ): Promise<{ charge: number; rawCharge: unknown }> {
    try {
      const response = await axios.get(
        `${this.ncmApiBase}/api/v1/shipping-rate`,
        {
          params: {
            creation: creationBranch,
            destination: destinationBranch,
            type,
          },
          headers: {
            Authorization: `Token ${apiKey}`,
          },
          timeout: 7000,
        }
      );

      const chargeRaw = response.data?.charge;
      const chargeNumber =
        typeof chargeRaw === "number"
          ? chargeRaw
          : parseFloat(
              typeof chargeRaw === "string"
                ? chargeRaw
                : String(chargeRaw ?? "")
            );
      if (!Number.isFinite(chargeNumber)) {
        throw new Error("Invalid charge returned by NCM API");
      }
      return { charge: chargeNumber, rawCharge: chargeRaw };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const remoteMessage =
          error.response?.data?.Message ||
          error.response?.data?.detail ||
          error.message;
        const friendly =
          status === 401 || status === 403
            ? "NCM credentials were rejected"
            : remoteMessage || "Failed to fetch NCM shipping rate";
        Logger.error(
          `NCM shipping-rate failed (${status ?? "no-status"}): ${friendly}`,
          "NcmService"
        );
        throw new Error(friendly);
      }
      Logger.error(
        `Unexpected error calling NCM shipping-rate: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "NcmService"
      );
      throw error;
    }
  }


  private ensureOrderCustomFields(order: Order): Record<string, any> {
    const anyOrder = order as any;
    if (!anyOrder.customFields || typeof anyOrder.customFields !== 'object') {
      anyOrder.customFields = {};
    }
    return anyOrder.customFields;
  }

  async enrichOrderShippingMeta(ctx: RequestContext, order: Order): Promise<void> {
    if (!this.isValidNepalAddress(order)) {
      return;
    }
    const customFields = this.ensureOrderCustomFields(order);
    // Build full address for geocoding
    let nearest: string | null = null;
    try {
      nearest = await computeNearestBranch(
        order.shippingAddress,
        () => this.getBranches(),
        (address: string) =>
          geocodeAddress(
            `${address}, Nepal`,
            this.geocodeCache,
            this.GEOCODE_TTL_MS
          ),
        (coords1, coords2) => haversineDistance(coords1, coords2)
      );
    } catch (error) {
      Logger.error(
        `Failed to compute nearest NCM branch: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "NcmService"
      );
      return;
    }
    if (!nearest) return;
    let persist = false;
    if (customFields.nearestNcmBranch !== nearest) {
      customFields.nearestNcmBranch = nearest;
      persist = true;
    }
    if (customFields.destinationBranch !== nearest) {
      customFields.destinationBranch = nearest;
      persist = true;
      customFields.ncmQuote = null;
    }
    if (persist && order.id) {
      await this.connection.getRepository(ctx, Order).update(order.id, {
        customFields: { ...customFields },
      });
    }
  }
  constructor(private readonly connection: TransactionalConnection) {}

  async getDeliveryAmount(
    ctx: RequestContext,
    order: Order,
    type: string
  ): Promise<ShippingCalculationResult> {
    if (!this.isValidNepalAddress(order)) {
      return {
        price: 0,
        priceIncludesTax: false,
        taxRate: 0,
        metadata: {
          failed: true,
          error: "NCM shipping is only available for Nepal addresses (address not set)",
          orderId: order.id,
          shippingAddress: order.shippingAddress,
        },
      };
    }

    const channelConfig = await this.getChannelConfig(ctx);
    if (!channelConfig) {
      throw new Error("NCM shipping is not configured for this channel");
    }

    if (order.shippingAddress) {
      await this.enrichOrderShippingMeta(ctx, order);
    }
    const customFields = this.ensureOrderCustomFields(order);
    const destination =
      typeof customFields.destinationBranch === "string" &&
      customFields.destinationBranch.trim()
        ? customFields.destinationBranch.trim()
        : typeof customFields.nearestNcmBranch === "string"
        ? customFields.nearestNcmBranch.trim()
        : "";

    if (!destination) {
      Logger.warn(
        `Unable to resolve destination branch for NCM shipping. OrderId: ${order.id}, Address: ${JSON.stringify(order.shippingAddress)}`,
        "NcmService"
      );
      return {
        price: 0,
        priceIncludesTax: false,
        taxRate: 0,
        metadata: {
          failed: true,
          error: "Unable to resolve destination branch for NCM shipping",
          orderId: order.id,
          shippingAddress: order.shippingAddress,
          customFields,
        },
      };
    }

    // Check for cached quote
    if (
      customFields.ncmQuote &&
      typeof customFields.ncmQuote === "object" &&
      customFields.ncmQuote.destination === destination &&
      customFields.ncmQuote.type === type &&
      customFields.ncmQuote.price > 0
    ) {
      return {
        price: customFields.ncmQuote.price,
        priceIncludesTax: false,
        taxRate: 0,
        metadata: {
          nearestBranch: destination,
          creationBranch: channelConfig.creationBranch,
          rawCharge: customFields.ncmQuote.rawCharge,
          cached: true,
        },
      };
    }

    // Fetch new quote and cache it
    const quote = await this.requestShippingRate(
      channelConfig.apiKey,
      channelConfig.creationBranch,
      destination,
      type
    );

    const finalCharge = Math.round(quote.charge * 100);
    customFields.ncmQuote = {
      price: finalCharge,
      destination,
      type,
      rawCharge: quote.rawCharge,
      createdAt: Date.now(),
    };
    if (order.id) {
      await this.connection.getRepository(ctx, Order).update(order.id, {
        customFields: { ...customFields },
      });
    }
    return {
      price: finalCharge,
      priceIncludesTax: false,
      taxRate: 0,
      metadata: {
        nearestBranch: destination,
        creationBranch: channelConfig.creationBranch,
        rawCharge: quote.rawCharge,
        cached: false,
      },
    };
  }
  async createDelivery(ctx: RequestContext, orderIds: ID[]) {
    const channelConfig = await this.getChannelConfig(ctx);
    if (!channelConfig) {
      throw new Error("NCM shipping is not configured for this channel");
    }

    const orderRepo = this.connection.getRepository(ctx, Order);
    for (const orderId of orderIds) {
      // const order = await this.loadOrder(ctx, orderId, [
      //   "customer",
      //   "shippingLines",
      //   "shippingLines.shippingMethod",
      // ]);
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["lines", "customer", "shippingLines", "shippingLines.shippingMethod","surcharges"],
      });
      if (!order) {
        Logger.warn(`Order with ID ${orderId} not found`, "NcmService");
        continue;
      }
      if (!this.orderUsesNcm(order)) {
        Logger.warn(
          `Skipping NCM delivery for order ${order.code || orderId} because shipping method is not NCM`,
          "NcmService"
        );
        continue;
      }
      if (!this.isValidNepalAddress(order)) {
        Logger.warn(
          `Skipping NCM delivery for order ${order.code || orderId} due to non-Nepal shipping address`,
          "NcmService"
        );
        continue;
      }

      await this.enrichOrderShippingMeta(ctx, order);
      const customFields = this.ensureOrderCustomFields(order);
      const destination =
        typeof customFields.destinationBranch === "string" &&
        customFields.destinationBranch.trim()
          ? customFields.destinationBranch.trim()
          : typeof customFields.nearestNcmBranch === "string"
          ? customFields.nearestNcmBranch.trim()
          : "";

      if (!destination) {
        Logger.error(
          `Unable to determine destination branch for order ${
            order.code || orderId
          }`,
          "NcmService"
        );
        continue;
      }

      const addressParts = [
        order.shippingAddress?.streetLine1,
        order.shippingAddress?.streetLine2,
        order.shippingAddress?.city,
        order.shippingAddress?.province,
        order.shippingAddress?.countryCode,
        order.shippingAddress?.postalCode,
      ]
        .map((part) => (typeof part === "string" ? part.trim() : part))
        .filter(Boolean);
      const params = {
        name: order.shippingAddress.fullName ??
        `${order.customer?.firstName ?? "Techmandu"}
         ${order.customer?.lastName ?? ""}`.trim() 
         ?? "unknown",
         // remove initial +977 if present
        phone: order.shippingAddress.phoneNumber?.replace(/^\+977/, '') ?? '9768520433',
        phone2: '9768520433',
        cod_charge: order.total,
        address: addressParts.join(", "),
        fbranch: channelConfig.creationBranch,
        branch: destination,
        package: "PackageType",
        vref_id: `${order.id}`,
        instruction: "Delivery Instructions",
      };      
      // console.log(params)
      // console.log(`${this.ncmApiBase}/api/v1/order/create`)
      // console.log(`Token ${channelConfig.apiKey}`)
      try {
        
        const response = await axios.post(
          `${this.ncmApiBase}/api/v1/order/create`,
          params,
          {
            headers: {
              Authorization: `Token ${channelConfig.apiKey}`,
            },
            timeout: 10000,
          }
        );


        const trackingId = response.data?.orderid;
        // if (typeof trackingId !== "string" || !trackingId.trim()) {
        //   Logger.error(
        //     `NCM order/create returned invalid tracking id for order ${
        //       order.code || orderId
        //     }`,
        //     "NcmService"
        //   );
        //   continue;
        // }
        if (!trackingId || response.data.Message != 'Order Successfully Created'){
          throw new Error(`NCM order/create failed: ${response.data?.Message || 'No tracking ID returned'}`);
        }
        const safeTrackingId=trackingId as string;
        order.customFields.ncmTrackingId = safeTrackingId;
        await orderRepo.save(order);
        return safeTrackingId;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // console.log(error)
          const status = error.response?.status;

          const remoteMessage =
            error.response?.data?.Message ||
            error.response?.data?.detail ||
            error.message;
          Logger.error(
            `NCM order/create failed for order ${
              order.code || orderId
            } (${status ?? "no-status"}): ${remoteMessage}`,
            "NcmService"
          );
        } else {
          Logger.error(
            `Unexpected error creating NCM delivery for order ${
              order.code || orderId
            }: ${error instanceof Error ? error.message : String(error)}`,
            "NcmService"
          );
        }
      }
    }

    throw new Error("Failed to create NCM delivery for the provided orders");
  }
  async getOrderStatus(ctx: RequestContext, orderId: ID): Promise<any> {
    const channelConfig = await this.getChannelConfig(ctx);
    if (!channelConfig) {
      throw new Error("NCM shipping is not configured for this channel");
    }

    try {
      const response = await axios.get(
        `${this.ncmApiBase}/api/v1/order/status`,
        {
          params: {
            id: orderId,
          },
          headers: {
            Authorization: `Token ${channelConfig.apiKey}`,
          },
          timeout: 7000,
        }
      );

      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error("NCM did not return a status record");
      }

      return response.data[0];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const remoteMessage =
          error.response?.data?.Message ||
          error.response?.data?.detail ||
          error.message;
        Logger.error(
          `NCM order/status failed (${status ?? "no-status"}): ${remoteMessage}`,
          "NcmService"
        );
        throw new Error(remoteMessage || "Failed to fetch NCM order status");
      }
      Logger.error(
        `Unexpected error fetching NCM order status: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "NcmService"
      );
      throw new Error("Failed to fetch NCM order status");
    }
  }
  async AddNcmBranchToOrder(
    ctx: RequestContext,
    destinationBranch: string,
    orderId: ID
  ) {
    try {
      const order = await this.loadOrder(ctx, orderId, ["lines", "shippingLines", "shippingLines.shippingMethod"]);
      if (!order) {
        return {
          message: `No order found for id ${orderId}`,
          status: false,
        };
      }
      const customFields = this.ensureOrderCustomFields(order);
      
      // Clear cache if destination branch is changing
      if (customFields.destinationBranch !== destinationBranch) {
        customFields.ncmQuote = null;
      }
      
      customFields.destinationBranch = destinationBranch;
      await this.connection.getRepository(ctx, Order).save(order);
      return {
        message: "NCM destination branch updated",
        status: true,
      };
    } catch (e: any) {
      Logger.error(
        `Failed to update destination branch for order ${orderId}: ${
          e?.message ?? String(e)
        }`,
        "NcmService"
      );
      return {
        message: e.message,
        status: false,
      };
    }
  }
  async addNote(ctx: RequestContext, note: string, orderID: ID) {
    try {
      const order = await this.loadOrder(ctx, orderID, ["lines"]);
      if (!order) {
        return {
          message: `No order found for id ${orderID}`,
          status: false,
        };
      }
      const customFields = this.ensureOrderCustomFields(order);
      customFields.orderNotes = note;
      await this.connection.getRepository(ctx, Order).save(order);
      return {
        message: "Success",
        status: true,
      };
    } catch (e) {
      Logger.error(
        `Failed to add note for order ${orderID}: ${
          e instanceof Error ? e.message : String(e)
        }`,
        "NcmService"
      );
      return {
        message: "Failed",
        status: false,
      };
    }
  }
  async valleyStatus(ctx: RequestContext, outOfValley: boolean, orderID: ID) {
    try {
      const order = await this.loadOrder(ctx, orderID, ["lines"]);
      if (!order) {
        return {
          message: `No order found for id ${orderID}`,
          status: false,
        };
      }
      const customFields = this.ensureOrderCustomFields(order);
      customFields.outOfValley = outOfValley;
      await this.connection.getRepository(ctx, Order).save(order);
      return {
        message: "Success",
        status: true,
      };
    } catch (e) {
      Logger.error(
        `Failed to update valley status for order ${orderID}: ${
          e instanceof Error ? e.message : String(e)
        }`,
        "NcmService"
      );
      return {
        message: "Failed",
        status: false,
      };
    }
  }
}
