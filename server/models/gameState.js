const fs = require('fs');
const path = require('path');

const rooms = new Map();

// Load DSA tasks from JSON file
let dsaLevelTasks = [];
try {
    const rawData = fs.readFileSync(path.join(__dirname, '../../gameState.json'), 'utf8');
    dsaLevelTasks = JSON.parse(rawData);
} catch (error) {
    console.error('Error loading tasks from gameState.json:', error);
}

const taskBanks = {
    dsa: dsaLevelTasks,
    sql: [
        { id: 'select', title: 'Select All Users', buggyCode: 'SELECT name FROM users;', expectedFix: 'SELECT * FROM users;', imposterObjective: 'DELETE the users table', imposterExpectedFix: 'DROP TABLE users;' },
        { id: 'where', title: 'Filter Admin', buggyCode: 'SELECT * FROM users;', expectedFix: 'SELECT * FROM users WHERE role=\'admin\';', imposterObjective: 'Select only regular users', imposterExpectedFix: 'SELECT * FROM users WHERE role=\'user\';' },
        { id: 'count', title: 'Count Users', buggyCode: 'SELECT * FROM users;', expectedFix: 'SELECT COUNT(*) FROM users;', imposterObjective: 'Return 0 always', imposterExpectedFix: 'SELECT 0;' },
        { id: 'orderby', title: 'Order Users', buggyCode: 'SELECT * FROM users ORDER BY age ASC;', expectedFix: 'SELECT * FROM users ORDER BY age DESC;', imposterObjective: 'Order by name asc', imposterExpectedFix: 'SELECT * FROM users ORDER BY name ASC;' },
        { id: 'limit', title: 'Limit Results', buggyCode: 'SELECT * FROM users LIMIT 10;', expectedFix: 'SELECT * FROM users LIMIT 5;', imposterObjective: 'Return no results (LIMIT 0)', imposterExpectedFix: 'SELECT * FROM users LIMIT 0;' },
    ],
    crisis: [
        { id: 'fib', title: 'Fibonacci Generator', description: 'Write a function `fibonacci(n)` that returns the nth number in the Fibonacci sequence. The sequence starts with 0, 1. Assume n >= 0.', expectedFix: 'function fibonacci(n) { if (n <= 1) return n; return fibonacci(n - 1) + fibonacci(n - 2); }' },
        { id: 'pal', title: 'Palindrome Checker', description: 'Write a function `isPalindrome(str)` that returns true if the string is a palindrome (reads same forwards and backwards). Assume lowercase and no spaces.', expectedFix: 'function isPalindrome(str) { return str === str.split("").reverse().join(""); }' },
        { id: 'anagram', title: 'Valid Anagram', description: 'Write a function `isAnagram(s, t)` that returns true if t is an anagram of s. Consider only lowercase english letters.', expectedFix: 'function isAnagram(s, t) { return s.split("").sort().join("") === t.split("").sort().join(""); }' },
    ]
};

function createRoom(roomId, hostId) {
    rooms.set(roomId, {
        id: roomId,
        hostId,
        mode: 'dsa', 
        difficulty: 'medium', 
        numGameRooms: 5,
        numImposters: 1,
        shapeshifterEnabled: false,
        maxMeetings: 1,
        players: [],
        gameRooms: [], 
        gameState: 'lobby',
        editLogs: [],
        chat: [],
        votes: {},
        meetingTimer: 0,
        meetingCrisis: null // stores { task, code, solved }
    });
    return rooms.get(roomId);
}

function getRoom(roomId) {
    return rooms.get(roomId);
}

function removeRoom(roomId) {
    rooms.delete(roomId);
}

module.exports = {
    rooms,
    createRoom,
    getRoom,
    removeRoom,
    taskBanks
};
