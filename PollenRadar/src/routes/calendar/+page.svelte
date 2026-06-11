<script>
    import { getPollenData } from '$lib/api.js';
    import { i18n } from '$lib/state/i18n.svelte.js';
    import { onMount } from 'svelte';
    import Badge from '$lib/components/Badge.svelte';

    let cityQuery = $state('');
    let isSearching = $state(false);
    let errorMsg = $state('');
    let forecastData = $state(null);
    let currentLocationName = $state('Wien'); // default fallback

    const allergenMap = {
        'Birke': 'birch_pollen',
        'Gräser': 'grass_pollen',
        'Beifuß': 'mugwort_pollen',
        'Erle': 'alder_pollen',
        'Olive': 'olive_pollen',
        'Ragweed': 'ragweed_pollen'
    };

    const allergenI18nMap = {
        'Birke': 'allergen.birch',
        'Gräser': 'allergen.grass',
        'Beifuß': 'allergen.mugwort',
        'Erle': 'allergen.alder',
        'Olive': 'allergen.olive',
        'Ragweed': 'allergen.ragweed'
    };

    onMount(() => {
        // Initial load for default location
        fetchForecastForCoordinates(48.2082, 16.3738, 'Wien');
    });

    async function handleSearch(e) {
        e.preventDefault();
        if (!cityQuery.trim()) return;
        
        isSearching = true;
        errorMsg = '';
        
        try {
            // Geocoding via free Nominatim API
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}`);
            const geoData = await geoRes.json();
            
            if (geoData && geoData.length > 0) {
                const lat = geoData[0].lat;
                const lon = geoData[0].lon;
                currentLocationName = geoData[0].display_name.split(',')[0];
                await fetchForecastForCoordinates(lat, lon, currentLocationName);
            } else {
                errorMsg = i18n.t('calendar.err_not_found');
            }
        } catch (err) {
            errorMsg = 'Fehler bei der Städtesuche.';
        } finally {
            isSearching = false;
        }
    }

    async function fetchForecastForCoordinates(lat, lon, name) {
        try {
            const data = await getPollenData(lat, lon);
            
            if (data.hourly && data.hourly.time) {
                const dailyMap = {};
                for (let i = 0; i < data.hourly.time.length; i++) {
                    const dateStr = data.hourly.time[i].split('T')[0];
                    
                    if (!dailyMap[dateStr]) {
                        dailyMap[dateStr] = {};
                        for (const key of Object.keys(allergenMap)) {
                            dailyMap[dateStr][key] = 0;
                        }
                    }
                    
                    for (const key of Object.keys(allergenMap)) {
                        const apiField = allergenMap[key];
                        const val = data.hourly[apiField]?.[i] || 0;
                        dailyMap[dateStr][key] = Math.max(dailyMap[dateStr][key], val);
                    }
                }
                
                const days = Object.keys(dailyMap).map(date => {
                    return {
                        date,
                        pollens: dailyMap[date]
                    };
                }).slice(0, 7);
                
                forecastData = days;
            }
        } catch (err) {
            errorMsg = 'Fehler beim Laden der Vorhersage.';
        }
    }

    function getLevelClass(value) {
        if (value < 10) return 'low';
        if (value < 50) return 'moderate';
        return 'high';
    }
</script>

<div class="calendar-container">
    <header class="mb-4">
        <h1>{i18n.t('calendar.title')}</h1>
        <p class="text-muted">{i18n.t('calendar.subtitle')}</p>
    </header>

    <div class="card search-card">
        <form onsubmit={handleSearch} class="search-form">
            <input 
                type="text" 
                bind:value={cityQuery} 
                placeholder={i18n.t('calendar.search_placeholder')} 
                class="search-input"
            />
            <button type="submit" class="btn btn-primary" disabled={isSearching}>
                {#if isSearching}
                    {i18n.t('calendar.searching_btn')}
                {:else}
                    {i18n.t('calendar.search_btn')}
                {/if}
            </button>
        </form>
        {#if errorMsg}
            <div class="error-msg mt-2">{errorMsg}</div>
        {/if}
    </div>

    <div class="legend-card card mb-4">
        <h3>{i18n.t('calendar.legend.title')}</h3>
        <p class="text-muted" style="margin-bottom: 0.5rem; font-size: 0.9rem;">Die Zahlen geben die Pollenbelastung in <strong>Partikeln pro Kubikmeter (m³)</strong> an.</p>
        <div class="legend-items">
            <div class="legend-item">
                <span class="badge low">0 - 9</span>
                <span>{i18n.t('calendar.legend.low')}</span>
            </div>
            <div class="legend-item">
                <span class="badge moderate">10 - 49</span>
                <span>{i18n.t('calendar.legend.mod')}</span>
            </div>
            <div class="legend-item">
                <span class="badge high">50+</span>
                <span>{i18n.t('calendar.legend.high')}</span>
            </div>
        </div>
    </div>

    <h2 class="mt-4 mb-4">
        {#if isSearching}
            ...
        {:else}
            {i18n.t('calendar.forecast_for')} {currentLocationName}
        {/if}
    </h2>

    {#if forecastData && !isSearching}
        <div class="forecast-grid">
            {#each forecastData as day}
                <div class="forecast-card card">
                    <div class="date-header">
                        <strong>{new Date(day.date).toLocaleDateString(i18n.lang === 'en' ? 'en-US' : 'de-DE', { weekday: 'short' })}</strong>
                        <div class="date-sub">{new Date(day.date).toLocaleDateString(i18n.lang === 'en' ? 'en-US' : 'de-DE', { day: '2-digit', month: '2-digit' })}</div>
                    </div>
                    <div class="data-rows">
                        {#each Object.keys(day.pollens) as pollenKey}
                            <div class="pollen-stat">
                                <span class="pollen-name">{i18n.t(allergenI18nMap[pollenKey] || pollenKey)}:</span>
                                <Badge value={day.pollens[pollenKey]} />
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else if !errorMsg && !isSearching}
        <p>...</p>
    {/if}
</div>

<style>
    .calendar-container {
        width: 100%;
        max-width: 100%;
    }

    .search-card {
        margin-bottom: 1.5rem;
    }

    .search-form {
        display: flex;
        gap: 1rem;
    }

    .legend-card h3 {
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 1.15rem;
        color: var(--text-main);
    }

    .legend-items {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
        margin-top: 1rem;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.95rem;
    }

    .forecast-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 1.5rem;
    }

    .forecast-card {
        display: flex;
        flex-direction: column;
        padding: 1.5rem 1.25rem;
        text-align: center;
        margin-bottom: 0;
        transition: var(--transition-smooth);
    }

    .forecast-card:hover {
        transform: translateY(-4px);
    }

    .date-header {
        font-size: 1.15rem;
        color: var(--text-main);
        padding-bottom: 0.75rem;
        border-bottom: 1.5px solid var(--border);
        margin-bottom: 1rem;
    }

    .date-sub {
        font-size: 0.875rem;
        color: var(--text-muted);
        font-weight: normal;
        margin-top: 0.125rem;
    }

    .data-rows {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
    }

    .pollen-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.925rem;
    }

    .pollen-name {
        color: var(--text-muted);
        font-weight: 500;
    }

    .badge {
        padding: 0.25rem 0.65rem;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 0.80rem;
        min-width: 2.25rem;
        text-align: center;
    }

    .badge.low {
        background-color: rgba(22, 163, 74, 0.12);
        color: #15803d;
    }

    .badge.moderate {
        background-color: rgba(234, 88, 12, 0.12);
        color: #c2410c;
    }

    .badge.high {
        background-color: rgba(225, 29, 72, 0.12);
        color: #be123c;
    }
</style>
