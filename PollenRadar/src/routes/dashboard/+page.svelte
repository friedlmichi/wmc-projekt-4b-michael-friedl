<script>
    import { auth } from '$lib/state/auth.svelte.js';
    import { goto } from '$app/navigation';

    function handleLogout() {
        auth.logout();
        goto('/login');
    }
</script>

<div class="app-container">
    <div class="sidebar">
        <h2 class="brand">PollenRadar</h2>
        <nav>
            <a href="/dashboard" class="active">Dashboard</a>
            <a href="#">Kalender</a>
            <a href="#">AI Chat</a>
            <a href="#">Profil</a>
        </nav>
        <button class="btn btn-outline" onclick={handleLogout} style="margin-top: auto; width: 100%;">
            Logout
        </button>
    </div>
    
    <div class="main-content">
        <header class="dashboard-header">
            <h1>Willkommen, {auth.user?.first_name || 'Nutzer'}</h1>
            <p class="text-muted">Hier ist dein persönliches PollenRadar Dashboard.</p>
        </header>

        <div class="card empty-state">
            <div style="font-size: 3rem; margin-bottom: 1rem;">👋</div>
            <h2>Dein Dashboard ist einsatzbereit!</h2>
            <p class="text-muted">In den nächsten Meilensteinen werden hier die Pollendaten angezeigt.</p>
            
            <div class="profile-summary">
                <p><strong>Deine Allergien:</strong> 
                    {#if auth.user?.allergens && auth.user.allergens.length > 0}
                        {auth.user.allergens.join(', ')}
                    {:else}
                        Keine ausgewählt
                    {/if}
                </p>
                <p><strong>GPS aktiviert:</strong> 
                    {#if auth.user?.gps_enabled}
                        Ja
                    {:else}
                        Nein
                    {/if}
                </p>
            </div>
        </div>
    </div>
</div>

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

    .dashboard-header {
        margin-bottom: 2rem;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 4rem 2rem;
    }

    .profile-summary {
        margin-top: 2rem;
        padding: 1rem;
        background: var(--background);
        border-radius: var(--radius-sm);
        text-align: left;
        width: 100%;
        max-width: 400px;
    }
</style>
