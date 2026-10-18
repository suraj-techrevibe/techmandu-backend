import { Injectable } from "@nestjs/common";
import {
  ChannelService,
  EventBus,
  ID,
  ListQueryBuilder,
  RequestContext,
  TransactionalConnection,
  UserInputError,
  patchEntity,
} from "@vendure/core";

import { Blog } from "../../entities/blog-entity";
enum DeletionResult {
  /** The entity was successfully deleted */
  DELETED = "DELETED",
  /** Deletion did not take place, reason given in message */
  NOT_DELETED = "NOT_DELETED",
}
import { Repository } from "typeorm";
import { BlogCreationEvent } from "../../events/blogs-creation.event";
@Injectable()
export class BlogsService {
  constructor(
    private connection: TransactionalConnection,
    private channelService: ChannelService,
    private listQueryBuilder: ListQueryBuilder,
    private eventBus: EventBus
  ) {}

  async getblogs(ctx: RequestContext, options: any | undefined) {
    return this.listQueryBuilder
      .build(Blog, options, {
        channelId: ctx.channelId,
      })
      .getManyAndCount()
      .then(([items, totalItems]) => ({
        items,
        totalItems,
      }));
  }

  async getBlog(ctx: RequestContext, id: ID) {
    return this.connection
      .getRepository(ctx, Blog)
      .findOneOrFail({ where: { id } });
  }

  async getExistingBlogWithSlugInChannel(
    ctx: RequestContext,
    repository: Repository<Blog>,
    slug: string
  ) {
    const existingBlogWithSlug = await repository
      .createQueryBuilder("Blog")
      .leftJoinAndSelect("Blog.channels", "channels")
      .where("Blog.slug = :slug", { slug })
      .andWhere("channels.id = :channelId", { channelId: ctx.channelId })
      .getOne();
    return existingBlogWithSlug;
  }

  async getBlogFromSlug(ctx: RequestContext, slug: string) {
    const repository = this.connection.getRepository(ctx, Blog);
    const existingBlogWithSlug = await this.getExistingBlogWithSlugInChannel(
      ctx,
      repository,
      slug
    );
    if (!existingBlogWithSlug) {
      throw new UserInputError("Blog with given slug not found");
    }
    return existingBlogWithSlug;
  }

  async createBlog(ctx: RequestContext, input: any) {
    const repository = this.connection.getRepository(ctx, Blog);
    const newBlogConstructor: any = repository.create({ ...input });
    const existingSlugUsedBlog = await this.getExistingBlogWithSlugInChannel(
      ctx,
      repository,
      input.slug
    );
    if (existingSlugUsedBlog) {
      throw new UserInputError("Blog with given slug already exists in store");
    }

    if (input.metaTags) {
      const { metaTags } = input;
      const strinified = JSON.stringify(
        metaTags.split(",").map((i: any) => i.trim())
      );
      newBlogConstructor.metaTags = strinified;
    }

    const newBlog = await repository.save(newBlogConstructor);
    await this.channelService.assignToChannels(ctx, Blog, newBlog.id, [
      ctx.channelId,
    ]);
    await this.eventBus.publish(new BlogCreationEvent(ctx));
    return newBlog;
  }

  async updateBlog(ctx: RequestContext, input: any) {
    const repository = this.connection.getRepository(ctx, Blog);
    const existingBlog = await repository.findOne({ where: { id: input.id } });
    if (!existingBlog) {
      throw new UserInputError("Blog with given id not found");
    }
    if (input.slug) {
      const existingSlugUsedBlog = await this.getExistingBlogWithSlugInChannel(
        ctx,
        repository,
        input.slug
      );
      if (existingSlugUsedBlog && existingSlugUsedBlog.id !== input.id) {
        throw new UserInputError(
          "Blog with given slug already exists in store"
        );
      }

      if (input.metaTags) {
        const { metaTags } = input;
        const strinified = JSON.stringify(
          metaTags.split(",").map((i: any) => i.trim())
        );
        input.metaTags = strinified;
      }
    }
    const updatedBlog = patchEntity(existingBlog, input);

    const newUpdatedBlog = await this.connection
      .getRepository(ctx, Blog)
      .save(updatedBlog);
    return newUpdatedBlog;
  }

  async deleteBlog(ctx: RequestContext, id: ID) {
    await this.connection.getRepository(ctx, Blog).delete(id);
    return {
      result: DeletionResult.DELETED,
    };
  }
}
