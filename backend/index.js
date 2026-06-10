require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./db');
const { RegisterDTO, LoginDTO, OnboardingDTO, UserResponseDTO, SymptomLogDTO } = require('./dtos');

const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const JWT_SECRET = 'super-secret-key-for-pollenradar-milestone-2';
const PORT = 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2) {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}


app.post('/api/register', async (req, res) => {
    const registerDto = new RegisterDTO(req.body);

    if (!registerDto.isValid()) {
        return res.status(400).json({ error: 'All fields (first_name, last_name, email, password) are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        
        db.run(
            `INSERT INTO users (email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?)`,
            [registerDto.email, hashedPassword, registerDto.first_name, registerDto.last_name],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists.' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                
                const userId = this.lastID;
                const token = jwt.sign({ id: userId, email: registerDto.email }, JWT_SECRET);
                
                db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, row) => {
                    if (err || !row) {
                        return res.status(500).json({ error: 'Could not retrieve created user' });
                    }
                    const userResponse = new UserResponseDTO(row);
                    return res.status(201).json({ user: userResponse, token });
                });
            }
        );
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', (req, res) => {
    const loginDto = new LoginDTO(req.body);

    if (!loginDto.isValid()) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [loginDto.email], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!row) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(loginDto.password, row.password_hash);
        
        if (match) {
            const token = jwt.sign({ id: row.id, email: row.email }, JWT_SECRET);
            const userResponse = new UserResponseDTO(row);
            return res.json({ user: userResponse, token });
        } else {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

app.put('/api/onboarding', authenticateToken, (req, res) => {
    const onboardingDto = new OnboardingDTO(req.body);
    const allergensJson = JSON.stringify(onboardingDto.allergens || []);
    let gpsEnabledInt = 0;
    
    if (onboardingDto.gps_enabled) {
        gpsEnabledInt = 1;
    }
    
    const lang = onboardingDto.language || 'de';

    db.run(
        `UPDATE users SET allergens = ?, gps_enabled = ?, language = ? WHERE id = ?`,
        [allergensJson, gpsEnabledInt, lang, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update user onboarding data.' });
            }
            
            db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, row) => {
                if (err || !row) {
                    return res.status(500).json({ error: 'Could not retrieve updated user' });
                }
                const userResponse = new UserResponseDTO(row);
                return res.json({ user: userResponse });
            });
        }
    );
});

app.get('/api/user', authenticateToken, (req, res) => {
    db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userResponse = new UserResponseDTO(row);
        return res.json({ user: userResponse });
    });
});



app.get('/api/pollen', async (req, res) => {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    try {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch from Open-Meteo');
        }
        
        const data = await response.json();
        return res.json(data);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch pollen data' });
    }
});

app.post('/api/diary', authenticateToken, (req, res) => {
    const symptomLog = new SymptomLogDTO(req.body);
    
    if (!symptomLog.isValid()) {
        return res.status(400).json({ error: 'Invalid symptom data' });
    }
    
    const symptomsJson = JSON.stringify(symptomLog.symptoms);
    
    db.run(
        `INSERT INTO symptom_logs (user_id, date, symptoms, notes) VALUES (?, ?, ?, ?)`,
        [req.user.id, symptomLog.date, symptomsJson, symptomLog.notes],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save diary entry' });
            }
            return res.status(201).json({ success: true, id: this.lastID });
        }
    );
});

app.get('/api/diary', authenticateToken, (req, res) => {
    db.all(
        `SELECT * FROM symptom_logs WHERE user_id = ? ORDER BY date DESC`,
        [req.user.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch diary entries' });
            }
            
            const entries = rows.map(row => {
                let parsedSymptoms = [];
                try {
                    parsedSymptoms = JSON.parse(row.symptoms);
                } catch (e) {
                    parsedSymptoms = [];
                }
                return {
                    id: row.id,
                    date: row.date,
                    symptoms: parsedSymptoms,
                    notes: row.notes || ''
                };
            });
            
            return res.json(entries);
        }
    );
});

app.delete('/api/diary/:id', authenticateToken, (req, res) => {
    const entryId = req.params.id;
    
    db.run(
        `DELETE FROM symptom_logs WHERE id = ? AND user_id = ?`,
        [entryId, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete diary entry' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Entry not found or unauthorized' });
            }
            return res.json({ success: true });
        }
    );
});

app.post('/api/chat', authenticateToken, (req, res) => {
    const userMessage = req.body.message;
    const lang = req.body.language || 'de';
    if (!userMessage) return res.status(400).json({ error: 'Message is required' });

    db.all(
        `SELECT date, symptoms, notes FROM symptom_logs WHERE user_id = ? ORDER BY date ASC`,
        [req.user.id],
        async (err, rows) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch logs for chat' });

            let logText = rows.map(r => {
                let symps = [];
                try { symps = JSON.parse(r.symptoms); } catch (e) {}
                const dateStr = new Date(r.date).toLocaleString('de-DE');
                return `Am ${dateStr}: Symptome: ${symps.join(', ')}. Notizen: ${r.notes || 'Keine'}`;
            }).join('\n');

            if (!logText) logText = lang === 'en' ? "The user has no diary entries yet." : "Der Nutzer hat noch keine Tagebucheinträge vorgenommen.";

            let systemPrompt = `Du bist ein hilfsbereiter KI-Assistent für die App 'PollenRadar'. Deine Aufgabe ist es, dem Nutzer basierend auf seinem Symptom-Tagebuch Ratschläge, Vermutungen oder Zusammenfassungen zu geben.
Hier ist das bisherige Symptom-Tagebuch des Nutzers:
${logText}

WICHTIG: Antworte extrem kurz, stichwortartig, prägnant und direkt auf den Punkt. Vermeide lange Floskeln oder Einleitungen. Nutze Bulletpoints für Ratschläge.
Weise ganz kurz darauf hin, dass du kein Arzt bist und dies keine medizinische Diagnose ist.`;

            if (lang === 'en') {
                systemPrompt = `You are a helpful AI assistant for the app 'PollenRadar'. Your task is to give the user advice, hypotheses, or summaries based on their symptom diary.
Here is the user's symptom diary so far:
${logText}

IMPORTANT: Answer extremely short, in bullet points, concise, and directly to the point. Avoid long pleasantries or introductions. Use bullet points for advice.
Briefly state that you are not a doctor and this is not a medical diagnosis.`;
            }

            try {
                const model = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    systemInstruction: systemPrompt
                });
                const result = await model.generateContent(userMessage);
                const response = await result.response;
                const replyText = response.text();
                return res.json({ reply: replyText });
            } catch (aiErr) {
                console.error("Gemini SDK Error:", aiErr);
                return res.status(500).json({ error: 'KI-Fehler: ' + (aiErr.message || 'Unbekannt') });
            }
        }
    );
});

// WebSocket Server Logic for Chat
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established.');

    ws.on('message', async (messageData) => {
        try {
            const data = JSON.parse(messageData);
            const { token, message, language } = data;
            const lang = language || 'de';

            if (!token) {
                ws.send(JSON.stringify({ error: 'Access token required' }));
                return;
            }
            if (!message) {
                ws.send(JSON.stringify({ error: 'Message is required' }));
                return;
            }

            jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
                if (err) {
                    ws.send(JSON.stringify({ error: 'Invalid token' }));
                    return;
                }

                const userId = decodedUser.id;

                db.all(
                    `SELECT date, symptoms, notes FROM symptom_logs WHERE user_id = ? ORDER BY date ASC`,
                    [userId],
                    async (dbErr, rows) => {
                        if (dbErr) {
                            ws.send(JSON.stringify({ error: 'Failed to fetch logs' }));
                            return;
                        }

                        let logText = rows.map(r => {
                            let symps = [];
                            try { symps = JSON.parse(r.symptoms); } catch (e) {}
                            const dateStr = new Date(r.date).toLocaleString('de-DE');
                            return `Am ${dateStr}: Symptome: ${symps.join(', ')}. Notizen: ${r.notes || 'Keine'}`;
                        }).join('\n');

                        if (!logText) {
                            logText = lang === 'en' ? "The user has no diary entries yet." : "Der Nutzer hat noch keine Tagebucheinträge vorgenommen.";
                        }

                        let systemPrompt = `Du bist ein hilfsbereiter KI-Assistent für die App 'PollenRadar'. Deine Aufgabe ist es, dem Nutzer basierend auf seinem Symptom-Tagebuch Ratschläge, Vermutungen oder Zusammenfassungen zu geben.
Hier ist das bisherige Symptom-Tagebuch des Nutzers:
${logText}

WICHTIG: Antworte extrem kurz, stichwortartig, prägnant und direkt auf den Punkt. Vermeide lange Floskeln oder Einleitungen. Nutze Bulletpoints für Ratschläge.
Weise ganz kurz darauf hin, dass du kein Arzt bist und dies keine medizinische Diagnose ist.`;

                        if (lang === 'en') {
                            systemPrompt = `You are a helpful AI assistant for the app 'PollenRadar'. Your task is to give the user advice, hypotheses, or summaries based on their symptom diary.
Here is the user's symptom diary so far:
${logText}

IMPORTANT: Answer extremely short, in bullet points, concise, and directly to the point. Avoid long pleasantries or introductions. Use bullet points for advice.
Briefly state that you are not a doctor and this is not a medical diagnosis.`;
                        }

                        try {
                            const model = genAI.getGenerativeModel({
                                model: "gemini-2.5-flash",
                                systemInstruction: systemPrompt
                            });
                            const result = await model.generateContent(message);
                            const response = await result.response;
                            const replyText = response.text();

                            ws.send(JSON.stringify({ reply: replyText }));
                        } catch (aiErr) {
                            console.error("Gemini WebSocket Error:", aiErr);
                            ws.send(JSON.stringify({ error: 'KI-Fehler: ' + (aiErr.message || 'Unbekannt') }));
                        }
                    }
                );
            });
        } catch (parseErr) {
            console.error("WebSocket message parsing error:", parseErr);
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed.');
    });
});

server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
