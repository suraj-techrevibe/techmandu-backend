import { CrudPermissionDefinition } from '@vendure/core';

export const PAGE_PLUGIN_OPTIONS = Symbol('PAGE_PLUGIN_OPTIONS');
export const loggerCtx = 'PagePlugin';

export const pagePermission = new CrudPermissionDefinition('Page');
