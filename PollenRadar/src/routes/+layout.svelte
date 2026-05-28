<script>
    import '../app.css';
    import { auth } from '$lib/state/auth.svelte.js';
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
                    <a href="/dashboard" class={currentPath === '/dashboard' ? 'active' : ''}>Dashboard</a>
                    <a href="/calendar" class={currentPath === '/calendar' ? 'active' : ''}>Kalender</a>
                    <a href="/tracker" class={currentPath === '/tracker' ? 'active' : ''}>Symptom-Tagebuch</a>
                    <a href="/profile" class={currentPath === '/profile' ? 'active' : ''}>Profil</a>
                </nav>
                <button class="btn btn-outline" onclick={handleLogout} style="margin-top: auto; width: 100%;">
                    Logout
                </button>
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
        width: 250px;
        background: var(--surface);
        padding: 2rem 1.5rem;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--border);
    }

    .brand {
        color: var(--primary);
        font-weight: 700;
        margin-bottom: 2rem;
    }

    nav {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    nav a {
        padding: 0.75rem 1rem;
        text-decoration: none;
        color: var(--text-muted);
        border-radius: var(--radius-sm);
        font-weight: 500;
        transition: background-color 0.2s, color 0.2s;
    }

    nav a:hover, nav a.active {
        background-color: rgba(16, 185, 129, 0.1);
        color: var(--primary);
    }
</style>
