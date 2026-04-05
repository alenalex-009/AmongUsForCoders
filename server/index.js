const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const handleSocketEvents = require('./socket/handlers');

const app = express();

// ✅ Middleware
app.use(cors({
    origin: "*", // later replace with frontend URL
    methods: ["GET", "POST"]
}));
app.use(express.json());

// ✅ Root route (fixes "Cannot GET /")
app.get("/", (req, res) => {
    res.send("🚀 AmongUsForCoders Backend is running");
});

// 📁 Users file setup
const usersFilePath = path.join(__dirname, 'users.json');

// Create file if not exists
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify({}));
}

// ================= AUTH ROUTES =================

// ✅ Register
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

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

    users[lowerUser] = {
        username,
        password,
        analytics: initialAnalytics
    };

    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    res.json({ success: true, username });
});

// ✅ Get user
app.get('/api/user/:username', (req, res) => {
    const username = req.params.username;

    if (!username) {
        return res.status(400).json({ error: "Username required" });
    }

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

    res.json({
        success: true,
        username: users[lowerUser].username,
        analytics
    });
});

// ✅ Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
    const lowerUser = username.toLowerCase();

    if (!users[lowerUser] || users[lowerUser].password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({ success: true, username: users[lowerUser].username });
});

// ================= SOCKET SETUP =================

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "https://amongusforcoders-1.onrender.com", // later restrict to frontend URL
        methods: ["GET", "POST"]
    }
});

// ✅ Debug connections
io.on("connection", (socket) => {
    console.log("🔥 User connected:", socket.id);
});

// ✅ Your socket handlers
handleSocketEvents(io);

// ================= START SERVER =================

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});