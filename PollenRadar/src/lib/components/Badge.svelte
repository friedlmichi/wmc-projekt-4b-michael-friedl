<script>
    let { value } = $props();

    function getLevelClass(val) {
        if (val < 10) return 'low';
        if (val < 50) return 'moderate';
        return 'high';
    }
</script>

<span class="badge {getLevelClass(value)}">
    {Math.round(value)}
</span>

<style>
    .badge {
        padding: 0.25rem 0.65rem;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 0.80rem;
        min-width: 2.25rem;
        text-align: center;
        display: inline-block;
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
