import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import {
  Ctx,
  Customer,
  CustomerService,
  ForbiddenError,
  InternalServerError,
  ProductVariant,
  RequestContext,
} from "@vendure/core";
import { WishlistService } from "../services/wishlist.service";

@Resolver("ProductVariant")
export class ProductVariantEntityResolver {
  constructor(
    private customerService: CustomerService,
    private wishlistService: WishlistService,
  ) {}

  @ResolveField()
  async isInWishlist(
    @Ctx() ctx: RequestContext,
    @Parent() productVariant: ProductVariant,
  ): Promise<boolean> {
    try {
      const customer = await this.getCustomerForOwner(ctx);
      return this.wishlistService.isInWishlist(
        ctx,
        customer.id,
        productVariant.id,
      );
    } catch {
      return false;
    }
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
