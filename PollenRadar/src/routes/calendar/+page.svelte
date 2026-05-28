<script>
    import { getPollenData } from '$lib/api.js';
    import { onMount } from 'svelte';

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
                errorMsg = 'Stadt nicht gefunden.';
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
        <h1>Pollen-Kalender</h1>
        <p class="text-muted">7-Tage-Prognose für deine Region oder dein Reiseziel.</p>
    </header>

    <div class="card search-card">
        <form onsubmit={handleSearch} class="search-form">
            <input 
                type="text" 
                bind:value={cityQuery} 
                placeholder="Stadt suchen (z.B. Berlin, Linz)" 
                class="search-input"
            />
            <button type="submit" class="btn btn-primary" disabled={isSearching}>
                {#if isSearching}
                    Sucht...
                {:else}
                    Suchen
                {/if}
            </button>
        </form>
        {#if errorMsg}
            <div class="error-msg mt-2">{errorMsg}</div>
        {/if}
    </div>

    <div class="legend-card card mb-4">
        <h3>Legende</h3>
        <p class="text-muted" style="margin-bottom: 0.5rem; font-size: 0.9rem;">Die Zahlen geben die Pollenbelastung in <strong>Partikeln pro Kubikmeter (m³)</strong> an.</p>
        <div class="legend-items">
            <div class="legend-item">
                <span class="badge low">0 - 9</span>
                <span>Gering</span>
            </div>
            <div class="legend-item">
                <span class="badge moderate">10 - 49</span>
                <span>Mittel</span>
            </div>
            <div class="legend-item">
                <span class="badge high">50+</span>
                <span>Hoch</span>
            </div>
        </div>
    </div>

    <h2 class="mt-4 mb-4">
        {#if isSearching}
            Suche Daten für "{cityQuery}"...
        {:else}
            Prognose für {currentLocationName}
        {/if}
    </h2>

    {#if forecastData && !isSearching}
        <div class="forecast-grid">
            {#each forecastData as day}
                <div class="forecast-card card">
                    <div class="date-header">
                        <strong>{new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short' })}</strong>
                        <div class="date-sub">{new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</div>
                    </div>
                    <div class="data-rows">
                        {#each Object.keys(day.pollens) as pollenKey}
                            <div class="pollen-stat">
                                <span class="pollen-name">{pollenKey}:</span>
                                <span class="badge {getLevelClass(day.pollens[pollenKey])}">
                                    {Math.round(day.pollens[pollenKey])}
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else if !errorMsg && !isSearching}
        <p>Lade Prognose...</p>
    {/if}
</div>

<style>
    .calendar-container {
        max-width: 800px;
    }

    .search-card {
        background: var(--surface);
        padding: 1.5rem;
    }

    .search-form {
        display: flex;
        gap: 1rem;
    }

    .search-input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-family: var(--font-family);
        font-size: 1rem;
    }

    .legend-card {
        background: var(--surface);
        padding: 1rem 1.5rem;
    }

    .legend-card h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        font-size: 1.1rem;
    }

    .legend-items {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    }

    .forecast-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
    }

    .forecast-card {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        text-align: center;
        margin-bottom: 0;
    }

    .date-header {
        font-size: 1.1rem;
        color: var(--text-main);
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
        margin-bottom: 0.75rem;
    }

    .date-sub {
        font-size: 0.85rem;
        color: var(--text-muted);
        font-weight: normal;
    }

    .data-rows {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .pollen-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
    }

    .pollen-name {
        color: var(--text-muted);
    }

    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .badge.low {
        background-color: #d1fae5;
        color: #065f46;
    }

    .badge.moderate {
        background-color: #fef3c7;
        color: #92400e;
    }

    .badge.high {
        background-color: #fee2e2;
        color: #991b1b;
    }
</style>
