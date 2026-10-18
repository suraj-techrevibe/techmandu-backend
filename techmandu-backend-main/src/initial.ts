import { LanguageCode, Permission } from "@vendure/common/lib/generated-types";
import { InitialData } from "@vendure/core";

export const initialData: InitialData = {
  defaultLanguage: LanguageCode.en,
  defaultZone: "Asia",
  roles: [
    {
      code: "administrator",
      description: "Administrator",
      permissions: [
        Permission.CreateCatalog,
        Permission.ReadCatalog,
        Permission.UpdateCatalog,
        Permission.DeleteCatalog,
        Permission.CreateSettings,
        Permission.ReadSettings,
        Permission.UpdateSettings,
        Permission.DeleteSettings,
        Permission.CreateCustomer,
        Permission.ReadCustomer,
        Permission.UpdateCustomer,
        Permission.DeleteCustomer,
        Permission.CreateCustomerGroup,
        Permission.ReadCustomerGroup,
        Permission.UpdateCustomerGroup,
        Permission.DeleteCustomerGroup,
        Permission.CreateOrder,
        Permission.ReadOrder,
        Permission.UpdateOrder,
        Permission.DeleteOrder,
        Permission.CreateSystem,
        Permission.ReadSystem,
        Permission.UpdateSystem,
        Permission.DeleteSystem,
      ],
    },
    {
      code: "order-manager",
      description: "Order manager",
      permissions: [
        Permission.CreateOrder,
        Permission.ReadOrder,
        Permission.UpdateOrder,
        Permission.DeleteOrder,
        Permission.ReadCustomer,
        Permission.ReadPaymentMethod,
        Permission.ReadShippingMethod,
        Permission.ReadPromotion,
        Permission.ReadCountry,
        Permission.ReadZone,
      ],
    },
    {
      code: "inventory-manager",
      description: "Inventory manager",
      permissions: [
        Permission.CreateCatalog,
        Permission.ReadCatalog,
        Permission.UpdateCatalog,
        Permission.DeleteCatalog,
        Permission.CreateTag,
        Permission.ReadTag,
        Permission.UpdateTag,
        Permission.DeleteTag,
        Permission.ReadCustomer,
      ],
    },
  ],
  taxRates: [
    { name: "Standard Tax", percentage: 20 },
    { name: "Reduced Tax", percentage: 10 },
    { name: "Zero Tax", percentage: 0 },
  ],
  shippingMethods: [
    { name: "Standard Shipping", price: 500 },
    { name: "Express Shipping", price: 1000 },
  ],
  paymentMethods: [
    {
      name: "Dummy Payment",
      handler: {
        code: "dummy-payment-handler",
        arguments: [{ name: "automaticSettle", value: "false" }],
      },
    },
  ],
  collections: [
    {
      name: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Technology"],
            containsAny: false,
          },
        },
      ],
    },

    {
      name: "Computers",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Computers"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Laptops",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Laptops"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Monitors",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Monitors"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Desktop & iMacs",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Desktop", "iMacs"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Keyboards & Mouse",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Keyboard", "Mouse"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Computer Accessories",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: [
              "Computer Accessories",
              "Keyboard",
              "Mouse",
              "Monitors",
            ],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "USB, SD, & Hard Drives",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["USB", "SD", "Hard Drives"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Laptop Bags & Sleeves",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Laptop Bags", "Sleeves"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Gaming",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Gaming"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "MacBook",
      parentName: "Computers",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["MacBook"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Mobile Phones",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Mobile Phones"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "iPhone",
      parentName: "Mobile Phones",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["iPhone", "Phones"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Samsung Galaxy Phones",
      parentName: "Mobile Phones",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Samsung", "Galaxy", "Phones"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Google Pixel Phones",
      parentName: "Mobile Phones",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Google Pixel", "Phones"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Shop All Phones",
      parentName: "Mobile Phones",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Phones"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Mobile Accessories",
      parentName: "Mobile Phones",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: [
              "Mobile Accessories",
              "Powerbanks",
              "Headphones",
              "Earbuds",
              "Airpods",
              "Charger",
              "Battery",
            ],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "iPads & Tablets",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["iPads", "Tablets"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "iPads",
      parentName: "iPads & Tablets",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["iPads", "Tablets"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Tablet Cases & Accessories",
      parentName: "iPads & Tablets",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Tablet Cases", "Accessories"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Tech Services",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Tech Services"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Trade-in Your Tech",
      parentName: "Tech Services",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Trade-in Your Tech"], containsAny: true },
        },
      ],
    },
    {
      name: "Geeks2U",
      parentName: "Tech Services",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Geeks2U"], containsAny: true },
        },
      ],
    },
    {
      name: "NTC / Ncell Sims",
      parentName: "Tech Services",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Sim", "NTC", "Ncell"], containsAny: true },
        },
      ],
    },

    {
      name: "Audio & Visual",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Audio & Visual"], containsAny: true },
        },
      ],
    },
    {
      name: "Headphones & Earphones",
      parentName: "Audio & Visual",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Headphones", "Earbuds", "Airpods"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "TVs & Streaming",
      parentName: "Audio & Visual",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["TV", "Streaming"], containsAny: true },
        },
      ],
    },
    {
      name: "Speakers & Microphones",
      parentName: "Audio & Visual",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Speaker", "Microphone"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Cameras",
      parentName: "Audio & Visual",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Camera"], containsAny: true },
        },
      ],
    },
    {
      name: "Projectors",
      parentName: "Audio & Visual",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Projector"], containsAny: true },
        },
      ],
    },
    {
      name: "Gaming Consoles",
      parentName: "Audio & Visual",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Console"], containsAny: true },
        },
      ],
    },

    {
      name: "Smart Tech",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Smart Tech"], containsAny: true },
        },
      ],
    },
    {
      name: "Internet & WiFi",
      parentName: "Smart Tech",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Router", "Wi-Fi"], containsAny: true },
        },
      ],
    },
    {
      name: "Security Cameras",
      parentName: "Smart Tech",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Security Cameras"], containsAny: true },
        },
      ],
    },
    {
      name: "Smart Home",
      parentName: "Smart Tech",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Smart Home"], containsAny: true },
        },
      ],
    },

    {
      name: "Fitness & Health",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Fitness & Health"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Smart Watches",
      parentName: "Fitness & Health",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Smart Watch"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Fitness Trackers",
      parentName: "Fitness & Health",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Fitness Trackers"], containsAny: true },
        },
      ],
    },
    {
      name: "Health Tech",
      parentName: "Fitness & Health",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Health Tech"], containsAny: true },
        },
      ],
    },

    {
      name: "Ink & Toner",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Ink", "Toner"], containsAny: true },
        },
      ],
    },
    {
      name: "Shop All Ink & Toner",
      parentName: "Ink & Toner",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Ink", "Toner"], containsAny: true },
        },
      ],
    },
    {
      name: "Ink & Toner Finder",
      parentName: "Ink & Toner",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Ink", "Toner"], containsAny: true },
        },
      ],
    },

    {
      name: "Home & Office Equipment",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Home & Office Equipment"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Printers",
      parentName: "Home & Office Equipment",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Printer"], containsAny: true },
        },
      ],
    },
    {
      name: "Scanners",
      parentName: "Home & Office Equipment",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Scanner"], containsAny: true },
        },
      ],
    },
    {
      name: "Shredders",
      parentName: "Home & Office Equipment",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Shredder"], containsAny: true },
        },
      ],
    },
    {
      name: "POS & Mobile Payments",
      parentName: "Home & Office Equipment",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["POS", "Mobile Payment"],
            containsAny: true,
          },
        },
      ],
    },
    {
      name: "Appliances",
      parentName: "Home & Office Equipment",
      filters: [
        {
          code: "facet-value-filter",
          args: { facetValueNames: ["Appliance"], containsAny: true },
        },
      ],
    },
    {
      name: "Cables & Power",
      parentName: "Technology",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Cables & Power"],
            containsAny: true,
          },
        },
      ],
    },

    {
      name: "Cables",
      parentName: "Cables & Power",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Cable"],
            containsAny: true,
          },
        },
      ],
    },

    {
      name: "Chargers",
      parentName: "Cables & Power",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Charger"],
            containsAny: true,
          },
        },
      ],
    },

    {
      name: "Powerbanks",
      parentName: "Cables & Power",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Powerbanks"],
            containsAny: true,
          },
        },
      ],
    },

    {
      name: "Batteries",
      parentName: "Cables & Power",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Battery"],
            containsAny: true,
          },
        },
      ],
    },

    {
      name: "Power Supplies",
      parentName: "Cables & Power",
      filters: [
        {
          code: "facet-value-filter",
          args: {
            facetValueNames: ["Power Supplies"],
            containsAny: true,
          },
        },
      ],
    },
  ],
  countries: [{ name: "Nepal", code: "NP", zone: "Asia" }],
};
