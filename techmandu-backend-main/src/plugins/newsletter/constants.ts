import { PermissionDefinition } from '@vendure/core';

export const NEWSLETTER_PLUGIN_OPTIONS = Symbol('NEWSLETTER_PLUGIN_OPTIONS');
export const loggerCtx = 'NewsletterPlugin';

export const MANAGE_NEWSLETTER_PERMISSION = new PermissionDefinition({
    name: 'ManageNewsletter',
    description: 'Allows staff to manage newsletter subscribers.',
});