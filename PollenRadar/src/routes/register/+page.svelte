<script>
    import { register } from '$lib/api.js';
    import { auth } from '$lib/state/auth.svelte.js';
    import { goto } from '$app/navigation';

    let first_name = $state('');
    let last_name = $state('');
    let email = $state('');
    let password = $state('');
    let errorMsg = $state('');
    let isLoading = $state(false);

    async function handleSubmit(event) {
        event.preventDefault();
        errorMsg = '';
        isLoading = true;

        try {
            const data = await register(first_name, last_name, email, password);
            auth.login(data.user, data.token);
            goto('/onboarding');
        } catch (err) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="auth-container">
    <div class="auth-card">
        <h1 class="text-center">Registrierung</h1>

        <form onsubmit={handleSubmit}>
            <div class="form-group">
                <label for="first_name">Vorname</label>
                <input type="text" id="first_name" bind:value={first_name} required />
            </div>

            <div class="form-group">
                <label for="last_name">Nachname</label>
                <input type="text" id="last_name" bind:value={last_name} required />
            </div>

            <div class="form-group">
                <label for="email">E-Mail</label>
                <input type="email" id="email" bind:value={email} required />
            </div>

            <div class="form-group">
                <label for="password">Passwort</label>
                <input type="password" id="password" bind:value={password} required />
            </div>

            {#if errorMsg}
                <div class="error-msg">{errorMsg}</div>
            {/if}

            <button type="submit" class="btn btn-primary w-full mt-4" disabled={isLoading}>
                {#if isLoading}
                    Lädt...
                {:else}
                    Registrieren
                {/if}
            </button>
        </form>

        <p class="text-center mt-4 text-muted">
            Bereits einen Account? <a href="/login" class="text-primary">Zum Login</a>
        </p>
    </div>
</div>

<style>
    .text-primary {
        color: var(--primary);
        text-decoration: none;
        font-weight: 500;
    }
    .text-primary:hover {
        text-decoration: underline;
    }
</style>
