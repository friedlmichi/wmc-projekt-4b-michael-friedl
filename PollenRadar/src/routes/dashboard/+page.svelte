<script>
    import { auth } from '$lib/state/auth.svelte.js';
    import { i18n } from '$lib/state/i18n.svelte.js';
    import { getPollenData, updateOnboarding } from '$lib/api.js';
    import { onMount, onDestroy, tick } from 'svelte';
    import AllergenCard from '$lib/components/AllergenCard.svelte';

    let pollenData = $state(null);
    let isLoading = $state(true);
    let errorMsg = $state('');
    let viewMode = $state('mine'); // 'mine' or 'all'
    let isActivatingGps = $state(false);

    // Fallback coordinates for Pimpfing, Austria
    const FALLBACK_LAT = 48.3732;
    const FALLBACK_LON = 13.5683;

    let currentLat = $state(FALLBACK_LAT);
    let currentLon = $state(FALLBACK_LON);
    let map = null;
    let marker = null;
    let cityMarkers = [];

    // Static list of regional cities to show on the radar map
    const regionalCities = [
        { name: 'Wien', lat: 48.2082, lon: 16.3738 },
        { name: 'Linz', lat: 48.3069, lon: 14.2858 },
        { name: 'Salzburg', lat: 47.8095, lon: 13.0550 },
        { name: 'Graz', lat: 47.0707, lon: 15.4395 },
        { name: 'Innsbruck', lat: 47.2692, lon: 11.4041 },
        { name: 'München', lat: 48.1351, lon: 11.5820 },
        { name: 'Berlin', lat: 52.5200, lon: 13.4050 }
    ];

    let regionalCityRawData = {}; // Cache of city -> Open-Meteo hourly response

    // Mapping Open-Meteo keys to user-friendly names
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
        loadPollenData();
    });

    onDestroy(() => {
        if (map) {
            map.remove();
            map = null;
            marker = null;
            cityMarkers = [];
        }
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
        currentLat = lat;
        currentLon = lon;
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
            isLoading = false;

            // Wait for DOM to register the #pollen-map div
            await tick();

            // Fetch other regional cities pollen data
            await fetchRegionalPollenData();

            initMap(lat, lon);
        } catch (err) {
            errorMsg = "Fehler beim Laden der Pollendaten.";
            isLoading = false;
        }
    }

    async function fetchRegionalPollenData() {
        const promises = regionalCities.map(async (city) => {
            if (regionalCityRawData[city.name]) return; // already in cache
            try {
                const data = await getPollenData(city.lat, city.lon);
                regionalCityRawData[city.name] = data;
            } catch (err) {
                console.error(`Failed to fetch pollen data for ${city.name}`, err);
            }
        });
        await Promise.all(promises);
    }

    function getCityRiskValue(cityName) {
        const data = regionalCityRawData[cityName];
        if (!data || !data.hourly) return 0;
        const currentHourIndex = new Date().getHours();
        let maxVal = 0;
        for (const allergen of displayedAllergens) {
            const apiField = allergenMap[allergen];
            const val = data.hourly[apiField]?.[currentHourIndex] || 0;
            if (val > maxVal) maxVal = val;
        }
        return maxVal;
    }

    function getLevelClass(value) {
        if (value === undefined || value === null) return 'unknown';
        if (value < 10) return 'low';
        if (value < 50) return 'moderate';
        return 'high';
    }

    function getLevelText(value) {
        if (value === undefined || value === null) return i18n.t('dashboard.no_data');
        if (value < 10) return i18n.t('dashboard.risk.low');
        if (value < 50) return i18n.t('dashboard.risk.moderate');
        return i18n.t('dashboard.risk.high');
    }

    let displayedAllergens = $derived(
        viewMode === 'mine' 
            ? (auth.user?.allergens || [])
            : Object.keys(allergenMap)
    );

    let overallRiskValue = $derived.by(() => {
        if (!pollenData || displayedAllergens.length === 0) return 0;
        let max = 0;
        for (const allergen of displayedAllergens) {
            const val = pollenData[allergen] || 0;
            if (val > max) max = val;
        }
        return max;
    });

    function getMarkerColor(val) {
        const riskClass = getLevelClass(val);
        if (riskClass === 'moderate') return '#ea580c';
        if (riskClass === 'high') return '#e11d48';
        return '#69a709';
    }

    function getPopupText(val) {
        const text = getLevelText(val);
        return i18n.lang === 'en' 
            ? `<b>Your Location</b><br>Overall Risk: ${text} (${val} particles/m³)`
            : `<b>Dein Standort</b><br>Gesamtrisiko: ${text} (${val} Partikel/m³)`;
    }

    function initMap(lat, lon) {
        if (!window.L) return;
        const mapContainer = document.getElementById('pollen-map');
        if (!mapContainer) return;

        const color = getMarkerColor(overallRiskValue);
        const popupText = getPopupText(overallRiskValue);

        if (map) {
            map.setView([lat, lon], 7);
            if (marker) {
                marker.setLatLng([lat, lon]);
                marker.setStyle({ color: color, fillColor: color });
                marker.setPopupContent(popupText);
            }
        } else {
            // Center map with a wider zoom of 7 to display regional cities
            map = window.L.map('pollen-map').setView([47.6, 14.2], 7);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // User marker
            marker = window.L.circleMarker([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.65,
                radius: 12,
                weight: 3
            }).addTo(map);
            marker.bindPopup(popupText).openPopup();
        }

        updateCityMarkers();
    }

    function updateCityMarkers() {
        if (!map) return;
        
        // Remove old city markers
        for (const m of cityMarkers) {
            map.removeLayer(m);
        }
        cityMarkers = [];

        // Add regional markers
        for (const city of regionalCities) {
            // Skip if it overlaps too closely with user location
            const dist = Math.sqrt(Math.pow(city.lat - currentLat, 2) + Math.pow(city.lon - currentLon, 2));
            if (dist < 0.15) continue;

            const val = getCityRiskValue(city.name);
            const color = getMarkerColor(val);
            const text = getLevelText(val);
            
            const popupText = i18n.lang === 'en'
                ? `<b>${city.name}</b><br>Overall Risk: ${text} (${val} particles/m³)`
                : `<b>${city.name}</b><br>Gesamtrisiko: ${text} (${val} Partikel/m³)`;

            const m = window.L.circleMarker([city.lat, city.lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.45,
                radius: 8,
                weight: 1.5
            }).addTo(map);
            m.bindPopup(popupText);
            cityMarkers.push(m);
        }
    }

    // Reactively update markers when filter or values change
    $effect(() => {
        if (map && marker) {
            const color = getMarkerColor(overallRiskValue);
            const popupText = getPopupText(overallRiskValue);
            marker.setStyle({ color: color, fillColor: color });
            marker.setPopupContent(popupText);
            
            updateCityMarkers();
        }
    });
</script>

<header class="dashboard-header">
    <h1>{i18n.t('dashboard.welcome')}, {auth.user?.first_name || 'Nutzer'}</h1>
    <p class="text-muted">{i18n.t('dashboard.subtitle')}</p>
</header>

{#if errorMsg}
    <div class="alert warning">{errorMsg}</div>
{/if}

{#if !auth.user?.gps_enabled}
    <div class="gps-banner">
        <div>
            <strong>{i18n.t('dashboard.gps.disabled')}</strong> 
            <span>{i18n.t('dashboard.gps.fallback')} <strong>Pimpfing</strong> {i18n.t('dashboard.gps.displayed')}</span>
        </div>
        <button class="btn btn-sm" onclick={handleActivateGps} disabled={isActivatingGps}>
            {#if isActivatingGps}
                {i18n.t('dashboard.gps.activating')}
            {:else}
                {i18n.t('dashboard.gps.activate')}
            {/if}
        </button>
    </div>
{/if}

{#if isLoading}
    <div class="loading">{i18n.t('dashboard.loading')}</div>
{:else if pollenData}
    <div class="dashboard-layout">
        <!-- Left Column: Risk Card & Leaflet Map -->
        <div class="dashboard-left">
            {#if displayedAllergens.length > 0}
                <div class="risk-card card {getLevelClass(overallRiskValue)}">
                    <h2>{i18n.t('dashboard.risk.title')}: {getLevelText(overallRiskValue)}</h2>
                    <p>{i18n.t('dashboard.risk.desc')} {overallRiskValue} {i18n.t('dashboard.particles')}.</p>
                </div>
            {/if}
            
            <div class="card map-card">
                <h2>{i18n.t('dashboard.map_title')}</h2>
                <div id="pollen-map"></div>
            </div>
        </div>

        <!-- Right Column: Toggle & Pollen Details -->
        <div class="dashboard-right">
            <div class="toggle-container">
                <button 
                    class="toggle-btn {viewMode === 'mine' ? 'active' : ''}" 
                    onclick={() => viewMode = 'mine'}
                >
                    {i18n.t('dashboard.toggle.mine')}
                </button>
                <button 
                    class="toggle-btn {viewMode === 'all' ? 'active' : ''}" 
                    onclick={() => viewMode = 'all'}
                >
                    {i18n.t('dashboard.toggle.all')}
                </button>
            </div>

            <div class="pollen-grid">
                {#each displayedAllergens as allergen}
                    <AllergenCard {allergen} value={pollenData[allergen]} />
                {/each}
                
                {#if viewMode === 'mine' && displayedAllergens.length === 0}
                    <div class="card w-full" style="grid-column: 1 / -1; text-align: center;">
                        <p>{i18n.t('dashboard.no_allergens')}</p>
                        <a href="/profile" class="btn btn-primary mt-2" style="display: inline-block;">{i18n.t('dashboard.to_profile')}</a>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .dashboard-header {
        margin-bottom: 1.25rem;
    }

    .dashboard-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.25rem;
        align-items: start;
    }

    @media (min-width: 992px) {
        .dashboard-layout {
            grid-template-columns: 1fr 1.25fr;
        }
    }

    .dashboard-left, .dashboard-right {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    #pollen-map {
        height: 280px;
        width: 100%;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        margin-top: 0.75rem;
        z-index: 1;
    }

    @media (min-width: 768px) {
        #pollen-map {
            height: 340px;
        }
    }

    .risk-card {
        text-align: center;
        padding: 1.5rem;
        color: white;
        border: none;
    }

    .risk-card.low {
        background: linear-gradient(135deg, var(--primary), #528207);
    }

    .risk-card.moderate {
        background: linear-gradient(135deg, #ea580c, #c2410c);
    }

    .risk-card.high {
        background: linear-gradient(135deg, #e11d48, #be123c);
    }

    .risk-card h2 {
        margin-top: 0;
        margin-bottom: 0.25rem;
        font-size: 1.25rem;
        color: white;
    }

    .risk-card p {
        margin-bottom: 0;
        opacity: 0.9;
        font-size: 0.95rem;
    }

    .toggle-container {
        display: inline-flex;
        align-self: flex-start;
        background: var(--surface);
        border-radius: var(--radius-sm);
        padding: 0.2rem;
        border: 1px solid var(--border);
    }

    .toggle-btn {
        padding: 0.4rem 0.875rem;
        border: none;
        background: transparent;
        border-radius: calc(var(--radius-sm) - 0.2rem);
        cursor: pointer;
        font-family: var(--font-family);
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--text-muted);
        transition: all 0.2s;
    }

    .toggle-btn.active {
        background: var(--primary);
        color: white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .alert {
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1rem;
        font-size: 0.9rem;
        font-weight: 500;
    }

    .alert.warning {
        background-color: #fffbeb;
        color: #b45309;
        border: 1px solid #fcd34d;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
    }

    .pollen-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
        gap: 1rem;
    }

    .allergen-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1rem;
    }

    .level-indicator {
        margin-top: 0.75rem;
        border-radius: 50%;
        width: 100px;
        height: 100px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 5px solid var(--border);
        background: rgba(0,0,0,0.01);
    }

    .level-indicator.low {
        border-color: var(--primary);
        color: var(--primary-hover);
    }

    .level-indicator.moderate {
        border-color: #ea580c;
        color: #c2410c;
    }

    .level-indicator.high {
        border-color: #e11d48;
        color: #be123c;
    }

    .level-text {
        font-weight: 700;
        font-size: 0.95rem;
    }

    .level-value {
        font-size: 0.75rem;
        opacity: 0.85;
        margin-top: 0.15rem;
    }

    .gps-banner {
        background-color: #fef2f2;
        border: 1px solid #f87171;
        border-left: 4px solid #ef4444;
        color: #991b1b;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.875rem;
    }

    .gps-banner strong {
        display: block;
        font-size: 0.95rem;
        margin-bottom: 0.15rem;
    }

    .gps-banner .btn {
        background-color: #ef4444;
        color: white;
        border: none;
        padding: 0.4rem 0.75rem;
        font-size: 0.8rem;
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
