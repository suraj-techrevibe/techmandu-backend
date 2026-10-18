/**
 * @description
 * Configuration options available when initializing the Newsletter plugin.
 */
export interface PluginInitOptions {
    /**
     * @description
     * Allow duplicate email addresses to be stored. By default duplicates are skipped.
     */
    allowDuplicateEmail?: boolean;
}

export interface ResolvedNewsletterPluginOptions {
    allowDuplicateEmail: boolean;
}

export const defaultPluginInitOptions: ResolvedNewsletterPluginOptions = {
    allowDuplicateEmail: false,
};