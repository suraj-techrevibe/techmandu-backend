import { Injectable } from '@nestjs/common';
import {
  assertFound,
  EntityNotFoundError,
  ID,
  ListQueryBuilder,
  PaginatedList,
  RelationPaths,
  RequestContext,
  TransactionalConnection,
  TranslatableSaver,
  Translated,
  TranslatorService,
  UserInputError,
} from '@vendure/core';

import { PageGroup } from '../entities/page-group.entity';
import { PageGroupTranslation } from '../entities/page-group-translation.entity';
import {
  CreatePageGroupInput,
  DeletionResult,
  PageGroupListOptions,
  QueryPageGroupArgs,
  UpdatePageGroupInput,
  PageListOptions,
} from '../../codegen/generated-admin-types';
import { In, IsNull } from 'typeorm';
import { Page } from '../entities/page.entity';

@Injectable()
export class PageGroupService {
  constructor(
    private connection: TransactionalConnection,
    private listQueryBuilder: ListQueryBuilder,
    private translator: TranslatorService,
    private translatableSaver: TranslatableSaver
  ) {}

  async findAll(ctx: RequestContext, options?: PageGroupListOptions) {
    return this.listQueryBuilder
      .build(PageGroup, options, {
        ctx,
        where: { deletedAt: IsNull() },
      })
      .getManyAndCount()
      .then(([groups, totalItems]) => {
        const items = groups.map((group) =>
          this.translator.translate(group, ctx)
        );
        return {
          items,
          totalItems,
        };
      });
  }

  async findOne(
    ctx: RequestContext,
    args: QueryPageGroupArgs
  ): Promise<Translated<PageGroup>> {
    if (!args.id && !args.slug) {
      throw new UserInputError('PageGroup ID or slug is required');
    }
    if (args.id) {
      return this.findOneById(ctx, args.id);
    }
    return this.findOneBySlug(ctx, args.slug!);
  }

  async findOneById(
    ctx: RequestContext,
    id: ID
  ): Promise<Translated<PageGroup>> {
    return this.connection
      .getRepository(ctx, PageGroup)
      .findOne({
        where: { id, deletedAt: IsNull() },
      })
      .then((group) => {
        if (group) {
          return this.translator.translate(group, ctx);
        }
        throw new EntityNotFoundError('PageGroup', id);
      });
  }

  async findOneBySlug(
    ctx: RequestContext,
    slug: String
  ): Promise<Translated<PageGroup>> {
    throw new UserInputError(
      'Method not implemented. Use getGroupPagesBySlug instead.'
    );
  }

  async create(ctx: RequestContext, input: CreatePageGroupInput) {
    const group = await this.translatableSaver.create({
      ctx,
      input,
      entityType: PageGroup,
      translationType: PageGroupTranslation,
    });
    return assertFound(this.findOneById(ctx, group.id));
  }

  async update(ctx: RequestContext, input: UpdatePageGroupInput) {
    const updated = await this.translatableSaver.update({
      ctx,
      input,
      entityType: PageGroup,
      translationType: PageGroupTranslation,
    });
    return assertFound(this.findOneById(ctx, updated.id));
  }

  async delete(ctx: RequestContext, ids: ID[]) {
    if (ids.length === 0) {
      throw new UserInputError('error.no-ids-provided');
    }
    const qb = this.connection
      .getRepository(ctx, PageGroup)
      .createQueryBuilder('pageGroup');
    const existingIds = await qb
      .andWhere('pageGroup.id IN (:...ids)', { ids })
      .andWhere('pageGroup.deletedAt IS NULL')
      .select('pageGroup.id')
      .getMany()
      .then((groups) => groups.map((g) => g.id));

    const nonExistingIds = ids.filter((id) => !existingIds.includes(id));
    if (nonExistingIds.length > 0) {
      throw new UserInputError(
        `PageGroups with ID(s) ${nonExistingIds.join(', ')} not found.`
      );
    }
    const deleteResult = await this.connection
      .getRepository(ctx, PageGroup)
      .softDelete({
        id: In(existingIds),
      });

    if ((deleteResult.affected ?? 0) > 0) {
      return {
        message: `${deleteResult.affected} PageGroup(s) deleted successfully.`,
        result: DeletionResult.DELETED,
      };
    }

    return {
      message: 'No PageGroup(s) were deleted.',
      result: DeletionResult.NOT_DELETED,
    };
  }

  async findGroupPagesByGroupId(
    ctx: RequestContext,
    groupId: ID,
    options?: PageListOptions
  ): Promise<PaginatedList<Translated<Page>>> {
    return this.listQueryBuilder
      .build(Page, options, { ctx })
      .leftJoin('page.group', 'group')
      .leftJoin('page.channels', 'channel')
      .where('group.id = :groupId', { groupId })
      .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
      .andWhere('page.deletedAt IS NULL')
      .getManyAndCount()
      .then(([items, totalItems]) => {
        const translated = items.map((page) =>
          this.translator.translate(page, ctx, ['group'])
        );
        return {
          items: translated,
          totalItems,
        };
      });
  }

  async findPageGroupByGroupSlug(
    ctx: RequestContext,
    slug: string
  ): Promise<Translated<PageGroup>> {
    const group = await this.connection
      .getRepository(ctx, PageGroup)
      .createQueryBuilder('pageGroup')
      .leftJoinAndSelect('pageGroup.translations', 'translation')
      .leftJoinAndSelect('pageGroup.pages', 'page')
      .leftJoinAndSelect('page.translations', 'pageTranslation')
      .leftJoin('page.channels', 'channel')
      .where('translation.slug = :slug', { slug })
      .andWhere('translation.languageCode = :languageCode', {
        languageCode: ctx.languageCode,
      })
      .andWhere('channel.id = :channelId', { channelId: ctx.channelId })
      .andWhere('pageGroup.deletedAt IS NULL')
      .getOne();

    if (!group) {
      throw new EntityNotFoundError('PageGroup (by slug)', slug);
    }
    return this.translator.translate(group, ctx, ['pages']);
  }

  async assignPagesToGroup(
    ctx: RequestContext,
    groupId: ID,
    pageIds: ID[]
  ): Promise<Translated<PageGroup>> {
    if (!pageIds.length) {
      throw new UserInputError('No page IDs provided.');
    }

    const group = await this.connection.getEntityOrThrow(
      ctx,
      PageGroup,
      groupId,
      {
        relations: ['pages'],
      }
    );

    const pages = await this.connection.getRepository(ctx, Page).find({
      where: { id: In(pageIds) },
      relations: ['group'],
      withDeleted: false,
    });

    if (pages.length !== pageIds.length) {
      throw new UserInputError('Some page IDs are invalid or do not exist.');
    }

    for (const page of pages) {
      if (!page.group || page.group.id !== group.id) {
        page.group = group;
      }
    }

    await this.connection
      .getRepository(ctx, Page)
      .save(pages, { reload: false });

    return assertFound(this.findOneById(ctx, group.id));
  }

  async removePagesFromGroup(
    ctx: RequestContext,
    groupId: ID,
    pageIds: ID[]
  ): Promise<Translated<PageGroup>> {
    if (!pageIds.length) {
      throw new UserInputError('No page IDs provided.');
    }

    const group = await this.connection.getEntityOrThrow(
      ctx,
      PageGroup,
      groupId,
      {
        relations: ['pages'],
      }
    );

    const pages = await this.connection.getRepository(ctx, Page).find({
      where: { id: In(pageIds) },
      relations: ['group'],
      withDeleted: false,
    });

    if (pages.length !== pageIds.length) {
      throw new UserInputError('Some page IDs are invalid or do not exist.');
    }

    for (const page of pages) {
      if (page.group && page.group.id === group.id) {
        page.group = null;
      } else {
        throw new UserInputError(
          `Page ${page.id} is not part of group ${groupId}`
        );
      }
    }

    await this.connection
      .getRepository(ctx, Page)
      .save(pages, { reload: false });

    return assertFound(this.findOneById(ctx, group.id));
  }
}
