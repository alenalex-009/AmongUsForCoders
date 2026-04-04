const { getRoom, createRoom, taskBanks, rooms } = require('../models/gameState');
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../../server/users.json');

function updatePlayerAnalytics(username, updateFn) {
    if (!username) return;
    try {
        if (!fs.existsSync(usersFilePath)) return;
        const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        const lowerUser = username.toLowerCase();
        if (users[lowerUser] && users[lowerUser].analytics) {
            updateFn(users[lowerUser].analytics);
            fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
        }
    } catch (e) {
        console.error("Failed to update analytics for", username, e);
    }
}

const meetingIntervals = new Map();

function normalizeCode(code) {
    if (typeof code !== 'string') return '';
    return code.replace(/\s+/g, '').toLowerCase().replace(/["']/g, "'");
}

function checkWinCondition(room) {
    const living = room.players.filter(p => !p.isDead);
    const livingImps = living.filter(p => p.role === 'imposter').length;
    const livingCrew = living.filter(p => p.role === 'crewmate').length;

    if (livingImps === 0) return 'crewmates';
    if (livingImps >= livingCrew) return 'imposters';

    const allTasksCompleted = room.tasks.every(t => t.completed && !t.isCorrupted);
    if (allTasksCompleted) return 'crewmates';

    const allTasksCorrupted = room.tasks.every(t => t.isCorrupted);
    if (allTasksCorrupted && room.tasks.length > 0) return 'imposters';

    return null;
}

function handleSocketEvents(io) {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('create_room', ({ username }) => {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let roomId = '';
            for (let i = 0; i < 5; i++) {
                roomId += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            // Simple regen if collision happens
            while (getRoom(roomId)) {
                roomId = '';
                for (let i = 0; i < 5; i++) {
                    roomId += characters.charAt(Math.floor(Math.random() * characters.length));
                }
            }

            const room = createRoom(roomId, socket.id);
            const player = { id: socket.id, username, role: 'crewmate', currentRoom: null, isDead: false, isEjected: false, meetingsLeft: 1, shapeshiftedAs: null, canShapeshift: false, hasShapeshiftedThisRound: false };
            room.players.push(player);
            
            socket.join(roomId);
            socket.emit('room_created', { roomId });
            io.to(roomId).emit('room_update', room);
        });

        socket.on('join_room', ({ roomId, username }) => {
            let room = getRoom(roomId);
            if (!room) {
                socket.emit('join_error', { message: 'Room not found. Check the code and try again.' });
                return;
            }
            if (room.gameState !== 'lobby') {
                socket.emit('join_error', { message: 'Game has already started.' });
                return;
            }
            
            const player = { id: socket.id, username, role: 'crewmate', currentRoom: null, isDead: false, isEjected: false, meetingsLeft: 1, shapeshiftedAs: null, canShapeshift: false, hasShapeshiftedThisRound: false };
            room.players.push(player);
            
            socket.join(roomId);
            io.to(roomId).emit('room_update', room);
        });

        socket.on('start_game', ({ roomId, mode, numGameRooms = 5, difficulty = 'medium', numImposters = 1, shapeshifterEnabled = false, maxMeetings = 1 }) => {
            const room = getRoom(roomId);
            if (!room || room.hostId !== socket.id) return;
            
            room.mode = mode || 'dsa';
            room.difficulty = difficulty;
            room.numGameRooms = parseInt(numGameRooms, 10);
            room.numImposters = parseInt(numImposters, 10);
            room.shapeshifterEnabled = shapeshifterEnabled;
            room.maxMeetings = parseInt(maxMeetings, 10);
            room.winner = null;
            
            const roomNames = ['Electrical', 'Navigation', 'Reactor', 'MedBay', 'Security', 'Admin', 'O2', 'Weapons', 'Shields', 'Cafeteria'];
            const tasksPerRoom = difficulty === 'easy' ? 2 : (difficulty === 'hard' ? 4 : 3);
            
            room.gameRooms = [];
            room.tasks = [];
            
            const availableTasks = taskBanks[room.mode].filter(t => t.difficulty === room.difficulty);
            
            // Fallback if no tasks for selected difficulty
            const finalTasks = availableTasks.length > 0 ? availableTasks : taskBanks[room.mode].filter(t => t.difficulty === 'easy');
            
            finalTasks.sort(() => Math.random() - 0.5);
            let taskIndex = 0;

            for (let i = 0; i < room.numGameRooms; i++) {
                const gameRoomId = roomNames[i % roomNames.length].toLowerCase();
                const gameRoomName = roomNames[i % roomNames.length];
                
                const roomTasks = [];
                for (let j = 0; j < tasksPerRoom; j++) {
                    const t = finalTasks[taskIndex % finalTasks.length];
                    taskIndex++;
                    const instTaskId = `${gameRoomId}_${t.id}_${j}`;
                    
                    const newTask = {
                        id: instTaskId,
                        roomId: gameRoomId,
                        title: t.title,
                        description: t.description || '',
                        buggyCode: t.buggyCode,
                        expectedFix: t.expectedFix,
                        imposterObjective: t.imposterObjective,
                        crewmateObjective: t.crewmateObjective || t.description || '',
                        imposterExpectedFix: t.imposterExpectedFix,
                        currentCode: typeof t.buggyCode === 'object' ? { ...t.buggyCode } : { javascript: t.buggyCode },
                        lockedBy: null,
                        completed: false,
                        isCorrupted: false
                    };
                    roomTasks.push(instTaskId);
                    room.tasks.push(newTask);
                }
                
                room.gameRooms.push({
                    id: gameRoomId,
                    name: gameRoomName,
                    taskIds: roomTasks
                });
            }

            // Assign Imposters
            let impostersToAssign = Math.min(room.numImposters, room.players.length - 1);
            let playerIndices = room.players.map((_, i) => i).sort(() => Math.random() - 0.5);
            const imposterIndices = playerIndices.slice(0, impostersToAssign);

            room.players.forEach((p, idx) => {
                p.role = imposterIndices.includes(idx) ? 'imposter' : 'crewmate';
                p.currentRoom = null;
                p.isDead = false;
                p.isEjected = false;
                p.meetingsLeft = room.maxMeetings;
                p.shapeshiftedAs = null;
                p.canShapeshift = false;
                p.hasShapeshiftedThisRound = false;
            });

            if (room.shapeshifterEnabled && imposterIndices.length > 0) {
                // Give shapeshift to one random imposter
                const ssIdx = imposterIndices[Math.floor(Math.random() * imposterIndices.length)];
                room.players[ssIdx].canShapeshift = true;
            }

            room.gameState = 'playing';
            io.to(roomId).emit('room_update', room);
        });

        socket.on('shapeshift', ({ roomId, targetId }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'playing') return;
            const player = room.players.find(p => p.id === socket.id);
            if (player && player.role === 'imposter' && player.canShapeshift && !player.isDead && !player.hasShapeshiftedThisRound) {
                if (targetId) {
                    player.shapeshiftedAs = targetId;
                    player.hasShapeshiftedThisRound = true; // Consumed for this round
                    io.to(roomId).emit('room_update', room);
                }
            }
        });

        socket.on('move_to_room', ({ roomId, gameRoomId }) => {
            const room = getRoom(roomId);
            if (!room) return;
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.currentRoom = gameRoomId;
                io.to(roomId).emit('room_update', room);
            }
        });

        socket.on('lock_task', ({ roomId, taskId }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'playing') return;
            // Removed isDead check; ghosts can lock tasks
            
            const task = room.tasks.find(t => t.id === taskId);
            if (task && (task.lockedBy === null || task.lockedBy === socket.id) && !task.completed) {
                room.tasks.forEach(t => { if (t.lockedBy === socket.id) t.lockedBy = null; });
                task.lockedBy = socket.id;
                task.lockedAt = Date.now();
                io.to(roomId).emit('room_update', room);
            }
        });

        socket.on('unlock_task', ({ roomId, taskId }) => {
            const room = getRoom(roomId);
            if (!room) return;
            
            const task = room.tasks.find(t => t.id === taskId);
            if (task && task.lockedBy === socket.id) {
                task.lockedBy = null;
                io.to(roomId).emit('room_update', room);
            }
        });

        socket.on('code_update', ({ roomId, taskId, newCode, previousCode, language }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'playing') return;
            
            const task = room.tasks.find(t => t.id === taskId);
            if (task && task.lockedBy === socket.id && !task.completed) {
                task.currentCode[language] = newCode;
                room.editLogs.push({
                    playerId: socket.id,
                    taskId: task.title,
                    previousCode,
                    newCode,
                    timestamp: Date.now()
                });
                socket.to(roomId).emit('code_update_bcast', { taskId, newCode, language });
            }
        });

        socket.on('submit_task', ({ roomId, taskId, language }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'playing') return;

            const player = room.players.find(p => p.id === socket.id);
            const task = room.tasks.find(t => t.id === taskId);
            if (!player || !task || task.lockedBy !== socket.id) return;

            const lang = language || 'javascript';
            const isImposter = player.role === 'imposter';
            const expectedNorm = normalizeCode(task.expectedFix[lang]);
            const imposterExpectedNorm = task.imposterExpectedFix ? normalizeCode(task.imposterExpectedFix[lang]) : null;
            const currentNorm = normalizeCode(task.currentCode[lang]);
            const isCorrectCheck = currentNorm === expectedNorm;

            if (isImposter) {
                // Imposter must match the exact imposterExpectedFix to corrupt the task
                const isImposterCorrect = imposterExpectedNorm ? (currentNorm === imposterExpectedNorm) : true;
                
                if (isImposterCorrect) {
                    task.completed = true;
                    task.isCorrupted = true;
                    task.lockedBy = null;
                    socket.emit('task_validation_result', { taskId, isCorrect: true, isCorrupted: true });
                    room.winner = checkWinCondition(room);
                    if (room.winner) room.gameState = 'result';
                    io.to(roomId).emit('room_update', room);
                } else {
                    // Imposter failed their specific corruption objective
                    socket.emit('task_validation_result', { taskId, isCorrect: false });
                }
            } else if (isCorrectCheck) {
                // Crewmate submits correctly
                task.completed = true;
                task.lockedBy = null;
                
                if (task.lockedAt) {
                    const timeTaken = Date.now() - task.lockedAt;
                    updatePlayerAnalytics(player.username, (analytics) => {
                        const diff = room.difficulty || 'medium';
                        if (analytics.taskTimes[diff]) {
                            analytics.taskTimes[diff].count += 1;
                            analytics.taskTimes[diff].totalMs += timeTaken;
                        }
                    });
                }

                socket.emit('task_validation_result', { taskId, isCorrect: true });
                room.winner = checkWinCondition(room);
                if (room.winner) room.gameState = 'result';
                io.to(roomId).emit('room_update', room);
            } else {
                // Crewmate fails
                socket.emit('task_validation_result', { taskId, isCorrect: false });
            }
        });

        socket.on('call_meeting', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'playing') return;
            const player = room.players.find(p => p.id === socket.id);
            if (!player || player.isDead || player.meetingsLeft <= 0) return;

            player.meetingsLeft--;

            // release all locks and resets disguises
            room.tasks.forEach(t => t.lockedBy = null);
            room.players.forEach(p => {
                p.shapeshiftedAs = null;
                // Leave hasShapeshiftedThisRound untouched until end of meeting
            });

            room.gameState = 'meeting';
            room.chat = [];
            room.votes = {};
            room.reviveVotes = {}; // Reset revival votes
            
            const crisis = taskBanks.crisis[Math.floor(Math.random() * taskBanks.crisis.length)];
            room.meetingCrisis = {
                task: crisis,
                code: '// Write solution here...\n',
                solved: false
            };

            // Start synchronized meeting timer
            if (meetingIntervals.has(roomId)) {
                clearInterval(meetingIntervals.get(roomId));
            }

            room.meetingTimer = 120; // 2 minutes

            const interval = setInterval(() => {
                const r = getRoom(roomId);
                if (!r || r.gameState !== 'meeting') {
                    clearInterval(interval);
                    meetingIntervals.delete(roomId);
                    return;
                }

                if (r.meetingTimer > 0) {
                    r.meetingTimer--;
                }

                // Auto-transition check: Timer is 0 AND Crisis is Solved
                if (r.meetingTimer === 0 && r.meetingCrisis?.solved) {
                    clearInterval(interval);
                    meetingIntervals.delete(roomId);
                    // Trigger the result phase transition automatically
                    handleNextPhase(io, roomId, 'result');
                } else {
                    io.to(roomId).emit('room_update', r);
                }
            }, 1000);

            meetingIntervals.set(roomId, interval);
            io.to(roomId).emit('room_update', room);
        });

        const handleNextPhase = (io, roomId, phase) => {
            // Helper to trigger the next_phase logic from the server
            // We'll reuse the logic in the 'next_phase' listener
            const room = getRoom(roomId);
            if (!room) return;

            if (meetingIntervals.has(roomId)) {
                clearInterval(meetingIntervals.get(roomId));
                meetingIntervals.delete(roomId);
            }

            // Manually trigger the phase change logic
            performPhaseTransition(io, room, phase);
        };

        const performPhaseTransition = (io, room, phase) => {
            if (room.gameState === 'meeting' && phase === 'result') {
                // Tally Ejection Votes
                const voteCounts = {};
                Object.values(room.votes).forEach(vid => {
                    voteCounts[vid] = (voteCounts[vid] || 0) + 1;
                });
                let maxVotes = 0;
                let ejectedId = null;
                let tie = false;
                
                Object.entries(voteCounts).forEach(([vid, count]) => {
                    if (count > maxVotes) {
                        maxVotes = count;
                        ejectedId = vid;
                        tie = false;
                    } else if (count === maxVotes) {
                        tie = true;
                    }
                });

                if (!tie && ejectedId && ejectedId !== 'skip') {
                    const ejectedPlayer = room.players.find(p => p.id === ejectedId);
                    if (ejectedPlayer) {
                        ejectedPlayer.isDead = true;
                        ejectedPlayer.isEjected = true;
                        room.lastEjected = ejectedPlayer;
                    }
                } else {
                    room.lastEjected = null; // Skipped or Tied
                }

                // Tally Revive Votes
                let reviveCounts = {};
                Object.values(room.reviveVotes || {}).forEach(tid => {
                    if (tid !== 'skip') {
                        reviveCounts[tid] = (reviveCounts[tid] || 0) + 1;
                    }
                });
                let maxReviveVotes = 0;
                let revivedTaskId = null;
                let reviveTie = false;
                
                Object.entries(reviveCounts).forEach(([tid, count]) => {
                    if (count > maxReviveVotes) {
                        maxReviveVotes = count;
                        revivedTaskId = tid;
                        reviveTie = false;
                    } else if (count === maxReviveVotes) {
                        reviveTie = true;
                    }
                });

                if (!reviveTie && revivedTaskId) {
                    const revivedTask = room.tasks.find(t => t.id === revivedTaskId);
                    if (revivedTask) {
                        revivedTask.isCorrupted = false;
                        revivedTask.completed = false;
                        revivedTask.currentCode = typeof revivedTask.buggyCode === 'object' ? { ...revivedTask.buggyCode } : { javascript: revivedTask.buggyCode };
                        room.lastRevivedTask = revivedTask;
                    }
                } else {
                    room.lastRevivedTask = null;
                }

                room.players.forEach(p => p.hasShapeshiftedThisRound = false);
                room.winner = checkWinCondition(room);
                if (room.winner) {
                    room.players.forEach(p => {
                        const isWinner = (p.role === 'imposter' && room.winner === 'imposters') || (p.role === 'crewmate' && room.winner === 'crewmates');
                        if (isWinner) {
                            updatePlayerAnalytics(p.username, (analytics) => {
                                analytics.gamesWon += 1;
                                if (analytics.roleWins[p.role] !== undefined) {
                                    analytics.roleWins[p.role] += 1;
                                }
                            });
                        }
                    });
                }
            }

            room.gameState = phase;
            if (phase === 'lobby') {
                room.editLogs = [];
                room.votes = {};
                room.reviveVotes = {};
                room.chat = [];
                room.tasks = [];
                room.gameRooms = [];
                room.winner = null;
                room.meetingCrisis = null;
                room.lastEjected = null;
                room.lastRevivedTask = null;
                room.meetingTimer = 0;
            } else if (phase === 'playing') {
                room.votes = {};
                room.reviveVotes = {};
                room.chat = [];
                room.lastEjected = null;
                room.lastRevivedTask = null;
                room.meetingCrisis = null;
                room.editLogs = [];
                room.meetingTimer = 0;
            }
            io.to(room.id).emit('room_update', room);
        };

        socket.on('meeting_code_update', ({ roomId, code }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'meeting' || room.meetingCrisis?.solved) return;

            room.meetingCrisis.code = code;
            socket.to(roomId).emit('meeting_code_bcast', { code });
        });
        socket.on('submit_meeting_crisis', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'meeting' || room.meetingCrisis?.solved) return;
            
            const isCorrect = normalizeCode(room.meetingCrisis.code) === normalizeCode(room.meetingCrisis.task.expectedFix);
            if (isCorrect) {
                room.meetingCrisis.solved = true;
                if (room.meetingTimer === 0) {
                    handleNextPhase(io, roomId, 'result');
                } else {
                    io.to(roomId).emit('room_update', room);
                }
            } else {
                socket.emit('task_validation_result', { taskId: 'crisis', isCorrect: false });
            }
        });

        socket.on('skip_meeting_crisis', ({ roomId }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'meeting' || room.hostId !== socket.id) return;
            room.meetingCrisis.solved = true;
            if (room.meetingTimer === 0) {
                handleNextPhase(io, roomId, 'result');
            } else {
                io.to(roomId).emit('room_update', room);
            }
        });

        socket.on('send_message', ({ roomId, message }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'meeting') return;
            
            const player = room.players.find(p => p.id === socket.id);
            if (player && !player.isDead) { 
                const chatMsg = { sender: player.username, message, timestamp: Date.now() };
                room.chat.push(chatMsg);
                io.to(roomId).emit('room_update', room);
            }
        });

        socket.on('submit_vote', ({ roomId, votedForId }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'meeting') return;
            const player = room.players.find(p => p.id === socket.id);
            if (player?.isDead) return;
            
            room.votes[socket.id] = votedForId;
            io.to(roomId).emit('room_update', room);
        });

        socket.on('submit_revive_vote', ({ roomId, taskId }) => {
            const room = getRoom(roomId);
            if (!room || room.gameState !== 'meeting') return;
            const player = room.players.find(p => p.id === socket.id);
            if (player?.isDead) return;
            
            if (!room.reviveVotes) room.reviveVotes = {};
            room.reviveVotes[socket.id] = taskId;
            io.to(roomId).emit('room_update', room);
        });

        socket.on('next_phase', ({ roomId, phase }) => {
            const room = getRoom(roomId);
            if (!room || room.hostId !== socket.id) return;
            
            handleNextPhase(io, roomId, phase);
        });

        socket.on('disconnect', () => {
            rooms.forEach(room => {
                let changed = false;
                room.tasks?.forEach(t => {
                    if (t.lockedBy === socket.id) {
                        t.lockedBy = null;
                        changed = true;
                    }
                });
                if (changed) {
                    io.to(room.id).emit('room_update', room);
                }
            });
        });
    });
}

module.exports = handleSocketEvents;
