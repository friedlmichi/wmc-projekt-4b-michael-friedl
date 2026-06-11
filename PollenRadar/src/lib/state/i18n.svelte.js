import { auth } from './auth.svelte.js';
import { dict } from '../i18n/dict.js';

export const i18n = new class {
    // We derive the current language from the auth state.
    // If not logged in or no language set, we default to 'de'.
    get lang() {
        return auth.user?.language || 'de';
    }

    t(key) {
        // Fallback to the key itself if translation is missing
        return dict[this.lang]?.[key] || key;
    }
}
