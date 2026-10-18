import { Injectable } from "@nestjs/common";
import {
  DeletionResponse,
  DeletionResult,
} from "@vendure/common/lib/generated-types";
import {
  ForbiddenError,
  ID,
  ListQueryBuilder,
  ListQueryOptions,
  PaginatedList,
  ProductVariantService,
  RequestContext,
  TransactionalConnection,
  UserInputError,
  assertFound,
} from "@vendure/core";
import { WishlistItem } from "../entities/wishlist-item.entity";

@Injectable()
export class WishlistService {
  constructor(
    private connection: TransactionalConnection,
    private listQueryBuilder: ListQueryBuilder,
    private productVariantService: ProductVariantService,
  ) {}

  async findOne(ctx: RequestContext, id: ID): Promise<WishlistItem> {
    return this.connection.getRepository(ctx, WishlistItem).findOneOrFail({
      where: { id },
    });
  }

  async findAllByCustomerId(
    ctx: RequestContext,
    customerId: ID,
    options?: ListQueryOptions<WishlistItem>,
  ): Promise<PaginatedList<WishlistItem>> {
    return this.listQueryBuilder
      .build(WishlistItem, options, {
        ctx,
        where: { customerId },
        relations: ["productVariant", "productVariant.featuredAsset"],
      })
      .getManyAndCount()
      .then(([items, totalItems]) => ({
        items,
        totalItems,
      }));
  }

  async create(
    ctx: RequestContext,
    customerId: ID,
    productVariantId: ID,
  ): Promise<WishlistItem> {
    const productVariant = await this.productVariantService.findOne(
      ctx,
      productVariantId,
    );
    if (!productVariant) {
      throw new Error("Product variant not found");
    }

    const existingItem = await this.connection
      .getRepository(ctx, WishlistItem)
      .findOne({
        where: {
          customerId,
          productVariantId,
        },
      });

    if (existingItem) {
      return existingItem;
    }

    const wishlistItem = new WishlistItem({ customerId, productVariant });
    const newEntity = await this.connection
      .getRepository(ctx, WishlistItem)
      .save(wishlistItem);
    return assertFound(this.findOne(ctx, newEntity.id));
  }

  async delete(
    ctx: RequestContext,
    customerId: ID,
    id?: ID,
    productVariantId?: ID,
  ): Promise<DeletionResponse> {
    if (!id && !productVariantId) {
      throw new UserInputError(
        "Either id or productVariantId must be provided.",
      );
    }
    let whereClause = {};
    if (id) {
      whereClause = { id };
    }
    if (productVariantId) {
      whereClause = { productVariantId };
    }

    const entity = await this.connection
      .getRepository(ctx, WishlistItem)
      .findOneOrFail({
        where: { customerId, ...whereClause },
      });
    try {
      await this.connection.getRepository(ctx, WishlistItem).remove(entity);
      return {
        result: DeletionResult.DELETED,
      };
    } catch (e: any) {
      return {
        result: DeletionResult.NOT_DELETED,
        message: e.toString(),
      };
    }
  }

  async isInWishlist(
    ctx: RequestContext,
    customerId: ID,
    productVariantId: ID,
  ): Promise<boolean> {
    const count = await this.connection.getRepository(ctx, WishlistItem).count({
      where: {
        customerId,
        productVariantId,
      },
    });
    return count > 0;
  }
}
