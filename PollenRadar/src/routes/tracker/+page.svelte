<script>
    import { saveDiaryEntry, getDiaryEntries, deleteDiaryEntry } from '$lib/api.js';
    import { onMount } from 'svelte';

    let selectedSymptoms = $state([]);
    let notes = $state('');
    let isSaving = $state(false);
    let errorMsg = $state('');
    let successMsg = $state('');
    let history = $state([]);

    const availableSymptoms = [
        'Niesen',
        'Juckende Augen',
        'Laufende Nase',
        'Atemnot',
        'Kopfschmerzen',
        'Husten'
    ];

    onMount(async () => {
        await fetchHistory();
    });

    async function fetchHistory() {
        try {
            history = await getDiaryEntries();
        } catch (err) {
            console.error('Failed to load history', err);
        }
    }

    function toggleSymptom(symp) {
        const idx = selectedSymptoms.indexOf(symp);
        if (idx > -1) {
            selectedSymptoms.splice(idx, 1);
        } else {
            selectedSymptoms.push(symp);
        }
    }

    async function handleSubmit() {
        if (selectedSymptoms.length === 0) {
            errorMsg = 'Bitte wähle mindestens ein Symptom aus.';
            return;
        }

        isSaving = true;
        errorMsg = '';
        successMsg = '';

        try {
            await saveDiaryEntry(selectedSymptoms, notes);
            successMsg = 'Eintrag erfolgreich gespeichert!';
            selectedSymptoms = [];
            notes = '';
            await fetchHistory();
        } catch (err) {
            errorMsg = 'Fehler beim Speichern des Eintrags.';
        } finally {
            isSaving = false;
        }
    }

    async function handleDelete(id) {
        if (!confirm('Diesen Eintrag wirklich löschen?')) return;
        try {
            await deleteDiaryEntry(id);
            await fetchHistory();
        } catch (err) {
            errorMsg = 'Fehler beim Löschen des Eintrags.';
        }
    }
</script>

<div class="tracker-container">
    <header class="mb-4">
        <h1>Symptom-Tagebuch</h1>
        <p class="text-muted">Protokolliere hier deine Reaktionen für eine bessere Allergie-Auswertung.</p>
    </header>

    <div class="card mb-4">
        <h2 class="mb-4">Neuer Eintrag</h2>
        
        <div class="symptom-grid mb-4">
            {#each availableSymptoms as symp}
                <button 
                    class="symptom-btn {selectedSymptoms.includes(symp) ? 'active' : ''}"
                    onclick={() => toggleSymptom(symp)}
                >
                    {symp}
                </button>
            {/each}
        </div>

        <div class="form-group mb-4">
            <label for="notes" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Zusätzliche Notizen</label>
            <textarea 
                id="notes" 
                bind:value={notes} 
                rows="3" 
                placeholder="Wie fühlst du dich genau? Hast du Medikamente genommen?"
                class="notes-input"
            ></textarea>
        </div>

        {#if errorMsg}
            <div class="error-msg mb-4">{errorMsg}</div>
        {/if}
        {#if successMsg}
            <div class="success-msg mb-4">{successMsg}</div>
        {/if}

        <button class="btn btn-primary w-full" onclick={handleSubmit} disabled={isSaving}>
            {#if isSaving}
                Speichere...
            {:else}
                Eintrag speichern
            {/if}
        </button>
    </div>

    <h2 class="mb-4 mt-4">Deine Historie</h2>
    
    {#if history.length > 0}
        <div class="history-list">
            {#each history as entry}
                <div class="card history-card">
                    <div class="history-header">
                        <div class="history-date">
                            {new Date(entry.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <button class="delete-btn" onclick={() => handleDelete(entry.id)} aria-label="Löschen">🗑️</button>
                    </div>
                    
                    {#if entry.notes}
                        <div class="history-notes">"{entry.notes}"</div>
                    {/if}

                    <div class="history-symptoms">
                        {#each entry.symptoms as s}
                            <span class="symptom-tag">{s}</span>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p class="text-muted">Noch keine Einträge vorhanden.</p>
    {/if}
</div>

<style>
    .tracker-container {
        max-width: 600px;
    }

    .symptom-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.75rem;
    }

    .symptom-btn {
        padding: 1rem;
        background: var(--background);
        border: 2px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-family);
        font-weight: 500;
        transition: all 0.2s;
    }

    .symptom-btn:hover {
        border-color: var(--primary);
    }

    .symptom-btn.active {
        background-color: rgba(16, 185, 129, 0.1);
        border-color: var(--primary);
        color: var(--primary-hover);
    }

    .success-msg {
        color: #065f46;
        background-color: #d1fae5;
        padding: 0.75rem;
        border-radius: var(--radius-sm);
        text-align: center;
    }

    .history-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .history-card {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .history-date {
        font-size: 0.875rem;
        color: var(--text-muted);
        font-weight: 600;
    }

    .history-symptoms {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .symptom-tag {
        background: var(--border);
        padding: 0.25rem 0.5rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
    }

    .notes-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-family: var(--font-family);
        resize: vertical;
    }

    .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .delete-btn {
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
        font-size: 1.2rem;
    }

    .delete-btn:hover {
        opacity: 1;
        color: #ef4444;
    }

    .history-notes {
        font-style: italic;
        color: var(--text-main);
        font-size: 0.95rem;
        background: rgba(0,0,0,0.02);
        padding: 0.5rem;
        border-left: 3px solid var(--primary);
        margin: 0.5rem 0;
    }
</style>
