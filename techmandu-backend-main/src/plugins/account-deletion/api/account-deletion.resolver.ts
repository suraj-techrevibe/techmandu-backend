import { Mutation, Resolver } from "@nestjs/graphql";
import { Success } from "@vendure/common/lib/generated-types";
import {
  Allow,
  Ctx,
  Customer,
  CustomerService,
  ForbiddenError,
  Permission,
  RequestContext,
} from "@vendure/core";

@Resolver()
export class AccountDeletionResolver {
  constructor(private customerService: CustomerService) {}

  @Mutation()
  @Allow(Permission.Owner)
  async requestAccountDeletion(@Ctx() ctx: RequestContext): Promise<Success> {
    const customer = await this.getCustomerForOwner(ctx);
    const scheduleDeleteAt = addDays(new Date(), 3);

    await this.customerService.update(ctx, {
      id: customer.id,
      customFields: {
        scheduleDeleteAt,
      },
    });

    return { success: true };
  }

  private async getCustomerForOwner(ctx: RequestContext): Promise<Customer> {
    const userId = ctx.activeUserId;
    if (!userId) {
      throw new ForbiddenError();
    }
    const customer = await this.customerService.findOneByUserId(ctx, userId);
    if (!customer) {
      throw new ForbiddenError();
    }
    return customer;
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}


