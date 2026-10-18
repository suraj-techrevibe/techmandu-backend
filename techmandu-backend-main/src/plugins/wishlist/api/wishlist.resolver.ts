import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";

import { DeletionResponse } from "@vendure/common/lib/generated-types";
import {
  Allow,
  Ctx,
  Customer,
  CustomerService,
  ForbiddenError,
  InternalServerError,
  PaginatedList,
  Permission,
  RequestContext,
} from "@vendure/core";

import {
  MutationAddToWishlistArgs,
  MutationRemoveFromWishlistArgs,
  QueryWishlistsArgs,
} from "../../codegen/generated-shop-types";
import { WishlistItem } from "../entities/wishlist-item.entity";
import { WishlistService } from "../services/wishlist.service";

@Resolver()
export class WishlistShopResolver {
  constructor(
    private customerService: CustomerService,
    private wishlistService: WishlistService,
  ) {}

  @Query()
  @Allow(Permission.Owner)
  async wishlists(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryWishlistsArgs,
  ): Promise<PaginatedList<WishlistItem>> {
    const customer = await this.getCustomerForOwner(ctx);
    return this.wishlistService.findAllByCustomerId(
      ctx,
      customer.id,
      args.options,
    );
  }

  @Mutation()
  @Allow(Permission.Owner)
  async addToWishlist(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationAddToWishlistArgs,
  ): Promise<WishlistItem> {
    const customer = await this.getCustomerForOwner(ctx);
    return this.wishlistService.create(ctx, customer.id, args.productVariantId);
  }

  @Mutation()
  @Allow(Permission.Owner)
  async removeFromWishlist(
    @Ctx() ctx: RequestContext,
    @Args() args: MutationRemoveFromWishlistArgs,
  ): Promise<DeletionResponse> {
    const customer = await this.getCustomerForOwner(ctx);
    return this.wishlistService.delete(
      ctx,
      customer.id,
      args.id,
      args.productVariantId,
    );
  }

  /**
   * Returns the Customer entity associated with the current user.
   */
  private async getCustomerForOwner(ctx: RequestContext): Promise<Customer> {
    const userId = ctx.activeUserId;
    if (!userId) {
      throw new ForbiddenError();
    }
    const customer = await this.customerService.findOneByUserId(ctx, userId);
    if (!customer) {
      throw new InternalServerError("error.no-customer-found-for-current-user");
    }
    return customer;
  }
}
