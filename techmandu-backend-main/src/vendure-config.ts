import {
  dummyPaymentHandler,
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  VendureConfig,
  LanguageCode,
  DefaultAssetNamingStrategy,
  NativeAuthenticationStrategy,
  configureDefaultOrderProcess,
  DefaultGuestCheckoutStrategy,
  DefaultSchedulerPlugin,
  defaultPromotionConditions,
  defaultPromotionActions,
  Asset,
  LanguageNotAvailableError,
  ProductVariantService,
  DefaultLogger,
  LogLevel,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import {
  AssetServerPlugin,
  configureS3AssetStorage,
  SharpAssetPreviewStrategy,
} from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import 'dotenv/config';
import { customAdminUi } from './custom-admin-ui/compile-admin-ui';
import { OrderExportPlugin } from '@pinelab/vendure-plugin-order-export';
import { PopularityScoresPlugin } from '@pinelab/vendure-plugin-popularity-scores';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
// import { ElasticsearchPlugin } from '@vendure/elasticsearch-plugin';
import path from 'path';
import { InvoicePlugin, LocalFileStrategy } from './plugins/invoices';
import { NcmPlugin } from './plugins/ncm/plugin';
import { KhaltiPaymentPlugin } from './plugins/khalti/khalti-plugin';
import { BlogsPlugin } from './plugins/blogs/blogs-plugin';
import { FulfillmentScanPlugin } from './plugins/fulfillment-scan/fulfillment-scan.plugin';
import { AddressExtensionsPlugin } from './plugins/address-extensions/address-extensions.plugin';
import { CustomerBankDetailsPlugin } from './plugins/customer-bank-details/customer-bank-details.plugin';
import { BusinessAccountPlugin } from './plugins/business-account/business-account.plugin';
import { emailHandlerExtensions } from './plugins/email-handler-extensions';
import { PagePlugin } from './plugins/pages/pages.plugin';
import { ProductExtensionsPlugin } from './plugins/product-extensions/product-extensions.plugin';
import { ProductEnhancementsPlugin } from './plugins/product-enhancements/product-enhancements.plugin';
import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import { StructCustomFieldsPlugin } from './plugins/struct-custom-fields/struct-custom-fields.plugin';

import { SellerRegistrationPlugin } from './plugins/seller-registration/seller-registration.plugin';
import { DiscountPlugin } from './plugins/discount/discount.plugin';
import { NewsletterPlugin } from './plugins/newsletter/newsletter.plugin';
import { KhaltiPlugin } from './plugins/khalti-v2/khalti.plugin';
import { PaymentExtensionPlugin } from './plugins/payment-extension/payment-extension.plugin';
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';
import { LoyaltyPointsPlugin } from './plugins/loyalty-points/loyalty-points.plugin';
import { customerLoyaltyMinPoints } from './plugins/loyalty-points/conditions/loyalty-conditions';
import { orderDiscountPerLoyaltyPoint } from './plugins/loyalty-points/actions/loyalty-actions';
import { DarazFulfillmentHandler } from './plugins/loyalty-points/fullfillment-handler';

import { sellerRegistrationVerifiedEmailHandler } from './plugins/seller-registration/email/seller-registration-verified.handler';
import { ChannelOverridePlugin } from './plugins/channel-override/channel-override.plugin';
import { AdminRolesPlugin } from './plugins/admin-roles/admin-roles.plugin';
import { QrPaymentPlugin } from './plugins/qr-payment/qr-payment.plugin';
import { qrPaymentHandler } from './plugins/qr-payment/payment-handler/static-qr-payment.handler';
import { BarcodePlugin } from './plugins/barcode/barcode.plugin';
import { StockMonitoringPlugin } from '@pinelab/vendure-plugin-stock-monitoring';
import { PriceBiddingPlugin } from './plugins/price-bidding/price-bidding.plugin';
import { newBidAmountEmailHandler } from './plugins/price-bidding/email-handler/new-bid-amount.handler';
import { productCreatedEmailHandler } from './plugins/price-bidding/email-handler/product-created.handler';
import { OrderTrackingPlugin } from './plugins/order-tracking/order-tracking.plugin';
import {
  ReadAdministratorUiPermission,
  ReadChannelUiPermission,
  ReadCountryUiPermission,
  ReadPaymentMethodUiPermission,
  ReadRoleUiPermission,
  ReadSellerUiPermission,
  ReadShippingMethodUiPermission,
  ReadStockLocationUiPermission,
  ReadTaxCategoryUiPermission,
  ReadTaxRateUiPermission,
  ReadZoneUiPermission,
} from './plugins/admin-roles/permissions/ui-permission';
import { ReviewsPlugin } from './plugins/reviews/reviews-plugin';
import { ProductReview } from './plugins/reviews/entities/product-review.entity';
import { ProductOnSalePlugin } from './plugins/product-on-sale/product-on-sale.plugin';
import { WishlistPlugin } from './plugins/wishlist/wishlist.plugin';
import { ProfilePicturePlugin } from './plugins/profile-picture/profile-picture.plugin';
import { ContactPlugin } from './plugins/contact/contact.plugin';
import { AuthPlugin } from './plugins/google-auth/plugin';
import { NavbarCollectionPlugin } from './plugins/navbar-collection/navbar-collection.plugin';
import { ProductVariantQuantitySoldPlugin } from './plugins/product-variant-quantity-sold/product-variant-quantity-sold.plugin';
import { AccountDeletionPlugin } from './plugins/account-deletion/account-deletion.plugin';
import { QuestionAnswerPlugin } from './plugins/question-answer/question-answer.plugin';
import { ShippingPlugin } from './plugins/shipping/shipping.plugin';
import { CellpayPlugin } from './plugins/cellpay/cellpay.plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
const UI_DEV = process.env.UI_ENV === 'dev';
// const IS_EMAIL_DEV = process.env.EMAIL_ENV === '';

const IS_EMAIL_DEV = false;
const trustProxyEnv = process.env.TRUST_PROXY;
const trustProxyValue = (() => {
  if (trustProxyEnv === undefined) {
    return IS_DEV ? false : 1;
  }
  if (trustProxyEnv === 'true') {
    return true;
  }
  if (trustProxyEnv === 'false') {
    return false;
  }
  const numeric = Number(trustProxyEnv);
  return Number.isNaN(numeric) ? trustProxyEnv : numeric;
})();

const serverPort = +process.env.PORT! || 3000;
const serverUrl = process.env.SERVER_URL;

declare module '@vendure/core/dist/entity/custom-entity-fields' {
  interface CustomProductVariantFields {
    variantSerialCode: string;
    specification: any;
    return: string;
  }
}

export const config: VendureConfig = {
  logger: new DefaultLogger({ level: IS_DEV ? LogLevel.Debug : LogLevel.Info }),
  promotionOptions: {
    promotionConditions: [
      ...defaultPromotionConditions,
      customerLoyaltyMinPoints,
    ],
    promotionActions: [
      ...defaultPromotionActions,
      orderDiscountPerLoyaltyPoint,
    ],
  },
  assetOptions: {
    uploadMaxFileSize: 104857600,
  },
  apiOptions: {
    port: 3000,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    // @ts-ignore
    trustProxy: trustProxyValue,
    adminListQueryLimit: Number.MAX_SAFE_INTEGER,

    // The following options are useful in development mode,
    // but are best turned off for production for security   reasons.

    adminApiPlayground: { settings: { 'request.credentials': 'include' } },
    adminApiDebug: true,
    shopApiPlayground: {
      settings: { 'request.credentials': 'include' },
    },
    shopApiDebug: true,
  },
  authOptions: {
    customPermissions: [
      ReadRoleUiPermission,
      ReadChannelUiPermission,
      ReadSellerUiPermission,
      ReadCountryUiPermission,
      ReadTaxRateUiPermission,
      ReadZoneUiPermission,
      ReadTaxCategoryUiPermission,
      ReadStockLocationUiPermission,
      ReadShippingMethodUiPermission,
      ReadAdministratorUiPermission,
      ReadPaymentMethodUiPermission,
    ],
    requireVerification: true,
    shopAuthenticationStrategy: [new NativeAuthenticationStrategy()],
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: String(process.env.SUPERADMIN_USERNAME),
      password: String(process.env.SUPERADMIN_PASSWORD),
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET,
    },
  },
  dbConnectionOptions: {
    type: 'postgres',
    // See the README.md "Migrations" section for an explanation of
    // the `synchronize` and `migrations` options.
    synchronize: true,
    migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
    logging: false,
    database: process.env.DB_NAME,
    schema: process.env.DB_SCHEMA,
    host: process.env.DB_HOST,
    port: +Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  // shippingOptions:{
  //   fulfillmentHandlers:[DarazFulfillmentHandler]
  // },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler, qrPaymentHandler],
  },
  orderOptions: {
    guestCheckoutStrategy: new DefaultGuestCheckoutStrategy({
      allowGuestCheckouts: true,
      allowGuestCheckoutForRegisteredCustomers: false,
    }),
    process: [
      configureDefaultOrderProcess({
        checkModificationPayments: false,
        arrangingPaymentRequiresCustomer: false,
        arrangingPaymentRequiresShipping: false,
        arrangingPaymentRequiresContents: false,
        checkPaymentsCoverTotal: false,
        checkAllItemsBeforeCancel: false,
      }),
    ],
  },
  // When adding or altering custom field definitions, the database will
  // need to be updated. See the "Migrations" section in README.md.
  customFields: {
    Product: [
      {
        name: 'vendorBusinessName',
        type: 'string',
        public: true,
        readonly: true,
        label: [
          { languageCode: LanguageCode.en, value: 'Vendor Business Name' },
        ],
      },
      {
        name: 'vendorName',
        type: 'string',
        public: true,
        readonly: true,
        label: [{ languageCode: LanguageCode.en, value: 'Vendor Name' }],
      },
      {
        name: 'youtubeVideoLink',
        type: 'string',
        public: true,
        ui: { component: 'text-form-input' },
      },
      {
        name: 'reviewRating',
        label: [{ languageCode: LanguageCode.en, value: 'Review rating' }],
        public: true,
        nullable: true,
        type: 'float',
        ui: { tab: 'Reviews', component: 'star-rating-form-input' },
      },
      {
        name: 'reviewCount',
        label: [{ languageCode: LanguageCode.en, value: 'Review count' }],
        public: true,
        defaultValue: 0,
        type: 'float',
        ui: { tab: 'Reviews', component: 'review-count-link' },
      },
      {
        name: 'featuredReview',
        label: [{ languageCode: LanguageCode.en, value: 'Featured review' }],
        public: true,
        type: 'relation',
        entity: ProductReview,
        ui: { tab: 'Reviews', component: 'review-selector-form-input' },
      },
      {
        name: 'isFeatured',
        label: [
          { languageCode: LanguageCode.en, value: 'Is product featured' },
        ],
        type: 'boolean',
        defaultValue: false,
      },
    ],
    ProductVariant: [
      {
        name: 'stockWarningThreshold',
        type: 'int',
        public: false,
        label: [
          { languageCode: LanguageCode.en, value: 'Stock Warning Threshold' },
        ],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Send email when stock drops to or below this level',
          },
        ],
        defaultValue: 0,
      },
      {
        name: 'specification',
        type: 'struct',
        list: true,
        label: [{ languageCode: LanguageCode.en, value: 'Specification' }],
        fields: [
          {
            name: 'key',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Key' }],
          },
          {
            name: 'value',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Value' }],
          },
          {
            name: 'isPinned',
            type: 'boolean',
            label: [{ languageCode: LanguageCode.en, value: 'Is Pinned' }],
          },
        ],
      },
      {
        name: 'return',
        type: 'text',
        ui: { component: 'rich-text-form-input' },
        label: [{ languageCode: LanguageCode.en, value: 'Return Policy' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Return policy details',
          },
        ],
      },
    ],
    Channel: [
      {
        name: "signupBonus",
        type: "int",
        label: [{ languageCode: LanguageCode.en, value: "Signup Bonus" }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: "Tech coins rewarded to customer on signup",
          },
        ],
      },
      {
        name: "orderBonus",
        type: "struct",
        list: true,
        fields: [
          {
            name: "name",
            type: "string",
            label: [{ languageCode: LanguageCode.en, value: "Name" }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: "Name of bonus",
              },
            ],
          },
          {
            name: "minOrderValue",
            type: "int",
            label: [
              { languageCode: LanguageCode.en, value: "Minimum order value" },
            ],
            description: [
              {
                languageCode: LanguageCode.en,
                value: "Minimum value to be in placed order",
              },
            ],
          },
          {
            name: "maxOrderValue",
            type: "int",
            label: [
              { languageCode: LanguageCode.en, value: "Maximum order value" },
            ],
            description: [
              {
                languageCode: LanguageCode.en,
                value: "Maximum value to be in placed order",
              },
            ],
          },
          {
            name: "coins",
            type: "int",
            label: [{ languageCode: LanguageCode.en, value: "Coins" }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: "Tech coins awarded in this bonus",
              },
            ],
          },
          {
            name: "rewardInterval",
            type: "int",
            label: [{ languageCode: LanguageCode.en, value: "Reward Per Amount" }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: "Reward interval",
              },
            ],
          },
          {
            name: "description",
            type: "string",
            label: [{ languageCode: LanguageCode.en, value: "Description" }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: "Description",
              },
            ],
          },
        ],
        label: [
          {
            languageCode: LanguageCode.en,
            value: "Order Bonus",
          },
        ],
      },
    ],
    GlobalSettings: [
      {
        name: 'thresholdWarningEmail',
        type: 'string',
        public: false,
        label: [
          { languageCode: LanguageCode.en, value: 'Low Stock Warning Email' },
        ],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Email address to receive low stock alerts',
          },
        ],
      },
    ],
  },
  plugins: [
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      namingStrategy: new DefaultAssetNamingStrategy(),
      previewStrategy: new SharpAssetPreviewStrategy(),
      storageStrategyFactory: !IS_DEV
        ? configureS3AssetStorage({
          bucket: String(process.env.AWS_BUCKET),
          credentials: {
            accessKeyId: String(process.env.AWS_ACCESS_KEY_ID),
            secretAccessKey: String(process.env.AWS_SECRET_ACCESS_KEY),
          },
          nativeS3Configuration: {
            endpoint: String(process.env.AWS_ENDPOINT),
            s3ForcePathStyle: true,
            region: String(process.env.AWS_REGION),
          },
        })
        : undefined,
      assetUrlPrefix: !IS_DEV ? `${process.env.SERVER_URL}/assets/` : undefined,
    }),
    DefaultSchedulerPlugin,

    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    // ElasticsearchPlugin.init({
    //   host: process.env.ELASTIC_URL,
    //   port: 443,
    //
    //   clientOptions: {
    //     node: process.env.ELASTIC_URL,
    //     auth: {
    //       username: process.env.ELASTIC_USERNAME!,
    //       password: process.env.ELASTIC_PASSWORD!,
    //     },
    //     ssl: {
    //       rejectUnauthorized: false,
    //     },
    //   },
    //
    //   connectionAttempts: 5,
    //   connectionAttemptInterval: 3000,
    //   customProductVariantMappings: {
    //     discount: {
    //       graphQlType: 'Int',
    //       valueFn: async (variant, _languageCode, _injector, _ctx) => {
    //         const variantPriceService = _injector.get(ProductVariantService);
    //         const prices = await variantPriceService.getProductVariantPrices(
    //           _ctx,
    //           variant.id,
    //         );
    //
    //         return prices.reduce((maxDiscount, price) => {
    //           const discountAmount = price.customFields.discountPrice;
    //           return discountAmount > maxDiscount
    //             ? discountAmount
    //             : maxDiscount;
    //         }, 0);
    //       },
    //     },
    //   },
    //   indexMappingProperties: {
    //     'variant-discount': {
    //       type: 'integer',
    //     },
    //   },
    // }),

    EmailPlugin.init({
      ...(IS_EMAIL_DEV
        ? {
          devMode: true,
          outputPath: path.join(__dirname, '../static/email/test-emails'),
          route: 'mailbox',
        }
        : {
          transport: {
            type: 'smtp',
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false,
            // tls: true,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          },
        }),
      handlers: [
        ...defaultEmailHandlers,
        ...emailHandlerExtensions,
        sellerRegistrationVerifiedEmailHandler,
        newBidAmountEmailHandler,
        productCreatedEmailHandler,
      ],
      templatePath: path.join(__dirname, '../static/email/templates'),

      globalTemplateVars: {
        // The following variables will change depending on your storefront implementation.
        // Here we are assuming a storefront running at http://localhost:8080.
        fromAddress: process.env.SMTP_FROM_EMAIL,
        verifyEmailAddressUrl: process.env.VERIFY_EMAIL_URL,
        passwordResetUrl: process.env.PASSWORD_RESET_URL,
        changeEmailAddressUrl: process.env.CHANGE_EMAIL_URL,
      },
    }),
    AddressExtensionsPlugin,
    CustomerBankDetailsPlugin,
    BusinessAccountPlugin,
    PopularityScoresPlugin.init({
      endpointSecret: 'test',
      productFieldUiTab: 'Scores',
      collectionFieldUiTab: 'Scores',
    }),
    AdminUiPlugin.init({
      adminUiConfig: {
        brand: 'Techmandu',
        hideVersion: true,
        hideVendureBranding: true,
      },
      route: 'admin',
      port: 3002,
      app: customAdminUi({ devMode: UI_DEV, recompile: UI_DEV }),
    }),
    OrderExportPlugin.init({
      exportStrategies: [],
    }),
    InvoicePlugin.init({
      vendureHost: serverUrl || `http://localhost:${serverPort}`,
      storageStrategy: new LocalFileStrategy(),
    }),
    NcmPlugin,
    KhaltiPaymentPlugin,
    PagePlugin,
    BlogsPlugin,
    FulfillmentScanPlugin,
    ProductExtensionsPlugin.init({}),
    ProductEnhancementsPlugin,
    SellerRegistrationPlugin.init({}),
    DiscountPlugin,
    NavbarCollectionPlugin,
    NewsletterPlugin.init({}),
    StructCustomFieldsPlugin,
    GraphiqlPlugin.init(),
    StripePlugin.init({
      storeCustomersInStripe: true,
    }),
    LoyaltyPointsPlugin.init({}),
    ChannelOverridePlugin.init({}),
    AdminRolesPlugin.init({}),
    QrPaymentPlugin.init({}),
    BarcodePlugin.init({}),
    // StockMonitoringPlugin.init({
    // threshold: 10,
    // }),
    PriceBiddingPlugin.init({}),
    OrderTrackingPlugin,
    ReviewsPlugin,
    ProductOnSalePlugin,
    WishlistPlugin,
    ProfilePicturePlugin,
    ContactPlugin.init({}),
    AuthPlugin.init({
      googleClientId: process.env.GOOGLE_CLIENT_ID as string,
    }),
    ProductVariantQuantitySoldPlugin.init({}),
    AccountDeletionPlugin,
    QuestionAnswerPlugin.init({}),
    ShippingPlugin,
  ],
};
