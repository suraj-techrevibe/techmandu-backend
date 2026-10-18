import { OnApplicationBootstrap } from "@nestjs/common";
import {
  CustomerService,
  EventBus,
  LanguageCode,
  LoginEvent,
  PluginCommonModule,
  Type,
  VendurePlugin,
} from "@vendure/core";

import { shopApiExtensions } from "./api/shop-api-extensions";
import { AccountDeletionResolver } from "./api/account-deletion.resolver";
import { deleteInactiveAccountsTask } from "./account-deletion.task";

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomCustomerFields {
    /**
     * If set, indicates the date after which the customer's account will be deleted.
     * Cleared on successful login.
     */
    scheduleDeleteAt?: Date | null;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [AccountDeletionResolver],
  },
  configuration: (config) => {
    config.customFields.Customer ??= [];
    config.customFields.Customer.push({
      name: "scheduleDeleteAt",
      type: "datetime",
      nullable: true,
      public: true,
      label: [{ languageCode: LanguageCode.en, value: "Scheduled Delete At" }],
      description: [
        {
          languageCode: LanguageCode.en,
          value:
            "If set, the customer's account will be deleted after this date unless they log in again.",
        },
      ],
    });

    config.schedulerOptions.tasks = [
      ...(config.schedulerOptions.tasks ?? []),
      deleteInactiveAccountsTask,
    ];

    return config;
  },
  compatibility: "^3.0.0",
})
export class AccountDeletionPlugin implements OnApplicationBootstrap {
  static init(): Type<AccountDeletionPlugin> {
    return AccountDeletionPlugin;
  }

  constructor(private eventBus: EventBus, private customerService: CustomerService) {}

  async onApplicationBootstrap() {
    this.eventBus.ofType(LoginEvent).subscribe(async (event) => {
      // Clear the scheduled deletion date on *any* successful login.
      // If this is an admin login (no associated Customer), do nothing.
      const customer = await this.customerService.findOneByUserId(
        event.ctx,
        event.user.id,
      );
      if (!customer?.customFields?.scheduleDeleteAt) {
        return;
      }

      await this.customerService.update(event.ctx, {
        id: customer.id,
        customFields: {
          scheduleDeleteAt: null,
        },
      });
    });
  }
}


