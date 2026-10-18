import {
  Asset,
  LanguageCode,
  PluginCommonModule,
  Type,
  VendurePlugin,
} from "@vendure/core";

import { PROFILE_PICTURE_PLUGIN_OPTIONS } from "./constants";
import { PluginInitOptions } from "./types";
import { dpUploadController } from "./controller/profile-picture.controller";

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomCustomerFields {
    avatarUrl: any;
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    {
      provide: PROFILE_PICTURE_PLUGIN_OPTIONS,
      useFactory: () => ProfilePicturePlugin.options,
    },
  ],
  controllers: [dpUploadController],
  configuration: (config) => {
    config.customFields.Customer.push({
      name: "avatarUrl",
      list: false,
      type: "relation",
      entity: Asset,
      label: [
        {
          languageCode: LanguageCode.en,
          value: "Profile picture of customer",
        },
      ],
    });
    return config;
  },
  compatibility: "^3.0.0",
})
export class ProfilePicturePlugin {
  static options: PluginInitOptions;

  static init(options: PluginInitOptions): Type<ProfilePicturePlugin> {
    this.options = options;
    return ProfilePicturePlugin;
  }
}
