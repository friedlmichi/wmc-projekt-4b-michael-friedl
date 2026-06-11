<script>
    import { updateOnboarding } from '$lib/api.js';
    import { auth } from '$lib/state/auth.svelte.js';
    import { i18n } from '$lib/state/i18n.svelte.js';
    import { onMount } from 'svelte';

    let allergens = $state([]);
    let gpsEnabled = $state(false);
    let language = $state('de');
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

    const allergenI18nMap = {
        'Birke': 'allergen.birch',
        'Gräser': 'allergen.grass',
        'Beifuß': 'allergen.mugwort',
        'Erle': 'allergen.alder',
        'Olive': 'allergen.olive',
        'Ragweed': 'allergen.ragweed'
    };

    onMount(() => {
        if (auth.user) {
            allergens = [...(auth.user.allergens || [])];
            gpsEnabled = !!auth.user.gps_enabled;
            language = auth.user.language || 'de';
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
            const data = await updateOnboarding(allergens, gpsEnabled, language);
            auth.updateUser(data.user);
            successMsg = i18n.t('profile.success_save');
        } catch (err) {
            errorMsg = err.message || 'Error saving.';
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="profile-container">
    <header class="mb-4">
        <h1>{i18n.t('profile.title')}</h1>
        <p class="text-muted">{i18n.t('profile.subtitle')}</p>
    </header>

    <div class="card">
        <form onsubmit={handleSave}>
            <div class="form-group mb-4">
                <span class="form-label" id="allergens_label">{i18n.t('profile.allergens_label')}</span>
                <div class="allergens-grid" aria-labelledby="allergens_label">
                    {#each availableAllergens as allergen}
                        {#if allergens.includes(allergen)}
                            <button
                                type="button"
                                class="allergen-btn selected"
                                onclick={() => toggleAllergen(allergen)}
                            >
                                {i18n.t(allergenI18nMap[allergen])}
                            </button>
                        {:else}
                            <button
                                type="button"
                                class="allergen-btn"
                                onclick={() => toggleAllergen(allergen)}
                            >
                                {i18n.t(allergenI18nMap[allergen])}
                            </button>
                        {/if}
                    {/each}
                </div>
            </div>

            <div class="form-group mb-4 gps-toggle">
                <label for="gps_toggle" style="margin-bottom: 0;">{i18n.t('profile.gps_label')}</label>
                <input type="checkbox" id="gps_toggle" bind:checked={gpsEnabled} />
            </div>
            <p class="text-muted mb-4" style="font-size: 0.85rem;">{i18n.t('profile.gps_desc')}</p>

            <div class="form-group mb-4 gps-toggle">
                <label for="lang_select" style="margin-bottom: 0;">{i18n.t('profile.lang_label')}</label>
                <select id="lang_select" bind:value={language} class="lang-select">
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                </select>
            </div>

            {#if errorMsg}
                <div class="error-msg mb-4">{errorMsg}</div>
            {/if}
            {#if successMsg}
                <div class="success-msg mb-4">{successMsg}</div>
            {/if}

            <button type="submit" class="btn btn-primary w-full" disabled={isLoading}>
                {#if isLoading}
                    {i18n.t('profile.saving_btn')}
                {:else}
                    {i18n.t('profile.save_btn')}
                {/if}
            </button>
        </form>
    </div>
</div>

<style>
    .form-label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: var(--text-main);
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .profile-container {
        max-width: 600px;
    }

    .allergens-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }
    
    .allergen-btn {
        padding: 0.875rem;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: var(--transition-smooth);
        font-family: var(--font-family);
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--text-muted);
    }

    .allergen-btn:hover {
        border-color: var(--primary);
        color: var(--primary);
        background: var(--primary-light);
    }

    .allergen-btn.selected {
        background: var(--primary-light);
        border-color: var(--primary);
        color: var(--primary-hover);
        font-weight: 700;
        box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .gps-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        margin-top: 0.5rem;
    }

    input[type="checkbox"] {
        width: 1.5rem;
        height: 1.5rem;
        accent-color: var(--primary);
        cursor: pointer;
        border-radius: 0.25rem;
    }

    .lang-select {
        padding: 0.625rem 1.25rem;
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        font-family: var(--font-family);
        font-size: 0.95rem;
        background: var(--surface);
        color: var(--text-main);
        outline: none;
        transition: var(--transition-smooth);
    }

    .lang-select:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .success-msg {
        color: var(--success);
        background: rgba(22, 163, 74, 0.05);
        border: 1px solid rgba(22, 163, 74, 0.1);
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        text-align: center;
        font-weight: 600;
    }
</style>
