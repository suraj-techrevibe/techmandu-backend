import { Injectable } from '@nestjs/common';
import {
  RequestContext,
  Customer,
  CustomerService,
  TransactionalConnection,
  ID,
  ListQueryBuilder,
  ListQueryOptions,
  PaginatedList,
  RelationPaths,
} from '@vendure/core';
import { BooleanOperators } from '../../codegen/generated-admin-types';

type CustomerFilter = {
  isVerified?: BooleanOperators;
};
@Injectable()
export class BusinessAccountService {
  constructor(
    private connection: TransactionalConnection,
    private customerService: CustomerService,
    private listQueryBuilder: ListQueryBuilder,
  ) {}

  async findBusinessAccounts(
    ctx: RequestContext,
    options?: ListQueryOptions<Customer>,
    relations?: RelationPaths<Customer>,
  ): Promise<PaginatedList<Customer>> {
    const qb = this.listQueryBuilder.build(Customer, options, {
      ctx,
      relations,
    });

    
    qb.andWhere('customer.customFields.isBusiness = :isBusiness', {
      isBusiness: true,
    });

    if (options?.filter) {
      const filter = options.filter as CustomerFilter;
      if (filter.isVerified?.eq !== undefined) {
        qb.andWhere('customer.customFields.isVerified = :isVerified', {
          isVerified: filter.isVerified.eq,
        });
      }
    }

    const [items, totalItems] = await qb.getManyAndCount();
    return {
      items,
      totalItems,
    };
  }

  async findOne(
    ctx: RequestContext,
    id: ID,
    relations?: RelationPaths<Customer>,
  ): Promise<Customer | null> {
    const customer = await this.customerService.findOne(ctx, id, relations);
    const customFields = customer?.customFields as { isBusiness?: boolean } | undefined;
    if (customer && customFields?.isBusiness) {
      return customer;
    }
    return null;
  }

  async updateVerificationStatus(
    ctx: RequestContext,
    id: ID,
    isVerified: boolean,
  ): Promise<Customer> {
    const customer = await this.customerService.findOne(ctx, id);
    if (!customer) {
      throw new Error(`Customer with id ${id} not found`);
    }

    const customFields = customer.customFields as { isBusiness?: boolean } | undefined;
    if (!customFields?.isBusiness) {
      throw new Error(`Customer with id ${id} is not a business account`);
    }

    const updated = await this.customerService.update(ctx, {
      id,
      customFields: {
        ...customer.customFields,
        isVerified,
      },
    });

    return updated;
  }
}

