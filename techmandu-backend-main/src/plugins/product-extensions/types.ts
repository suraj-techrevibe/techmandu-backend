export interface PluginInitOptions {}

declare module "@vendure/core/dist/entity/custom-entity-fields" {
  interface CustomProductFields {
    vendorBusinessName?: string;
    vendorName?: string;
  }

  interface CustomChannelFields {
    vendorBusinessName?: string;
    vendorName?: string;
  }
}

