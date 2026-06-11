<script>
    import '../app.css';
    import { auth } from '$lib/state/auth.svelte.js';
    import { i18n } from '$lib/state/i18n.svelte.js';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    let { children } = $props();
    let currentPath = $derived($page.url.pathname);

    onMount(() => {
        let isAuthRoute = false;
        
        if (currentPath === '/login' || currentPath === '/register') {
            isAuthRoute = true;
        }

        if (!auth.isInitialized) {
            auth.init();
        }

        if (!auth.token && !isAuthRoute) {
            goto('/login');
        } else if (auth.token && isAuthRoute) {
            goto('/dashboard');
        }
    });

    function handleLogout() {
        auth.logout();
        goto('/login');
    }
</script>

<svelte:head>
    <title>PollenRadar</title>
</svelte:head>

<main>
    {#if auth.token && currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/onboarding'}
        <div class="app-container">
            <div class="sidebar">
                <h2 class="brand">PollenRadar</h2>
                <nav>
                    <a href="/dashboard" class={currentPath === '/dashboard' ? 'active' : ''}>{i18n.t('nav.dashboard')}</a>
                    <a href="/calendar" class={currentPath === '/calendar' ? 'active' : ''}>{i18n.t('nav.calendar')}</a>
                    <a href="/tracker" class={currentPath === '/tracker' ? 'active' : ''}>{i18n.t('nav.diary')}</a>
                    <a href="/profile" class={currentPath === '/profile' ? 'active' : ''}>{i18n.t('nav.profile')}</a>
                </nav>
                <div class="logout-btn-wrapper">
                    <button class="btn btn-outline" onclick={handleLogout} style="width: 100%;">
                        {i18n.t('nav.logout')}
                    </button>
                </div>
            </div>
            <div class="main-content">
                {@render children()}
            </div>
        </div>
    {:else}
        {@render children()}
    {/if}
</main>

<style>
    .sidebar {
        width: 100%;
        background: var(--surface);
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border-bottom: 1px solid var(--surface-border);
        box-shadow: 0 4px 12px 0 rgba(15, 23, 42, 0.02);
    }

    .brand {
        color: var(--primary);
        font-weight: 800;
        font-size: 1.25rem;
        letter-spacing: -0.025em;
        margin-bottom: 0;
    }

    nav {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 0.25rem;
    }

    nav a {
        padding: 0.5rem 0.75rem;
        text-decoration: none;
        color: var(--text-muted);
        border-radius: var(--radius-sm);
        font-weight: 600;
        font-size: 0.875rem;
        transition: var(--transition-smooth);
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    nav a:hover {
        background-color: var(--primary-light);
        color: var(--primary);
    }

    nav a.active {
        background-color: var(--primary-light);
        color: var(--primary);
        border-bottom: 2px solid var(--primary);
        border-radius: 0;
    }

    .logout-btn-wrapper {
        margin-top: 0;
        width: auto;
    }

    .logout-btn-wrapper :global(.btn) {
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
    }

    /* Desktop styles */
    @media (min-width: 768px) {
        .sidebar {
            width: 240px;
            height: 100vh;
            position: sticky;
            top: 0;
            padding: 2rem 1.5rem;
            flex-direction: column;
            border-right: 1px solid var(--surface-border);
            border-bottom: none;
            box-shadow: 4px 0 24px 0 rgba(15, 23, 42, 0.02);
            gap: 0;
        }

        .brand {
            font-size: 1.5rem;
            margin-bottom: 2.5rem;
        }

        nav {
            flex-direction: column;
            gap: 0.5rem;
        }

        nav a {
            padding: 0.875rem 1.25rem;
            font-size: 0.95rem;
        }

        nav a:hover {
            transform: translateX(4px);
        }

        nav a.active {
            box-shadow: inset 4px 0 0 0 var(--primary);
            border-bottom: none;
            border-radius: var(--radius-sm);
        }

        .logout-btn-wrapper {
            margin-top: auto;
            width: 100%;
        }

        .logout-btn-wrapper :global(.btn) {
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
        }
    }
</style>
