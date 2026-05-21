// Svelte 5 Shared Rune for Global User State
import { browser } from '$app/environment';

class AuthState {
    user = $state(null);
    token = $state(null);
    isInitialized = $state(false);

    constructor() {
        if (browser) {
            this.init();
        }
    }

    init() {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            try {
                this.token = storedToken;
                this.user = JSON.parse(storedUser);
            } catch (e) {
                this.logout();
            }
        }
        this.isInitialized = true;
    }

    login(user, token) {
        this.user = user;
        this.token = token;
        if (browser) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }
    }

    logout() {
        this.user = null;
        this.token = null;
        if (browser) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }

    updateUser(user) {
        this.user = user;
        if (browser) {
            localStorage.setItem('user', JSON.stringify(user));
        }
    }
}

export const auth = new AuthState();
