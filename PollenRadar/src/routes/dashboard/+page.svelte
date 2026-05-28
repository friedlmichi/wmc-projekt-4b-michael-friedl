<script>
    import { auth } from '$lib/state/auth.svelte.js';
    import { getPollenData, updateOnboarding } from '$lib/api.js';
    import { onMount } from 'svelte';

    let pollenData = $state(null);
    let isLoading = $state(true);
    let errorMsg = $state('');
    let viewMode = $state('mine'); // 'mine' or 'all'
    let isActivatingGps = $state(false);

    // Fallback coordinates for Pimpfing, Austria
    const FALLBACK_LAT = 48.3732;
    const FALLBACK_LON = 13.5683;

    // Mapping Open-Meteo keys to user-friendly names
    const allergenMap = {
        'Birke': 'birch_pollen',
        'Gräser': 'grass_pollen',
        'Beifuß': 'mugwort_pollen',
        'Erle': 'alder_pollen',
        'Olive': 'olive_pollen',
        'Ragweed': 'ragweed_pollen'
    };

    onMount(() => {
        loadPollenData();
    });

    function loadPollenData() {
        isLoading = true;
        if (auth.user?.gps_enabled) {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        await fetchPollen(lat, lon);
                    },
                    async (err) => {
                        errorMsg = "GPS-Fehler. Verwende Standard-Standort (Pimpfing).";
                        await fetchPollen(FALLBACK_LAT, FALLBACK_LON);
                    }
                );
            } else {
                errorMsg = "Geolokalisierung wird vom Browser nicht unterstützt.";
                fetchPollen(FALLBACK_LAT, FALLBACK_LON);
            }
        } else {
            // Fallback location if GPS not enabled
            fetchPollen(FALLBACK_LAT, FALLBACK_LON);
        }
    }

    async function handleActivateGps() {
        isActivatingGps = true;
        try {
            const data = await updateOnboarding(auth.user.allergens, true);
            auth.updateUser(data.user);
            loadPollenData();
        } catch (err) {
            errorMsg = "Fehler beim Aktivieren des GPS.";
        } finally {
            isActivatingGps = false;
        }
    }

    async function fetchPollen(lat, lon) {
        try {
            const data = await getPollenData(lat, lon);
            // Open-Meteo returns hourly data. We'll take the current hour.
            const currentHourIndex = new Date().getHours();
            
            let parsedData = {};
            if (data.hourly) {
                for (const key of Object.keys(allergenMap)) {
                    const apiField = allergenMap[key];
                    if (data.hourly[apiField]) {
                        parsedData[key] = data.hourly[apiField][currentHourIndex];
                    }
                }
            }
            pollenData = parsedData;
        } catch (err) {
            errorMsg = "Fehler beim Laden der Pollendaten.";
        } finally {
            isLoading = false;
        }
    }

    function getLevelClass(value) {
        if (value === undefined || value === null) return 'unknown';
        if (value < 10) return 'low';
        if (value < 50) return 'moderate';
        return 'high';
    }

    function getLevelText(value) {
        if (value === undefined || value === null) return 'Keine Daten';
        if (value < 10) return 'Niedrig';
        if (value < 50) return 'Mittel';
        return 'Hoch';
    }

    let displayedAllergens = $derived(
        viewMode === 'mine' 
            ? (auth.user?.allergens || [])
            : Object.keys(allergenMap)
    );
</script>

<header class="dashboard-header">
    <h1>Willkommen, {auth.user?.first_name || 'Nutzer'}</h1>
    <p class="text-muted">Hier ist dein aktuelles PollenRadar.</p>
</header>

{#if errorMsg}
    <div class="alert warning">{errorMsg}</div>
{/if}

{#if !auth.user?.gps_enabled}
    <div class="gps-banner">
        <div>
            <strong>GPS deaktiviert!</strong> 
            <span>Dir werden gerade die Standard-Daten für <strong>Pimpfing</strong> angezeigt.</span>
        </div>
        <button class="btn btn-sm" onclick={handleActivateGps} disabled={isActivatingGps}>
            {#if isActivatingGps}
                Aktiviert...
            {:else}
                Jetzt aktivieren
            {/if}
        </button>
    </div>
{/if}

{#if isLoading}
    <div class="loading">Pollendaten werden geladen...</div>
{:else if pollenData}
    <div class="toggle-container mb-4">
        <button 
            class="toggle-btn {viewMode === 'mine' ? 'active' : ''}" 
            onclick={() => viewMode = 'mine'}
        >
            Meine Allergien
        </button>
        <button 
            class="toggle-btn {viewMode === 'all' ? 'active' : ''}" 
            onclick={() => viewMode = 'all'}
        >
            Alle Pollen
        </button>
    </div>

    <div class="pollen-grid">
        {#each displayedAllergens as allergen}
            <div class="card allergen-card">
                <h3>{allergen}</h3>
                <div class="level-indicator {getLevelClass(pollenData[allergen])}">
                    <div class="level-text">{getLevelText(pollenData[allergen])}</div>
                    <div class="level-value">{pollenData[allergen] || 0} Partikel/m³</div>
                </div>
            </div>
        {/each}
        
        {#if viewMode === 'mine' && displayedAllergens.length === 0}
            <div class="card w-full" style="grid-column: 1 / -1; text-align: center;">
                <p>Du hast keine Allergien im Profil ausgewählt.</p>
                <a href="/profile" class="btn btn-primary mt-2" style="display: inline-block;">Zum Profil</a>
            </div>
        {/if}
    </div>
{/if}

<style>
    .dashboard-header {
        margin-bottom: 2rem;
    }

    .toggle-container {
        display: inline-flex;
        background: var(--surface);
        border-radius: var(--radius-sm);
        padding: 0.25rem;
        border: 1px solid var(--border);
    }

    .toggle-btn {
        padding: 0.5rem 1rem;
        border: none;
        background: transparent;
        border-radius: calc(var(--radius-sm) - 0.25rem);
        cursor: pointer;
        font-family: var(--font-family);
        font-weight: 500;
        color: var(--text-muted);
        transition: all 0.2s;
    }

    .toggle-btn.active {
        background: var(--primary);
        color: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .alert {
        padding: 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1rem;
    }

    .alert.warning {
        background-color: #fffbeb;
        color: #b45309;
        border: 1px solid #fcd34d;
    }

    .loading {
        text-align: center;
        padding: 3rem;
        color: var(--text-muted);
    }

    .pollen-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1.5rem;
    }

    .allergen-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .level-indicator {
        margin-top: 1rem;
        padding: 1.5rem;
        border-radius: 50%;
        width: 150px;
        height: 150px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 8px solid var(--border);
    }

    .level-indicator.low {
        border-color: #10b981; /* Green */
        color: #065f46;
    }

    .level-indicator.moderate {
        border-color: #f59e0b; /* Yellow/Orange */
        color: #92400e;
    }

    .level-indicator.high {
        border-color: #ef4444; /* Red */
        color: #991b1b;
    }

    .level-text {
        font-weight: 700;
        font-size: 1.25rem;
    }

    .level-value {
        font-size: 0.875rem;
        opacity: 0.8;
        margin-top: 0.25rem;
    }

    .gps-banner {
        background-color: #fef2f2;
        border: 1px solid #f87171;
        border-left: 5px solid #ef4444;
        color: #991b1b;
        padding: 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }

    .gps-banner strong {
        display: block;
        font-size: 1.1rem;
        margin-bottom: 0.25rem;
    }

    .gps-banner .btn {
        background-color: #ef4444;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background-color 0.2s;
        white-space: nowrap;
    }

    .gps-banner .btn:hover:not(:disabled) {
        background-color: #dc2626;
    }

    .gps-banner .btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
</style>
