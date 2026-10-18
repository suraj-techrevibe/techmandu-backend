import {
  Asset,
  LanguageCode,
  PluginCommonModule,
  VendurePlugin,
} from "@vendure/core";
import { GoogleAuthenticationStrategy } from "./google-auth-service";

export interface GoogleAuthPluginOptions {
  googleClientId: string;
}

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomCustomerFields {
    avatar: Asset | null;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    const options = AuthPlugin.options;

    if (options?.googleClientId) {
      config.authOptions.shopAuthenticationStrategy.push(
        new GoogleAuthenticationStrategy(options.googleClientId),
      );
    }

    config.customFields.Customer.push({
      name: "avatar",
      type: "relation",
      entity: Asset,
      nullable: true,
      readonly: true,
      label: [
        {
          languageCode: LanguageCode.en,
          value: "Avatar",
        },
      ],
    });
    return config;
  },
})
export class AuthPlugin {
  static options: GoogleAuthPluginOptions;

  static init(options: GoogleAuthPluginOptions) {
    this.options = options;
    return AuthPlugin;
  }
}
