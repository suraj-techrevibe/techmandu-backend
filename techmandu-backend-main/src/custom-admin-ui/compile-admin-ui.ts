import { compileUiExtensions, setBranding } from '@vendure/ui-devkit/compiler';
import * as path from 'path';

import { OrderExportPlugin } from '@pinelab/vendure-plugin-order-export';
import { InvoicePlugin } from '../plugins/invoices/invoice.plugin';
import { BlogsPlugin } from '../plugins/blogs/blogs-plugin';
import { FulfillmentScanPlugin } from '../plugins/fulfillment-scan/fulfillment-scan.plugin';
import { PagePlugin } from '../plugins/pages/pages.plugin';
import { SellerRegistrationPlugin } from '../plugins/seller-registration/seller-registration.plugin';
import { ProductEnhancementsPlugin } from '../plugins/product-enhancements/product-enhancements.plugin';
import { NewsletterPlugin } from '../plugins/newsletter/newsletter.plugin';
import { LoyaltyPointsPlugin } from '../plugins/loyalty-points/loyalty-points.plugin';
import { AdminRolesPlugin } from '../plugins/admin-roles/admin-roles.plugin';
import { StockMonitoringPlugin } from '@pinelab/vendure-plugin-stock-monitoring';
import { BarcodePlugin } from '../plugins/barcode/barcode.plugin';
import { PriceBiddingPlugin } from '../plugins/price-bidding/price-bidding.plugin';
import { ReviewsPlugin } from '../plugins/reviews/reviews-plugin';
import { NcmPlugin } from '../plugins/ncm/plugin';
import { BusinessAccountPlugin } from '../plugins/business-account/business-account.plugin';
import { ContactPlugin } from '../plugins/contact/contact.plugin';

const ROOT_DIR =
  process.env.APP_ENV === 'dev'
    ? path.join(__dirname, '../../src/custom-admin-ui')
    : __dirname;

if (require.main === module) {
  // Called directly from command line
  customAdminUi({ recompile: true, devMode: false })
    .compile?.()
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('Error compiling admin UI:', err);
      process.exit(1);
    });
}

export function customAdminUi(options: {
  recompile: boolean;
  devMode: boolean;
}) {
  if (options.recompile) {
    return compileUiExtensions({
      outputPath: path.join(ROOT_DIR, './admin-ui'),
      extensions: [
        {
          translations: { en: path.join(__dirname, 'translations/en.json') },
          globalStyles: path.join(ROOT_DIR, 'styles.scss'),
        },


        OrderExportPlugin.ui,
        BlogsPlugin.ui,
        PagePlugin.ui,
        NcmPlugin.ui,
        InvoicePlugin.ui,
        FulfillmentScanPlugin.ui,
        SellerRegistrationPlugin.ui,
        ProductEnhancementsPlugin.ui,
        NewsletterPlugin.ui,
        LoyaltyPointsPlugin.ui,
        AdminRolesPlugin.ui,
        StockMonitoringPlugin.ui,
        BarcodePlugin.ui,
        PriceBiddingPlugin.ui,
        ReviewsPlugin.uiExtensions,
        BusinessAccountPlugin.ui,
        ContactPlugin.ui,
        setBranding({
          // The small logo appears in the top left of the screen
          //smallLogoPath: path.join(__dirname, "images/maipic-ai.png"),
          // The large logo is used on the login page
          //largeLogoPath: path.join(__dirname, "images/maipic-ai.png"),
          faviconPath: path.join(__dirname, 'icon.png'),
        }),
      ],
      devMode: options.devMode,
    });
  } else {
    return {
      path:
        process.env.ADMIN_UI_PATH ||
        path.join(ROOT_DIR, './admin-ui/dist/browser'),
    };
  }
}
