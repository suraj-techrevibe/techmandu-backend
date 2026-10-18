import { Permission } from "@vendure/core";

export const SELLER_REGISTRATION_PLUGIN_OPTIONS = Symbol('SELLER_REGISTRATION_PLUGIN_OPTIONS');
export const loggerCtx = 'SellerRegistrationPlugin';
const fundamentalPermissions = [
    Permission.CreateCatalog,
    Permission.ReadCatalog,
    Permission.UpdateCatalog,
    Permission.DeleteCatalog,

    Permission.CreateSettings,
    Permission.ReadSettings,
    Permission.UpdateSettings,
    Permission.DeleteSettings,

    Permission.CreateAdministrator,
    Permission.ReadAdministrator,
    Permission.UpdateAdministrator,
    Permission.DeleteAdministrator,

    Permission.CreateAsset,
    Permission.ReadAsset,
    Permission.UpdateAsset,
    Permission.DeleteAsset,

    Permission.CreateChannel,
    Permission.ReadChannel,
    Permission.UpdateChannel,

    Permission.CreateCollection,
    Permission.ReadCollection,
    Permission.UpdateCollection,
    Permission.DeleteCollection,

    Permission.ReadCountry,
    Permission.UpdateCountry,

    Permission.CreateFacet,
    Permission.ReadFacet,
    Permission.UpdateFacet,
    Permission.DeleteFacet,

    Permission.CreateOrder,
    Permission.ReadOrder,
    Permission.UpdateOrder,
    Permission.DeleteOrder,

    Permission.CreatePaymentMethod,
    Permission.ReadPaymentMethod,
    Permission.UpdatePaymentMethod,
    Permission.DeletePaymentMethod,

    Permission.CreateProduct,
    Permission.ReadProduct,
    Permission.UpdateProduct,
    Permission.DeleteProduct,



    Permission.ReadShippingMethod,
    Permission.CreateShippingMethod,
    Permission.UpdateShippingMethod,
    Permission.DeleteShippingMethod,

    Permission.CreateTag,
    Permission.ReadTag,
    Permission.UpdateTag,
    Permission.DeleteTag,

    Permission.CreateTaxCategory,
    Permission.ReadTaxCategory,
    Permission.UpdateTaxCategory,
    Permission.DeleteTaxCategory,

    Permission.CreateTaxRate,
    Permission.ReadTaxRate,
    Permission.UpdateTaxRate,
    Permission.DeleteTaxRate,

    Permission.CreateSeller,
    Permission.ReadSeller,
    Permission.UpdateSeller,
    Permission.DeleteSeller,

    Permission.CreateStockLocation,
    Permission.ReadStockLocation,
    Permission.UpdateStockLocation,
    Permission.DeleteStockLocation,

    // Permission.ReadSystem,

    Permission.CreateZone,
    Permission.ReadZone,
    Permission.UpdateZone,
    Permission.DeleteZone,


    Permission.CreateCustomer,
    Permission.ReadCustomer,
    Permission.UpdateCustomer,
    Permission.DeleteCustomer,

    Permission.ReadChannel,

    Permission.ReadCountry,

    Permission.CreateCustomerGroup,
    Permission.UpdateCustomerGroup,
    Permission.DeleteCustomerGroup,
    Permission.ReadCustomerGroup,
    
    Permission.ReadPromotion,
    Permission.CreatePromotion,
    Permission.UpdatePromotion,
    Permission.DeletePromotion,

];

export const SellerPermissions = [
    ...fundamentalPermissions
];