import { ScheduledTask, Customer, CustomerService, TransactionalConnection } from "@vendure/core";
import { Logger } from "@nestjs/common";

const loggerCtx = "AccountDeletion";

export const deleteInactiveAccountsTask = new ScheduledTask({
  id: "delete-inactive-accounts",
  description:
    "Deletes customer accounts 3 days after a deletion request, unless the customer logs in again.",
  schedule: "0 0 * * *",
  execute: async ({ injector, scheduledContext }) => {
    const connection = injector.get(TransactionalConnection);
    const customerService = injector.get(CustomerService);

    const now = new Date();
    let customers: Customer[] = [];
    try {
      customers = await connection
        .getRepository(scheduledContext, Customer)
        .createQueryBuilder("customer")
        .where("customer.deletedAt IS NULL")
        .andWhere(`"customer"."customFieldsScheduledeleteat" IS NOT NULL`)
        .andWhere(`"customer"."customFieldsScheduledeleteat" <= :now`, { now })
        .getMany();
    } catch (e) {
      Logger.error(
        `Failed to query customers for deletion. If you recently added the account-deletion custom field, run migrations so the "customer"."customFieldsScheduledeleteat" column exists.`,
        e instanceof Error ? e.stack : String(e),
        loggerCtx,
      );
      return;
    }

    if (customers.length) {
      Logger.log(
        `Found ${customers.length} customer(s) to soft-delete`,
        loggerCtx,
      );
    }else {
      Logger.log(
        `No customers to soft-delete`,
        loggerCtx,
      );
    }

    for (const customer of customers) {
      try {
        await customerService.softDelete(scheduledContext, customer.id);
      } catch (e) {
        Logger.error(
          `Failed to soft-delete customer ${customer.id}: ${
            e instanceof Error ? e.message : String(e)
          }`,
          loggerCtx,
        );
      }
    }
  },
});


