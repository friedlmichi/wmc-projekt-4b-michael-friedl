<script>
    import '../app.css';
    import { auth } from '$lib/state/auth.svelte.js';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    let { children } = $props();

    onMount(() => {
        const currentPath = $page.url.pathname;
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
</script>

<svelte:head>
    <title>PollenRadar</title>
</svelte:head>

<main>
    {@render children()}
</main>
