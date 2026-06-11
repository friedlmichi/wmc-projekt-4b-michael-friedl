import { auth } from './auth.svelte.js';
import { dict } from '../i18n/dict.js';

export const i18n = new class {

    get lang() {
        return auth.user?.language || 'de';
    }

    t(key) {
        return dict[this.lang]?.[key] || key;
    }
}
