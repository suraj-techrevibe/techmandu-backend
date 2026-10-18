import { Injectable } from '@nestjs/common';
import {
  assertFound,
  ChannelService,
  EntityNotFoundError,
  ID,
  idsAreEqual,
  ListQueryBuilder,
  RequestContext,
  TransactionalConnection,
  TranslatableSaver,
  TranslatorService,
  UserInputError,
} from '@vendure/core';
import { In, IsNull } from 'typeorm';
import {
  QueryPageArgs,
  CreatePageInput,
  DeletionResult,
  PageListOptions,
  UpdatePageInput,
} from '../../codegen/generated-admin-types';
import { PageTranslation } from '../entities/page-translation.entity';
import { Page } from '../entities/page.entity';

@Injectable()
export class PageService {
  constructor(
    private connection: TransactionalConnection,
    private listQueryBuilder: ListQueryBuilder,
    private translator: TranslatorService,
    private translatableSaver: TranslatableSaver,
    private channelService: ChannelService
  ) {}

  async findAll(ctx: RequestContext, options?: PageListOptions) {
    return this.listQueryBuilder
      .build(Page, options, {
        ctx,
        channelId: ctx.channelId,
        where: { deletedAt: IsNull() },
      })
      .getManyAndCount()
      .then(([pages, totalItems]) => {
        const items = pages.map((page) => this.translator.translate(page, ctx));
        return {
          items,
          totalItems,
        };
      });
  }

  async findOne(ctx: RequestContext, args: QueryPageArgs) {
    if (!args.id && !args.slug) {
      throw new UserInputError('Page ID or slug is required');
    }
    if (args.id) {
      return this.findOneById(ctx, args.id);
    }
    return this.findOneBySlug(ctx, args.slug!);
  }

  async findOneById(ctx: RequestContext, id: ID) {
    return this.connection
      .findOneInChannel(ctx, Page, id, ctx.channelId, {
        where: { deletedAt: IsNull() },
      })
      .then((page) => {
        if (page) {
          return this.translator.translate(page, ctx);
        }
        throw new EntityNotFoundError('Page', id);
      });
  }

  async findOneBySlug(ctx: RequestContext, slug: string) {
    const qb = this.connection
      .getRepository(ctx, Page)
      .createQueryBuilder('page');
    const translatioinQb = this.connection
      .getRepository(ctx, PageTranslation)
      .createQueryBuilder('_page_translation')
      .select('_page_translation.baseId')
      .andWhere('_page_translation.slug = :slug', { slug });

    qb.leftJoin('page.translations', 'translation')
      .leftJoin('page.channels', 'channel')
      .andWhere('page.deletedAt IS NULL')
      .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
      .andWhere('page.id IN (' + translatioinQb.getQuery() + ')')
      .setParameters(translatioinQb.getParameters())
      .select('page.id', 'id')
      .addSelect(
        `CASE translation.languageCode WHEN '${ctx.languageCode}' THEN 2 WHEN '${ctx.channel.defaultLanguageCode}' THEN 1 ELSE 0 END`,
        'sort_order'
      )
      .orderBy('sort_order', 'DESC');

    // We use getRawOne here to simply get the ID as efficiently as possible,
    // which we then pass to the regular findOne() method which will handle
    // all the joins etc.
    const result = await qb.getRawOne();
    if (result) {
      return this.findOneById(ctx, result.id);
    } else {
      throw new EntityNotFoundError(
        'Page',
        `slug: ${slug}, channelId: ${ctx.channelId}, languageCode: ${ctx.languageCode}`
      );
    }
  }

  async findByIds(ctx: RequestContext, ids: ID[]) {
    return await this.connection
      .findByIdsInChannel(ctx, Page, ids, ctx.channelId, {
        where: { deletedAt: IsNull() },
      })
      .then((pages) =>
        pages.map((page) => this.translator.translate(page, ctx))
      );
  }

  async create(ctx: RequestContext, input: CreatePageInput) {
    const page = await this.translatableSaver.create({
      ctx,
      input,
      entityType: Page,
      translationType: PageTranslation,
      beforeSave: async (f) => {
        await this.channelService.assignToCurrentChannel(f, ctx);
      },
    });
    return assertFound(this.findOneById(ctx, page.id));
  }

  async update(ctx: RequestContext, input: UpdatePageInput) {
    const updated = await this.translatableSaver.update({
      ctx,
      input,
      entityType: Page,
      translationType: PageTranslation,
    });
    return assertFound(this.findOneById(ctx, updated.id));
  }

  async delete(ctx: RequestContext, ids: ID[]) {
    if (ids.length === 0) {
      throw new UserInputError('error.no-ids-provided');
    }
    const qb = this.connection
      .getRepository(ctx, Page)
      .createQueryBuilder('page');
    const existingFaqIds = await qb
      .leftJoin('page.channels', 'channel')
      .andWhere('page.id IN (:...ids)', { ids })
      .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
      .andWhere('page.deletedAt IS NULL')
      .select('page.id')
      .getMany()
      .then((pages) => pages.map((page) => page.id));

    const nonExistingIds = ids.filter((id) => !existingFaqIds.includes(id));
    if (nonExistingIds.length > 0) {
      throw new UserInputError(
        `Page(s) with ID(s) ${nonExistingIds.join(
          ', '
        )} not found or unavailable in this channel.`
      );
    }

    const deleteResult = await this.connection
      .getRepository(ctx, Page)
      .softDelete({
        id: In(existingFaqIds),
      });
    if ((deleteResult.affected ?? 0) > 0) {
      return {
        message: `${deleteResult.affected} Page(s) deleted successfully.`,
        result: DeletionResult.DELETED,
      };
    }

    return {
      message: 'No Page(s) were deleted.',
      result: DeletionResult.NOT_DELETED,
    };
  }

  async getPageGroup(ctx: RequestContext, pageId: ID) {
    return await this.connection
      .findOneInChannel(ctx, Page, pageId, ctx.channelId, {
        relations: ['group'],
        where: { deletedAt: IsNull() },
      })
      .then((page) => {
        if (page?.group) {
          return this.translator.translate(page.group, ctx);
        }
        return null;
      });
  }

  async assignToChannels(ctx: RequestContext, pageIds: ID[], channelIds: ID[]) {
    for (const pageId of pageIds) {
      await this.channelService.assignToChannels(ctx, Page, pageId, channelIds);
    }

    return await this.findByIds(ctx, pageIds);
  }

  async removeFromCurrentChannel(ctx: RequestContext, pageIds: ID[]) {
    const defaultChannel = await this.channelService.getDefaultChannel(ctx);
    if (idsAreEqual(ctx.channelId, defaultChannel.id)) {
      throw new UserInputError(
        'error.items-cannot-be-removed-from-default-channel'
      );
    }

    for (const pageId of pageIds) {
      await this.channelService.removeFromChannels(ctx, Page, pageId, [
        ctx.channelId,
      ]);
    }

    return await this.findByIds(ctx, pageIds);
  }
}
