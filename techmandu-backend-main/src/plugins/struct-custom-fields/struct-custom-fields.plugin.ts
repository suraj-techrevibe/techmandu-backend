import {
  LanguageCode,
  PluginCommonModule,
  VendurePlugin,
} from '@vendure/core';

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: config => {
    config.customFields.Channel.push(
      {
        name: 'heroSection',
        list: true,
        type: 'struct',
        public: true,
        ui: { tab: 'Customize Store' },
        label: [{ languageCode: LanguageCode.en, value: 'Hero Section' }],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Customizable content for the homepage hero section',
          },
        ],
        fields: [
          {
            name: 'imageUrl',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Image' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Hero section background image or banner. Minimum recommended size: 1200x600px',
              },
            ],
            ui: { component: 'asset-url-selector' },
          },
          {
            name: 'tagline',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Top Tagline' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Short label text displayed above the heading (e.g., "Great Accessories")',
              },
            ],
          },
          {
            name: 'heading',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Main Heading' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Main heading text displayed in the hero section',
              },
            ],
          },
          {
            name: 'subtext',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Subtext' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Supporting description text shown below the heading',
              },
            ],
          },
          {
            name: 'buttonLabel',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Button Label' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Text shown inside the call-to-action button',
              },
            ],
          },
          {
            name: 'buttonUrl',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Button URL' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Target URL the button should navigate to',
              },
            ],
          },
        ],
      },
      {
        name: 'socialLinks',
        list: false,
        type: 'struct',
        public: true,
        ui: { tab: 'Customize Store' },
        label: [
          { languageCode: LanguageCode.en, value: 'Social Media Links' },
        ],
        description: [
          {
            languageCode: LanguageCode.en,
            value: 'Add links to your store\'s social media profiles so your customers can follow and connect with you.',
          },
        ],
        fields: [
          {
            name: 'facebook',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Facebook URL' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Link to your store\'s Facebook page (e.g., https://facebook.com/yourpage)',
              },
            ],
          },
          {
            name: 'instagram',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Instagram URL' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Link to your store\'s Instagram profile',
              },
            ],
          },
          {
            name: 'tiktok',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'TikTok URL' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Link to your TikTok profile if you post video content',
              },
            ],
          },
          {
            name: 'youtube',
            type: 'string',
            label: [
              { languageCode: LanguageCode.en, value: 'YouTube Channel URL' },
            ],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Link to your YouTube channel (if you publish videos)',
              },
            ],
          },
          {
            name: 'linkedin',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'LinkedIn URL' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Link to your business\'s LinkedIn page (optional)',
              },
            ],
          },
          {
            name: 'twitter',
            type: 'string',
            label: [{ languageCode: LanguageCode.en, value: 'Twitter (X) URL' }],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Link to your Twitter (X) profile',
              },
            ],
          },
          {
            name: 'whatsapp',
            type: 'string',
            label: [
              { languageCode: LanguageCode.en, value: 'WhatsApp Phone Number' },
            ],
            description: [
              {
                languageCode: LanguageCode.en,
                value: 'Enter your WhatsApp phone number (e.g., +14155552671). No spaces or dashes.',
              },
            ],
          },
        ],
      },
    );
    return config;
  },
})
export class StructCustomFieldsPlugin {
  // Plugin implementation
}