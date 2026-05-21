const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { RegisterDTO, LoginDTO, OnboardingDTO, UserResponseDTO } = require('./dtos');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-key-for-pollenradar-milestone-2';
const PORT = 3000;

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
    
    db.run(
        `UPDATE users SET allergens = ?, gps_enabled = ? WHERE id = ?`,
        [allergensJson, gpsEnabledInt, req.user.id],
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

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
