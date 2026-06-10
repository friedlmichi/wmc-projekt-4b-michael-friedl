import { auth } from './state/auth.svelte.js';

const API_BASE = 'http://localhost:3000/api';

export async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
        // No ternary operators
        let errorMessage = 'An error occurred';
        if (data.error) {
            errorMessage = data.error;
        }
        throw new Error(errorMessage);
    }

    return data;
}

export async function register(first_name, last_name, email, password) {
    // Sending DTO-like payload
    return await apiCall('/register', 'POST', {
        first_name,
        last_name,
        email,
        password
    });
}

export async function login(email, password) {
    return await apiCall('/login', 'POST', {
        email,
        password
    });
}

export async function updateOnboarding(allergens, gpsEnabled, language = 'de') {
    return await apiCall('/onboarding', 'PUT', { allergens, gps_enabled: gpsEnabled, language });
}

export async function getUser() {
    return await apiCall('/user', 'GET');
}

export async function getPollenData(lat, lon) {
    return await apiCall(`/pollen?lat=${lat}&lon=${lon}`, 'GET');
}

export async function saveDiaryEntry(symptoms, notes = '') {
    return await apiCall('/diary', 'POST', { symptoms, notes });
}

export async function getDiaryEntries() {
    return await apiCall('/diary', 'GET');
}

export async function deleteDiaryEntry(id) {
    return await apiCall(`/diary/${id}`, 'DELETE');
}

export async function sendChatMessage(message, language = 'de') {
    return await apiCall('/chat', 'POST', { message, language });
}
