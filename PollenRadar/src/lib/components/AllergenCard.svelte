<script>
    import { i18n } from '$lib/state/i18n.svelte.js';

    let { allergen, value } = $props();

    const allergenI18nMap = {
        'Birke': 'allergen.birch',
        'Gräser': 'allergen.grass',
        'Beifuß': 'allergen.mugwort',
        'Erle': 'allergen.alder',
        'Olive': 'allergen.olive',
        'Ragweed': 'allergen.ragweed'
    };

    function getLevelClass(val) {
        if (val === undefined || val === null) return 'unknown';
        if (val < 10) return 'low';
        if (val < 50) return 'moderate';
        return 'high';
    }

    function getLevelText(val) {
        if (val === undefined || val === null) return i18n.t('dashboard.no_data');
        if (val < 10) return i18n.t('dashboard.risk.low');
        if (val < 50) return i18n.t('dashboard.risk.moderate');
        return i18n.t('dashboard.risk.high');
    }
</script>

<div class="card allergen-card">
    <h3>{i18n.t(allergenI18nMap[allergen] || allergen)}</h3>
    <div class="level-indicator {getLevelClass(value)}">
        <div class="level-text">{getLevelText(value)}</div>
        <div class="level-value">{value || 0} {i18n.t('dashboard.particles')}</div>
    </div>
</div>

<style>
    .allergen-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 1rem;
        background: #ffffff;
        border: 1px solid var(--surface-border);
        border-radius: var(--radius-sm);
        transition: var(--transition-smooth);
    }

    .allergen-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
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
</style>
