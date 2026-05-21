<script>
    import { login } from "$lib/api.js";
    import { auth } from "$lib/state/auth.svelte.js";
    import { goto } from "$app/navigation";

    let email = $state("");
    let password = $state("");
    let errorMsg = $state("");
    let isLoading = $state(false);

    async function handleSubmit(event) {
        event.preventDefault();
        errorMsg = "";
        isLoading = true;

        try {
            const data = await login(email, password);
            auth.login(data.user, data.token);
            goto("/dashboard");
        } catch (err) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="auth-container">
    <div class="auth-card">
        <img src="/logo.png" alt="PollenRadar Logo" class="center" />
        <br/>
        <h1 class="text-center">Login</h1>

        <form onsubmit={handleSubmit}>
            <div class="form-group">
                <label for="email">E-Mail</label>
                <input type="email" id="email" bind:value={email} required />
            </div>

            <div class="form-group">
                <label for="password">Passwort</label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    required
                />
            </div>

            {#if errorMsg}
                <div class="error-msg">{errorMsg}</div>
            {/if}

            <button
                type="submit"
                class="btn btn-primary w-full mt-4"
                disabled={isLoading}
            >
                {#if isLoading}
                    Lädt...
                {:else}
                    Einloggen
                {/if}
            </button>
        </form>

        <p class="text-center mt-4 text-muted">
            Noch keinen Account? <a href="/register" class="text-primary"
                >Registrieren</a
            >
        </p>
    </div>
</div>

<style>
    .center {
        display: block;
        margin-left: auto;
        margin-right: auto;
    }
    .text-primary {
        color: var(--primary);
        text-decoration: none;
        font-weight: 500;
    }
    .text-primary:hover {
        text-decoration: underline;
    }
</style>
