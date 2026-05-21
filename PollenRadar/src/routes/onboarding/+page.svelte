<script>
    import { updateOnboarding } from '$lib/api.js';
    import { auth } from '$lib/state/auth.svelte.js';
    import { goto } from '$app/navigation';

    let allergens = $state([]);
    let gpsEnabled = $state(false);
    let errorMsg = $state('');
    let isLoading = $state(false);

    const availableAllergens = [
        'Birke',
        'Gräser',
        'Hasel',
        'Ragweed',
        'Eiche',
        'Zeder'
    ];

    function toggleAllergen(allergen) {
        const index = allergens.indexOf(allergen);
        if (index > -1) {
            allergens.splice(index, 1);
        } else {
            allergens.push(allergen);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        errorMsg = '';
        isLoading = true;

        try {
            const data = await updateOnboarding(allergens, gpsEnabled);
            auth.updateUser(data.user);
            goto('/dashboard');
        } catch (err) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="auth-container">
    <div class="auth-card" style="max-width: 500px;">
        <h1 class="text-center">Willkommen, {auth.user?.first_name || 'Nutzer'}!</h1>
        <p class="text-center text-muted mb-4">Lass uns dein Profil einrichten, um dir die besten Pollen-Daten zu liefern.</p>

        <form onsubmit={handleSubmit}>
            <div class="form-group mb-4">
                <label>Gegen was bist du allergisch?</label>
                <div class="allergens-grid">
                    {#each availableAllergens as allergen}
                        {#if allergens.includes(allergen)}
                            <button
                                type="button"
                                class="allergen-btn selected"
                                onclick={() => toggleAllergen(allergen)}
                            >
                                {allergen}
                            </button>
                        {:else}
                            <button
                                type="button"
                                class="allergen-btn"
                                onclick={() => toggleAllergen(allergen)}
                            >
                                {allergen}
                            </button>
                        {/if}
                    {/each}
                </div>
            </div>

            <div class="form-group mb-4 gps-toggle">
                <label for="gps_toggle" style="margin-bottom: 0;">GPS-Standort aktivieren</label>
                <input type="checkbox" id="gps_toggle" bind:checked={gpsEnabled} />
            </div>
            <p class="text-muted" style="font-size: 0.85rem;">Wir benötigen deinen Standort, um genaue lokale Pollendaten anzuzeigen.</p>

            {#if errorMsg}
                <div class="error-msg">{errorMsg}</div>
            {/if}

            <button type="submit" class="btn btn-primary w-full mt-4" disabled={isLoading}>
                {#if isLoading}
                    Speichere...
                {:else}
                    Einrichtung abschließen
                {/if}
            </button>
        </form>
    </div>
</div>

<style>
    .allergens-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
    }
    
    .allergen-btn {
        padding: 0.75rem;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-family);
        font-size: 0.95rem;
    }

    .allergen-btn.selected {
        background: rgba(16, 185, 129, 0.1);
        border-color: var(--primary);
        color: var(--primary-hover);
        font-weight: 500;
    }

    .gps-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: var(--background);
        border-radius: var(--radius-sm);
        margin-top: 1rem;
    }

    input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        accent-color: var(--primary);
        cursor: pointer;
    }
</style>
