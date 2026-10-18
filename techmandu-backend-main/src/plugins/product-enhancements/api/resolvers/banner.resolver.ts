import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  Ctx,
  RequestContext,
  TransactionalConnection,
  ID,
  UserInputError,
  Product,
  ProductService,
  Asset,
} from "@vendure/core";
import { Banner } from "../../entities/banner.entity";

@Resolver()
export class BannerResolver {
  constructor(
    private connection: TransactionalConnection,
    private productService: ProductService,
  ) {}

  @Query()
  async heroSectionBanners(@Ctx() ctx: RequestContext): Promise<Banner[]> {
    const banners = await this.connection.getRepository(ctx, Banner).find({
      relations: ["image"],
      order: {
        createdAt: "DESC",
      },
    });

    return banners;
  }

  @Query()
  async heroSectionBanner(
    @Ctx() ctx: RequestContext,
    @Args() args: { id: ID },
  ): Promise<Banner | null> {
    return this.connection.getRepository(ctx, Banner).findOne({
      where: { id: args.id },
      relations: ["image"],
    });
  }

  @Query()
  async relatedProducts(
    @Ctx() ctx: RequestContext,
    @Args() args: { productSlug: string },
  ): Promise<Product[]> {
    const product = await this.productService.findOneBySlug(
      ctx,
      args.productSlug,
      ["facetValues"],
    );

    if (!product) {
      return [];
    }

    const facetValueIds = product.facetValues.map((fv: any) => fv.id);

    if (facetValueIds.length === 0) {
      return [];
    }

    const relatedProducts = await this.connection
      .getRepository(ctx, Product)
      .createQueryBuilder("product")
      .leftJoin("product.facetValues", "facetValue")
      // .innerJoin("product.facetValues", "facetValue")
      // .leftJoin("product.translations", "translations")
      .where("facetValue.id IN (:...facetValueIds)", { facetValueIds })
      .andWhere("product.id != :productId", { productId: product.id })
      .andWhere("product.enabled = true")
      .distinct(true)
      .orderBy("product.updatedAt", "DESC")
      .take(6)
      .getMany();

    return relatedProducts;
  }

  @Mutation()
  async createTestBanner(
    @Ctx() ctx: RequestContext,
    @Args()
    args: {
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
      imageId: ID;
      price?: number;
    },
  ): Promise<Banner> {
    if (
      !args.ctaLink.startsWith("https://") &&
      !args.ctaLink.startsWith("http://")
    ) {
      throw new UserInputError(
        "CTA Link must be a complete URL starting with https:// or http://",
      );
    }

    const asset = await this.connection.getRepository(ctx, Asset).findOne({
      where: { id: args.imageId },
    });

    if (!asset) {
      throw new UserInputError(`Asset with ID ${args.imageId} not found`);
    }

    const banner = new Banner({
      ...args,
      image: asset,
    });

    const savedBanner = await this.connection
      .getRepository(ctx, Banner)
      .save(banner);

    return this.connection.getRepository(ctx, Banner).findOne({
      where: { id: savedBanner.id },
      relations: ["image"],
    }) as unknown as Promise<Banner>;
  }

  @Mutation()
  async updateBanner(
    @Ctx() ctx: RequestContext,
    @Args()
    args: {
      id: ID;
      title: string;
      description: string;
      ctaText: string;
      ctaLink: string;
      imageId: ID;
      price?: number;
    },
  ): Promise<Banner> {
    if (
      !args.ctaLink.startsWith("https://") &&
      !args.ctaLink.startsWith("http://")
    ) {
      throw new UserInputError(
        "CTA Link must be a complete URL starting with https:// or http://",
      );
    }

    const banner = await this.connection.getRepository(ctx, Banner).findOne({
      where: { id: args.id },
      relations: ["image"],
    });

    if (!banner) {
      throw new UserInputError(`Banner with ID ${args.id} not found`);
    }

    const asset = await this.connection.getRepository(ctx, Asset).findOne({
      where: { id: args.imageId },
    });

    if (!asset) {
      throw new UserInputError(`Asset with ID ${args.imageId} not found`);
    }

    banner.title = args.title;
    banner.description = args.description;
    banner.ctaText = args.ctaText;
    banner.ctaLink = args.ctaLink;
    banner.image = asset;
    if (args.price) banner.price = args.price;

    const savedBanner = await this.connection
      .getRepository(ctx, Banner)
      .save(banner);

    return this.connection.getRepository(ctx, Banner).findOne({
      where: { id: savedBanner.id },
      relations: ["image"],
    }) as Promise<Banner>;
  }

  @Mutation()
  async deleteBanner(
    @Ctx() ctx: RequestContext,
    @Args() args: { id: ID },
  ): Promise<{ result: boolean }> {
    const banner = await this.connection.getRepository(ctx, Banner).findOne({
      where: { id: args.id },
    });

    if (!banner) {
      throw new UserInputError(`Banner with ID ${args.id} not found`);
    }

    await this.connection.getRepository(ctx, Banner).remove(banner);
    return { result: true };
  }
}
