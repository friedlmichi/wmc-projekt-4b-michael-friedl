<script>
    import { updateOnboarding } from '$lib/api.js';
    import { auth } from '$lib/state/auth.svelte.js';
    import { onMount } from 'svelte';

    let allergens = $state([]);
    let gpsEnabled = $state(false);
    let errorMsg = $state('');
    let successMsg = $state('');
    let isLoading = $state(false);

    const availableAllergens = [
        'Birke',
        'Gräser',
        'Beifuß',
        'Erle',
        'Olive',
        'Ragweed'
    ];

    onMount(() => {
        if (auth.user) {
            allergens = [...(auth.user.allergens || [])];
            gpsEnabled = !!auth.user.gps_enabled;
        }
    });

    function toggleAllergen(allergen) {
        const index = allergens.indexOf(allergen);
        if (index > -1) {
            allergens.splice(index, 1);
        } else {
            allergens.push(allergen);
        }
    }

    async function handleSave(event) {
        event.preventDefault();
        errorMsg = '';
        successMsg = '';
        isLoading = true;

        try {
            const data = await updateOnboarding(allergens, gpsEnabled);
            auth.updateUser(data.user);
            successMsg = 'Profil erfolgreich aktualisiert!';
        } catch (err) {
            errorMsg = err.message || 'Fehler beim Speichern.';
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="profile-container">
    <header class="mb-4">
        <h1>Mein Profil</h1>
        <p class="text-muted">Verwalte deine Allergien und Einstellungen.</p>
    </header>

    <div class="card">
        <form onsubmit={handleSave}>
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
            <p class="text-muted mb-4" style="font-size: 0.85rem;">Wird benötigt, um genaue lokale Pollendaten anzuzeigen.</p>

            {#if errorMsg}
                <div class="error-msg mb-4">{errorMsg}</div>
            {/if}
            {#if successMsg}
                <div class="success-msg mb-4">{successMsg}</div>
            {/if}

            <button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
                {#if isLoading}
                    Speichere...
                {:else}
                    Änderungen speichern
                {/if}
            </button>
        </form>
    </div>
</div>

<style>
    .profile-container {
        max-width: 600px;
    }

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
    }

    input[type="checkbox"] {
        width: 1.25rem;
        height: 1.25rem;
        accent-color: var(--primary);
        cursor: pointer;
    }

    .success-msg {
        color: #065f46;
        background-color: #d1fae5;
        padding: 0.75rem;
        border-radius: var(--radius-sm);
        text-align: center;
    }
</style>
