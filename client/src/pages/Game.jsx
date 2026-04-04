import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash';
import { FaLock, FaLockOpen, FaCheckCircle, FaDoorOpen, FaArrowLeft, FaExclamationTriangle, FaGhost, FaMask, FaSkullCrossbones } from 'react-icons/fa';
import RulesPopup from '../components/RulesPopup';

export default function Game({ room, socket }) {
    const me = room.players.find(p => p.id === socket.id);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('javascript');
    const [code, setCode] = useState('');
    const [validationMsg, setValidationMsg] = useState(null);
    const editorRef = useRef(null);

    const currentRoomId = me.currentRoom;
    const activeTask = room.tasks.find(t => t.id === selectedTaskId);
    const isMyLock = activeTask?.lockedBy === socket.id;
    const isDead = me.isDead;
    const isImposter = me.role === 'imposter';

    const [showRoleReveal, setShowRoleReveal] = useState(() => {
        const key = `reveal_${room.id}_${me.id}`;
        if (sessionStorage.getItem(key)) return false;
        return true;
    });

    const playSound = (type) => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const gain = audioCtx.createGain();
            gain.connect(audioCtx.destination);
            
            if (type === 'success') {
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                osc.connect(gain);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.5);
            } else if (type === 'error') {
                const osc = audioCtx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
                osc.connect(gain);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.4);
            } else if (type === 'lock') {
                const osc = audioCtx.createOscillator();
                osc.type = 'square';
                osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
                osc.connect(gain);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
            }
        } catch (e) {}
    };

    useEffect(() => {
        if (showRoleReveal) {
            const key = `reveal_${room.id}_${me.id}`;
            sessionStorage.setItem(key, 'true');
            
            if (isImposter) {
                playSound('error'); // Deep sound for imposter
            } else {
                playSound('success'); // Bright sound for crewmate
            }

            const timer = setTimeout(() => setShowRoleReveal(false), 3500);
            return () => clearTimeout(timer);
        }
    }, [showRoleReveal, room.id, me.id, isImposter]);

    useEffect(() => {
        if (!isMyLock) {
            if (activeTask && activeTask.currentCode) {
                setCode(activeTask.currentCode[selectedLanguage] || '');
            } else {
                setCode('');
            }
        }
    }, [activeTask?.currentCode, isMyLock, selectedTaskId, selectedLanguage]);

    useEffect(() => {
        const handleBcast = ({ taskId, newCode, language }) => {
            if (taskId === selectedTaskId && (!isMyLock || language !== selectedLanguage)) {
                if (language === selectedLanguage) setCode(newCode);
            }
        };
        const handleValid = ({ taskId, isCorrect, isCorrupted }) => {
            if (taskId === selectedTaskId) {
                if (isCorrupted) {
                    setValidationMsg('☣️ Task Corrupted Successfully!');
                    playSound('error');
                    // Shake effect could be triggered here via state if needed
                } else {
                    setValidationMsg(isCorrect ? '✅ Correct! Task Completed!' : '❌ Incorrect output/logic. Try again.');
                    playSound(isCorrect ? 'success' : 'error');
                }
                setTimeout(() => setValidationMsg(null), 3000);
            }
        };

        socket.on('code_update_bcast', handleBcast);
        socket.on('task_validation_result', handleValid);
        return () => {
            socket.off('code_update_bcast', handleBcast);
            socket.off('task_validation_result', handleValid);
        };
    }, [socket, selectedTaskId, isMyLock]);

    const handleCodeChange = useRef(
        debounce((newCode, previousCode, roomId, taskId, language) => {
            socket.emit('code_update', { roomId, taskId, newCode, previousCode, language });
        }, 300)
    ).current;

    const onChange = (value) => {
        // Ghost can edit!
        if (isMyLock) {
            const previousCode = code;
            setCode(value);
            handleCodeChange(value, previousCode, room.id, selectedTaskId, selectedLanguage);
        }
    };

    const handleSelectTask = (taskId) => setSelectedTaskId(taskId);

    const handleEnterRoom = (gameRoomId) => {
        socket.emit('move_to_room', { roomId: room.id, gameRoomId });
        setSelectedTaskId(null);
    };

    const handleLeaveRoom = () => {
        socket.emit('move_to_room', { roomId: room.id, gameRoomId: null });
        setSelectedTaskId(null);
    };

    const toggleLock = () => {
        if (!activeTask) return;
        if (isMyLock) {
            socket.emit('unlock_task', { roomId: room.id, taskId: selectedTaskId });
        } else if (!activeTask.lockedBy && !activeTask.completed) {
            socket.emit('lock_task', { roomId: room.id, taskId: selectedTaskId });
            playSound('lock');
        }
    };

    const handleSubmit = () => {
        if (isMyLock) {
            socket.emit('submit_task', { roomId: room.id, taskId: selectedTaskId, language: selectedLanguage });
        }
    };

    const handleCallMeeting = () => {
        if (!isDead) { // Ghosts cannot call meetings
            socket.emit('call_meeting', { roomId: room.id });
        }
    };

    const handleShapeshift = (e) => {
        if (!me.hasShapeshiftedThisRound) {
            socket.emit('shapeshift', { roomId: room.id, targetId: e.target.value });
        }
    };

    const visiblePlayers = room.players.filter(p => p.currentRoom === currentRoomId).map(p => {
        if (p.shapeshiftedAs && p.id !== me.id) {
            const target = room.players.find(x => x.id === p.shapeshiftedAs);
            if (target) {
                return { ...p, displayUsername: target.username, isDisguised: true };
            }
        }
        const selfDisguise = p.shapeshiftedAs && p.id === me.id;
        const target = selfDisguise ? room.players.find(x => x.id === p.shapeshiftedAs) : null;
        return { 
            ...p, 
            displayUsername: p.username, 
            isDisguised: selfDisguise,
            disguiseName: target ? target.username : null
        };
    });

    const visibleTasks = room.tasks.filter(t => t.roomId === currentRoomId);
    const livingCrewmates = room.players.filter(p => !p.isDead && p.id !== me.id);

    const getLockerName = (playerId) => {
        const p = room.players.find(x => x.id === playerId);
        if (!p) return 'Unknown';
        if (p.isDead) return 'Ghost';
        if (p.shapeshiftedAs && p.id !== socket.id) {
            const target = room.players.find(x => x.id === p.shapeshiftedAs);
            return target ? target.username : p.username;
        }
        return p.username;
    };

    return (
        <div className={`flex flex-col md:flex-row h-full relative border-0 bg-transparent text-black overflow-hidden`}>
            <RulesPopup page="game" />
            {showRoleReveal && (
                <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0a0a0a] animate-[fadeOut_0.5s_ease-in_3s_forwards]">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent to-[#0a0a0a] z-0 scale-110"></div>
                    <div className={`relative z-10 flex flex-col items-center animate-[zoomIn_1s_ease-out_forwards] scale-110 ${isImposter ? 'drop-shadow-[0_0_50px_rgba(220,38,38,0.8)]' : 'drop-shadow-[0_0_50px_rgba(34,211,238,0.8)]'}`}>
                        {isImposter ? (
                            <FaMask className="text-[150px] text-danger-500 mb-8 animate-[pulse_1s_infinite]" />
                        ) : (
                            <div className="text-[150px] text-primary-400 mb-8 font-black flex animate-[pulse_1s_infinite]">SHHHH...</div>
                        )}
                        <h1 className={`text-6xl md:text-8xl font-black uppercase tracking-[0.2em] bg-clip-text text-transparent ${isImposter ? 'bg-gradient-to-t from-danger-700 to-danger-400' : 'bg-gradient-to-t from-primary-700 to-primary-300'}`}>
                            {isImposter ? 'Imposter' : 'Crewmate'}
                        </h1>
                        <p className={`mt-8 text-2xl md:text-3xl font-mono font-bold tracking-widest uppercase ${isImposter ? 'text-danger-300' : 'text-primary-300'}`}>
                            {isImposter ? 'Corrupt the Codebase.' : 'Repair the Ship.'}
                        </p>
                    </div>
                </div>
            )}

            {isDead && (
                <div className="absolute top-0 left-0 w-full bg-dark-900/90 text-gray-400 p-2 text-center font-black tracking-widest z-50 text-sm flex justify-center items-center gap-4 shadow-xl border-b border-dark-700">
                    <FaGhost className="text-xl" /> YOU ARE A GHOST (You can do tasks, but cannot observe/call meetings) <FaGhost className="text-xl" />
                </div>
            )}

            {/* LEFT: Task/Room List */}
            <div className={`w-full md:w-1/4 border-r-[4px] border-black bg-transparent p-4 flex flex-col gap-4 overflow-y-auto min-h-[12rem] md:min-h-0 ${isDead ? 'mt-10 opacity-80' : ''}`}>
                <div className={`flex flex-col items-center justify-center p-4 font-black uppercase text-center tracking-widest border-[4px] border-black rounded-xl bg-white shadow-[4px_4px_0_#000]`}>
                    <span className="text-[10px] text-gray-500 mb-1">Your Role</span>
                    {me.role === 'imposter' ? <span className="text-red-500 text-xl">Imposter 🔪</span> : <span className="text-black text-xl">Crewmate 🛠️</span>}
                </div>

                {!currentRoomId ? (
                    <>
                        <h3 className={`text-2xl font-black tracking-widest uppercase mb-2 pt-2 border-b-[4px] border-black/10 pb-2 text-black`}>Ship Map</h3>
                        <div className="flex-1 space-y-3">
                            {room.gameRooms.map((gr) => {
                                const playersInRoom = room.players.filter(p => p.currentRoom === gr.id).length;
                                return (
                                    <button 
                                        key={gr.id} 
                                        onClick={() => handleEnterRoom(gr.id)}
                                        className={`w-full p-4 bg-white border-[4px] border-black rounded-lg flex justify-between items-center font-black uppercase text-xl text-black btn-chunky`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <FaDoorOpen className="text-black text-2xl" />
                                            <span>{gr.name}</span>
                                        </div>
                                        {playersInRoom > 0 && (
                                            <span className="bg-blue-500 text-white px-2 py-1 border-[2px] border-black rounded shadow-[2px_2px_0_#000] text-sm font-black">
                                                {playersInRoom} Player{playersInRoom > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between pt-2">
                            <button 
                                onClick={handleLeaveRoom}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-semibold p-2 -ml-2 rounded-lg hover:bg-dark-800"
                            >
                                <FaArrowLeft /> Hallway
                            </button>
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-primary-400 border-b border-dark-700 pb-2">{room.gameRooms.find(r => r.id === currentRoomId)?.name} Tasks</h3>
                        
                        <div className="flex-1 space-y-3">
                            {visibleTasks.map((task) => (
                                <div 
                                    key={task.id} 
                                    onClick={() => handleSelectTask(task.id)}
                                    className={`p-3 border font-mono cursor-pointer transition-all ${
                                        selectedTaskId === task.id ? (isImposter ? 'bg-danger-600/20 border-danger-500 shadow-inner' : 'bg-primary-600/20 border-primary-500 shadow-inner') : (isImposter ? 'bg-dark-900/60 border-danger-900/30' : 'bg-dark-900/60 border-primary-900/30')
                                    } ${task.completed ? 'opacity-50 border-green-500/50' : ''}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className={`font-semibold text-sm ${task.completed && task.isCorrupted && !isImposter ? 'text-danger-500 line-through' : ''}`}>{task.title}</span>
                                        {task.completed && <FaCheckCircle className={task.isCorrupted && isImposter ? 'text-danger-500' : 'text-green-500'} />}
                                        {!task.completed && (task.lockedBy ? <FaLock className={`${isImposter ? 'text-danger-400' : 'text-primary-400'} text-xs drop-shadow-[0_0_5px_currentColor]`} /> : <FaLockOpen className="text-green-400 text-xs drop-shadow-[0_0_5px_currentColor]" />)}
                                    </div>
                                    {task.lockedBy && !task.completed && (
                                        <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Locked by: {getLockerName(task.lockedBy)}</div>
                                    )}
                                </div>
                            ))}
                            {visibleTasks.length === 0 && (
                                <div className="text-gray-500 italic text-sm text-center p-4">No tasks in this room.</div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* CENTER: Editor */}
            <div className={`w-full md:w-2/4 flex flex-col flex-1 h-96 md:h-auto bg-[#1e1e1e] border-r-[4px] border-black relative ${isDead ? 'mt-10' : ''}`}>
                {!activeTask ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <FaDoorOpen className="text-8xl mb-4 opacity-50 text-gray-500" />
                        <p className="text-xl font-black tracking-widest uppercase">{currentRoomId ? 'Select a task to hack.' : 'Awaiting room entry.'}</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-dark-900 p-3 border-b border-dark-700 flex flex-col gap-2">
                            <div className="flex justify-between items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-gray-300 truncate font-semibold">
                                        {activeTask.title}
                                    </span>
                                    {room.mode !== 'sql' && (
                                        <select 
                                            className="bg-dark-800 text-xs text-white border border-dark-600 rounded p-1 outline-none font-mono"
                                            value={selectedLanguage}
                                            onChange={(e) => {
                                                setSelectedLanguage(e.target.value);
                                                if (isMyLock) {
                                                    setCode(activeTask.currentCode[e.target.value] || '');
                                                }
                                            }}
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="cpp">C++</option>
                                            <option value="java">Java</option>
                                        </select>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {activeTask.completed && (
                                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${activeTask.isCorrupted ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-400'}`}>
                                            {activeTask.isCorrupted ? 'Corrupted' : 'Completed'}
                                        </span>
                                    )}
                                    {!activeTask.completed && (
                                        <button 
                                            onClick={toggleLock}
                                            className={`text-xs px-3 py-1 border rounded-full font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                                isMyLock 
                                                ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/40' 
                                                : (activeTask.lockedBy ? 'bg-red-500/20 text-red-500 border-red-500/30 opacity-50 cursor-not-allowed' : 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/40')
                                            }`}
                                            disabled={Boolean(!isMyLock && activeTask.lockedBy)}
                                        >
                                            {isMyLock ? 'Release Lock' : (activeTask.lockedBy ? 'Locked' : 'Take Lock')}
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Imposter Real Objective */}
                            {me.role === 'imposter' && (
                                <div className="bg-red-900/30 border border-red-500/50 rounded p-2 flex items-start gap-2">
                                    <FaExclamationTriangle className="text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-[10px] text-red-400 font-black uppercase tracking-wider mb-0.5">Fake Task vs Real Objective</div>
                                        <div className="text-xs text-gray-300">{activeTask.crewmateObjective || activeTask.description}</div>
                                        <div className="text-xs text-white font-bold mt-1">Your Objective: {activeTask.imposterObjective}</div>
                                    </div>
                                </div>
                            )}

                            {/* Corrupted Warning to Crewmates */}
                            {activeTask.isCorrupted && !isImposter && (
                                <div className="bg-purple-900/40 border border-purple-500/50 rounded p-2 flex items-center justify-center gap-2 mt-2">
                                    <FaSkullCrossbones className="text-purple-400 shrink-0" />
                                    <span className="text-sm text-purple-300 font-black uppercase tracking-widest">Code is Corrupted! Call a meeting to revive!</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-h-[300px] relative">
                            {validationMsg && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-2 rounded-full font-bold shadow-2xl bg-dark-800 border border-dark-600 text-white animate-bounce">
                                    {validationMsg}
                                </div>
                            )}
                            <Editor
                                height="100%"
                                theme="vs-dark"
                                language={room.mode === 'sql' ? 'sql' : selectedLanguage}
                                value={code}
                                onChange={onChange}
                                options={{
                                    readOnly: !isMyLock || activeTask.completed || activeTask.isCorrupted,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 14,
                                }}
                                onMount={(editor) => { editorRef.current = editor; }}
                            />
                        </div>
                        {/* Actions */}
                        <div className="p-4 bg-dark-900 border-t border-dark-700 flex justify-end gap-3">
                            <button 
                                className={`px-8 py-2 rounded font-bold shadow-lg transition-all active:scale-95 ${
                                    isMyLock && !activeTask.completed && !activeTask.isCorrupted ? 'bg-accent hover:bg-purple-500 text-white shadow-accent/20' : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                                }`}
                                onClick={handleSubmit}
                                disabled={!isMyLock || activeTask.completed || activeTask.isCorrupted}
                            >
                                Run Code
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* RIGHT: Players */}
            <div className={`w-full md:w-1/4 p-4 bg-transparent flex flex-col min-h-[12rem] md:min-h-0 pb-32 ${isDead ? 'mt-10 opacity-80' : ''}`}>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    <h3 className={`text-xl font-black uppercase tracking-widest mb-4 px-2 border-b-[4px] border-black/10 pb-2 text-black`}>
                        {currentRoomId ? 'In this Room' : 'In Hallway'}
                    </h3>
                    {visiblePlayers.map((p, idx) => {
                        return (
                            <div 
                                key={idx} 
                                className={`p-4 flex items-center gap-3 bg-white border-[4px] border-black rounded-lg shadow-[4px_4px_0_#000] ${
                                    p.isDead ? 'opacity-50' : ''
                                }`}
                            >
                                <div className={`w-10 h-10 rounded shadow-inner flex items-center justify-center text-xl font-black border-[3px] border-black ${
                                    p.isDead ? 'bg-gray-400 text-gray-600' : 'bg-gray-200 text-black'
                                }`}>
                                    {p.isDead ? <FaGhost /> : p.displayUsername.charAt(0).toUpperCase()}
                                </div>
                                <span className={`font-black uppercase tracking-widest text-sm ${p.isDead ? 'text-gray-500 line-through' : 'text-black'}`}>
                                    {p.displayUsername}
                                </span>
                                {p.isDisguised && p.id === me.id && (
                                    <span className="text-[10px] ml-auto text-purple-600 font-bold uppercase bg-white border-[2px] border-purple-500 px-2 py-1 rounded-lg">Disguised as {p.disguiseName}</span>
                                )}
                                {!p.isDisguised && p.id === me.id && (
                                    <span className="text-[10px] ml-auto text-blue-600 font-bold uppercase bg-white border-[2px] border-blue-500 px-2 py-1 rounded-lg">(You)</span>
                                )}
                            </div>
                        );
                    })}
                    {visiblePlayers.length === 0 && (
                        <div className="text-gray-500 italic font-bold text-sm px-2">It's quiet in here...</div>
                    )}
                </div>
                
                {/* Shapeshifter Menu */}
                {me.canShapeshift && !isDead && (
                    <div className="mb-4 bg-purple-900/20 border border-purple-500/30 p-3 flex flex-col gap-2 relative shadow-inner">
                        <div className="text-purple-400 font-bold text-xs uppercase flex items-center justify-between tracking-widest">
                            <span className="flex items-center gap-2"><FaMask /> Shapeshifter</span>
                            {me.hasShapeshiftedThisRound && <span className="text-[9px] bg-danger-900/50 text-danger-400 px-2 py-1 border border-danger-500/50">USED</span>}
                        </div>
                        <select 
                            className="bg-dark-900/80 border border-purple-500/50 text-white p-2 text-xs font-mono font-bold tracking-widest uppercase outline-none disabled:opacity-50"
                            value={me.shapeshiftedAs || ''}
                            onChange={handleShapeshift}
                            disabled={me.hasShapeshiftedThisRound}
                        >
                            <option value="">No Disguise</option>
                            {livingCrewmates.map(c => (
                                <option key={c.id} value={c.id}>{c.username}</option>
                            ))}
                        </select>
                        <div className="text-[9px] text-gray-500 text-center font-mono uppercase">Can only be used once per round</div>
                    </div>
                )}
            </div>

            {/* GLOBAL EMERGENCY BUTTON */}
            <button 
                className={`fixed bottom-8 right-8 z-[100] w-32 h-32 rounded-full bg-red-600 text-white font-black tracking-widest flex flex-col items-center justify-center gap-1 uppercase transition-[transform] border-[8px] border-black disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:shadow-[0_10px_0_#000] active:translate-y-2 active:shadow-[0_0_0_#000] drop-shadow-[4px_4px_0_#000]`}
                style={{ WebkitTextStroke: '1px black', boxShadow: 'inset 0 10px 20px rgba(255,255,255,0.4), 0 10px 0 #000' }}
                onClick={handleCallMeeting}
                disabled={isDead || me.meetingsLeft <= 0}
            >
                <span className="text-4xl drop-shadow-[2px_2px_0_#000] -mb-2">🚨</span>
                <span className="text-[10px] bg-white text-black font-black border-[3px] border-black mt-2 rounded" style={{ WebkitTextStroke: '0' }}>LIMIT ({me.meetingsLeft})</span>
            </button>
        </div>
    );
}
