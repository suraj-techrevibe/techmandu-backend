import { CrudPermissionDefinition } from '@vendure/core';

export const CONTACT_PLUGIN_OPTIONS = Symbol('CONTACT_PLUGIN_OPTIONS');
export const loggerCtx = 'ContactPlugin';

export const contactPermission = new CrudPermissionDefinition('Contact');
