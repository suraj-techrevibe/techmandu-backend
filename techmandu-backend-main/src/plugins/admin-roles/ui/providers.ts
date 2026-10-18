import { addNavMenuItem } from '@vendure/admin-ui/core';
export default [

    addNavMenuItem(
        {
            id: 'roles',
            label: 'Roles',
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadRoleUi"),
            routerLink: ['/settings/roles'],
            icon: 'pencil',
        },
        'settings',
    ),

    addNavMenuItem(
        {
            id: 'my-store',
            label: 'My Store',
            routerLink: ['/extensions/seller/store-redirect'],
            icon: 'shopping-bag',
        },
        'settings',
    ),

    addNavMenuItem(
        {
            id: 'channels',
            label: 'Channels',
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadChannelUi"),
            routerLink: ['/settings/channels'],
            icon: 'pencil',
        },
        'settings',
    ),

    addNavMenuItem(
        {
            id: "sellers",
            label: "Sellers",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadSellerUi"),
            routerLink: ["/settings/sellers"],
            icon: "store",
        },
        "settings"
    ),
    addNavMenuItem(
        {
            id: "countries",
            label: "Countries",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadCountryUi"),
            routerLink: ["/settings/countries"],
            icon: "flag",
        },
        "settings"
    ),
    addNavMenuItem(
        {
            id: "tax-rates",
            label: "Tax rates",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadTaxRateUi"),
            routerLink: ["/settings/tax-rates"],
            icon: "bank",
        },
        "settings"
    ),
    addNavMenuItem(
        {
            id: "zones",
            label: "Zones",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadZoneUi"),
            routerLink: ["/settings/zones"],
            icon: "network-globe",
        },
        "settings"
    ),
    addNavMenuItem(
        {
            id: "tax-categories",
            label: "Tax categories",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadTaxCategoryUi"),
            routerLink: ["/settings/tax-categories"],
            icon: "bank",
        },
        "settings"
    ),
    addNavMenuItem(
        {
            id: "stock-locations",
            label: "Stock locations",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadStockLocationUi"),
            routerLink: ["/settings/stock-locations"],
            icon: "map-marker",
        },
        "settings"
    ),

    addNavMenuItem(
        {
            id: "shipping-methods",
            label: "Shipping methods",
            requiresPermission:(userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadShippingMethodUi"),
            routerLink: ["/settings/shipping-methods"],
            icon: "map-marker",
        },
        "settings"
    ),

    //Adminstrators
    addNavMenuItem(
        {
            id: "administrators",
            label: "Administrators",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadAdministratorUi"),
            routerLink: ["/settings/administrators"],
            icon: "user-shield",
        },
        "settings"
    ),

    //Payment Methods
    addNavMenuItem(
        {
            id: "payment-methods",
            label: "Payment Methods",
            requiresPermission: (userPermissions: string[]) =>
                userPermissions.includes("SuperAdmin") ||
                userPermissions.includes("ReadPaymentMethodUi"),
            routerLink: ["/settings/payment-methods"],
            icon: "credit-card",
        },
        "settings"
    ),

];
