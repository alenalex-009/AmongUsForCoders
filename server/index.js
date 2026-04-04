const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const fs = require('fs');
const path = require('path');
const handleSocketEvents = require('./socket/handlers');

const app = express();
app.use(cors());
app.use(express.json());

const usersFilePath = path.join(__dirname, 'users.json');

// Initialize users.json if it doesn't exist
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify({}));
}

app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const lowerUser = username.toLowerCase();
    
    if (users[lowerUser]) {
        return res.status(400).json({ error: "Username already exists" });
    }
    
    const initialAnalytics = {
        gamesWon: 0,
        roleWins: { crewmate: 0, imposter: 0 },
        taskTimes: {
            easy: { count: 0, totalMs: 0 },
            medium: { count: 0, totalMs: 0 },
            hard: { count: 0, totalMs: 0 }
        }
    };
    
    users[lowerUser] = { username, password, analytics: initialAnalytics };
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    
    res.json({ success: true, username });
});

app.get('/api/user/:username', (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: "Username required" });
    
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const lowerUser = username.toLowerCase();
    
    if (!users[lowerUser]) {
        return res.status(404).json({ error: "User not found" });
    }
    
    let analytics = users[lowerUser].analytics;
    if (!analytics) {
        analytics = {
            gamesWon: 0,
            roleWins: { crewmate: 0, imposter: 0 },
            taskTimes: {
                easy: { count: 0, totalMs: 0 },
                medium: { count: 0, totalMs: 0 },
                hard: { count: 0, totalMs: 0 }
            }
        };
        users[lowerUser].analytics = analytics;
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    }
    
    res.json({ success: true, username: users[lowerUser].username, analytics });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    
    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const lowerUser = username.toLowerCase();
    
    if (!users[lowerUser] || users[lowerUser].password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
    }
    
    res.json({ success: true, username: users[lowerUser].username });
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

handleSocketEvents(io);

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
