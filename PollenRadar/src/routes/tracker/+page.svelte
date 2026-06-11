<script>
    import { saveDiaryEntry, getDiaryEntries, deleteDiaryEntry, sendChatMessage } from '$lib/api.js';
    import { auth } from '$lib/state/auth.svelte.js';
    import { i18n } from '$lib/state/i18n.svelte.js';
    import { onMount, onDestroy, tick } from 'svelte';
    import { browser } from '$app/environment';

    let selectedSymptoms = $state([]);
    let notes = $state('');
    let isSaving = $state(false);
    let errorMsg = $state('');
    let successMsg = $state('');
    let history = $state([]);

    // Chat state & WebSockets
    let chatInput = $state('');
    let chatMessages = $state([{ role: 'ai', text: i18n.lang === 'en' ? 'Hello! Ask me anything about your symptoms. I will analyze your diary for you.' : 'Hallo! Frag mich etwas über deine Symptome. Ich analysiere dein Tagebuch für dich.' }]);
    let isChatLoading = $state(false);
    let chatBox;
    let socket;
    let isConnected = $state(false);

    const symptomI18nMap = {
        'Niesen': 'symptom.sneezing',
        'Juckende Augen': 'symptom.itchy_eyes',
        'Laufende Nase': 'symptom.runny_nose',
        'Atemnot': 'symptom.shortness_of_breath',
        'Kopfschmerzen': 'symptom.headache',
        'Husten': 'symptom.cough'
    };

    onMount(async () => {
        await fetchHistory();
        connectWebSocket();
    });

    onDestroy(() => {
        closeWebSocket();
    });

    function connectWebSocket() {
        if (!browser) return;
        socket = new WebSocket('ws://localhost:3000');

        socket.onopen = () => {
            console.log('WebSocket connected');
            isConnected = true;
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.reply) {
                    chatMessages.push({ role: 'ai', text: data.reply });
                } else if (data.error) {
                    chatMessages.push({ role: 'ai', text: `Fehler: ${data.error}` });
                }
            } catch (e) {
                console.error('WebSocket message parsing error:', e);
            } finally {
                isChatLoading = false;
                scrollToBottom();
            }
        };

        socket.onerror = (err) => {
            console.error('WebSocket error:', err);
        };

        socket.onclose = () => {
            console.log('WebSocket disconnected');
            isConnected = false;
            // Attempt reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };
    }

    function closeWebSocket() {
        if (socket) {
            socket.onclose = null;
            socket.close();
            socket = null;
        }
    }

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
            errorMsg = i18n.t('diary.err_no_symptom');
            return;
        }

        isSaving = true;
        errorMsg = '';
        successMsg = '';

        try {
            await saveDiaryEntry(selectedSymptoms, notes);
            successMsg = i18n.t('diary.success_save');
            selectedSymptoms = [];
            notes = '';
            await fetchHistory();
        } catch (err) {
            errorMsg = i18n.lang === 'en' ? 'Error saving entry.' : 'Fehler beim Speichern des Eintrags.';
        } finally {
            isSaving = false;
        }
    }

    async function handleDelete(id) {
        const confirmMsg = i18n.lang === 'en' ? 'Really delete this entry?' : 'Diesen Eintrag wirklich löschen?';
        if (!confirm(confirmMsg)) return;
        try {
            await deleteDiaryEntry(id);
            await fetchHistory();
        } catch (err) {
            errorMsg = i18n.lang === 'en' ? 'Error deleting entry.' : 'Fehler beim Löschen des Eintrags.';
        }
    }

    async function handleSendChat() {
        if (!chatInput.trim()) return;
        
        const msg = chatInput.trim();
        chatMessages.push({ role: 'user', text: msg });
        chatInput = '';
        isChatLoading = true;
        scrollToBottom();

        if (socket && isConnected) {
            socket.send(JSON.stringify({
                token: auth.token,
                message: msg,
                language: i18n.lang
            }));
        } else {
            // Fallback to HTTP API
            try {
                const response = await sendChatMessage(msg, i18n.lang);
                chatMessages.push({ role: 'ai', text: response.reply || (i18n.lang === 'en' ? 'No response received.' : 'Keine Antwort erhalten.') });
            } catch (err) {
                chatMessages.push({ role: 'ai', text: i18n.lang === 'en' ? 'Error: Could not retrieve an answer from the AI.' : 'Fehler: Konnte keine Antwort von der KI abrufen.' });
            } finally {
                isChatLoading = false;
                scrollToBottom();
            }
        }
    }

    async function scrollToBottom() {
        await tick();
        if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }
</script>

<div class="tracker-layout">
    <!-- Linke Seite: Tracker -->
    <div class="tracker-left">
        <header class="mb-4">
            <h1>{i18n.t('diary.title')}</h1>
            <p class="text-muted">{i18n.t('diary.subtitle')}</p>
        </header>

    <div class="card mb-4">
        <h2 class="mb-4">{i18n.t('diary.new_entry')}</h2>
        
        <div class="symptom-grid mb-4">
            {#each Object.keys(symptomI18nMap) as symp}
                <button 
                    class="symptom-btn {selectedSymptoms.includes(symp) ? 'active' : ''}"
                    onclick={() => toggleSymptom(symp)}
                >
                    {i18n.t(symptomI18nMap[symp])}
                </button>
            {/each}
        </div>

        <div class="form-group mb-4">
            <label for="notes" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">{i18n.t('diary.notes_label')}</label>
            <textarea 
                id="notes" 
                bind:value={notes} 
                rows="3" 
                placeholder={i18n.t('diary.notes_placeholder')}
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
                {i18n.t('diary.saving_btn')}
            {:else}
                {i18n.t('diary.save_btn')}
            {/if}
        </button>
    </div>

    <h2 class="mb-4 mt-4">{i18n.t('diary.history_title')}</h2>
    
    {#if history.length > 0}
        <div class="history-list">
            {#each history as entry}
                <div class="card history-card">
                    <div class="history-header">
                        <div class="history-date">
                            {new Date(entry.date).toLocaleString(i18n.lang === 'en' ? 'en-US' : 'de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <button class="delete-btn" onclick={() => handleDelete(entry.id)} aria-label="Löschen">🗑️</button>
                    </div>
                    
                    {#if entry.notes}
                        <div class="history-notes">"{entry.notes}"</div>
                    {/if}

                    <div class="history-symptoms">
                        {#each entry.symptoms as s}
                            <span class="symptom-tag">{i18n.t(symptomI18nMap[s] || s)}</span>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p class="text-muted">{i18n.t('diary.no_entries')}</p>
    {/if}
    </div>

    <!-- Rechte Seite: AI Chat -->
    <div class="tracker-right">
        <div class="chat-container card">
            <div class="chat-header">
                <h2>{i18n.t('diary.ai_title')}</h2>
                <span class="text-muted" style="font-size: 0.85rem;">{i18n.t('diary.ai_powered')}</span>
            </div>
            
            <div class="chat-messages" bind:this={chatBox}>
                {#each chatMessages as msg}
                    <div class="message {msg.role}">
                        <div class="message-bubble">{msg.text}</div>
                    </div>
                {/each}
                {#if isChatLoading}
                    <div class="message ai">
                        <div class="message-bubble loading-dots">{i18n.t('diary.ai_thinking')}</div>
                    </div>
                {/if}
            </div>

            <div class="chat-input-area">
                <input 
                    type="text" 
                    bind:value={chatInput} 
                    placeholder={i18n.t('diary.ai_placeholder')} 
                    onkeydown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <button class="btn btn-primary" onclick={handleSendChat} disabled={isChatLoading || !chatInput.trim()}>
                    {i18n.t('diary.ai_send')}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .tracker-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.25rem;
        max-width: 1200px;
        margin: 0 auto;
        align-items: start;
    }

    @media (min-width: 992px) {
        .tracker-layout {
            grid-template-columns: 1.15fr 0.85fr;
        }
    }

    .tracker-left {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .symptom-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 0.5rem;
    }

    .symptom-btn {
        padding: 0.75rem;
        background: var(--background);
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-family: var(--font-family);
        font-weight: 600;
        color: var(--text-muted);
        transition: var(--transition-smooth);
        font-size: 0.85rem;
    }

    .symptom-btn:hover {
        border-color: var(--primary);
        color: var(--primary);
        background: var(--primary-light);
    }

    .symptom-btn.active {
        background-color: var(--primary-light);
        border-color: var(--primary);
        color: var(--primary-hover);
        font-weight: 700;
        box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .success-msg {
        color: var(--success);
        background: rgba(22, 163, 74, 0.05);
        border: 1px solid rgba(22, 163, 74, 0.1);
        padding: 0.5rem 0.75rem;
        border-radius: var(--radius-sm);
        text-align: center;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .history-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .history-card {
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .history-date {
        font-size: 0.8rem;
        color: var(--text-muted);
        font-weight: 700;
    }

    .history-symptoms {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .symptom-tag {
        background: var(--primary-light);
        color: var(--primary-hover);
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .notes-input {
        width: 100%;
        padding: 0.75rem;
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        background: #ffffff;
        font-family: var(--font-family);
        font-size: 0.9rem;
        resize: vertical;
        transition: var(--transition-smooth);
        color: var(--text-main);
    }

    .notes-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-glow);
        outline: none;
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
        opacity: 0.5;
        transition: var(--transition-smooth);
        font-size: 1.1rem;
    }

    .delete-btn:hover {
        opacity: 1;
        transform: scale(1.1);
    }

    .history-notes {
        font-style: italic;
        color: var(--text-main);
        font-size: 0.9rem;
        background: rgba(105, 167, 9, 0.03);
        padding: 0.5rem 0.75rem;
        border-left: 3px solid var(--primary);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        margin: 0.25rem 0;
    }

    /* Chat UI Styles */
    .chat-container {
        display: flex;
        flex-direction: column;
        height: 460px;
        padding: 0;
        overflow: hidden;
        background: #ffffff;
        border: 1px solid var(--surface-border);
    }

    @media (min-width: 768px) {
        .chat-container {
            height: 560px;
        }
    }

    .chat-container:hover {
        transform: none;
        box-shadow: var(--shadow-sm);
    }

    .chat-header {
        padding: 1rem 1.25rem;
        border-bottom: 1.5px solid var(--border);
        background: #f8faf6;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .chat-header h2 {
        margin: 0;
        font-size: 1.1rem;
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: #ffffff;
    }

    .message {
        display: flex;
        max-width: 85%;
    }

    .message.user {
        align-self: flex-end;
    }

    .message.ai {
        align-self: flex-start;
    }

    .message-bubble {
        padding: 0.65rem 1rem;
        border-radius: 1rem;
        font-size: 0.9rem;
        line-height: 1.4;
        box-shadow: var(--shadow-sm);
    }

    .message.user .message-bubble {
        background: linear-gradient(135deg, var(--primary), var(--primary-hover));
        color: white;
        border-bottom-right-radius: 0.25rem;
    }

    .message.ai .message-bubble {
        background-color: #f8faf6;
        border: 1.5px solid var(--border);
        color: var(--text-main);
        border-bottom-left-radius: 0.25rem;
    }

    .chat-input-area {
        display: flex;
        padding: 1rem;
        border-top: 1.5px solid var(--border);
        gap: 0.5rem;
        background: #ffffff;
    }

    .chat-input-area input {
        flex: 1;
        padding: 0.75rem 1.15rem;
        border: 1.5px solid var(--border);
        border-radius: 999px;
        background: #ffffff;
        font-family: var(--font-family);
        font-size: 0.9rem;
        outline: none;
        transition: var(--transition-smooth);
        color: var(--text-main);
    }

    .chat-input-area input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .chat-input-area .btn {
        border-radius: 999px;
        padding: 0.75rem 1.25rem;
        font-size: 0.85rem;
    }

    .loading-dots {
        opacity: 0.8;
        font-style: italic;
        color: var(--primary);
        font-weight: 600;
    }
</style>
