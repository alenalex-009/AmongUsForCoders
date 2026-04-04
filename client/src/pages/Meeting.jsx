import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash';
import { FaHeartbeat, FaSkullCrossbones } from 'react-icons/fa';
import RulesPopup from '../components/RulesPopup';

export default function Meeting({ room, socket }) {
    const me = room.players.find(p => p.id === socket.id);
    const [chatMsg, setChatMsg] = useState('');
    const [votedFor, setVotedFor] = useState(room.votes[socket.id] || null);
    
    // Revive Voting
    const [reviveVotedFor, setReviveVotedFor] = useState(room.reviveVotes?.[socket.id] || null);
    const corruptedTasks = room.tasks.filter(t => t.isCorrupted);

    const [crisisCode, setCrisisCode] = useState(room.meetingCrisis?.code || '');
    const [validationMsg, setValidationMsg] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const editorRef = useRef(null);
    const chatContainerRef = useRef(null);
    const chatEndRef = useRef(null);

    const isHost = room.hostId === socket.id;
    const isDead = me?.isDead;
    const crisis = room.meetingCrisis;

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [room.chat]);

    useEffect(() => {
        const handleValid = ({ taskId, isCorrect }) => {
            if (taskId === 'crisis') {
                setValidationMsg(isCorrect ? '✅ Accepted!' : '❌ Incorrect output/logic.');
                setTimeout(() => setValidationMsg(null), 3000);
            }
        };
        const handleCodeBcast = ({ code }) => setCrisisCode(code);

        socket.on('task_validation_result', handleValid);
        socket.on('meeting_code_bcast', handleCodeBcast);
        return () => {
            socket.off('task_validation_result', handleValid);
            socket.off('meeting_code_bcast', handleCodeBcast);
        };
    }, [socket]);

    useEffect(() => {
        if (!crisis?.solved) return;
        setCrisisCode(crisis.code);
    }, [crisis?.solved, crisis?.code]);

    const handleSkipCrisis = () => {
        if (isHost && !room.meetingCrisis?.solved) {
            socket.emit('skip_meeting_crisis', { roomId: room.id });
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (chatMsg.trim() && !isDead) { // Ghosts shouldn't reveal things in live chat
            socket.emit('send_message', { roomId: room.id, message: chatMsg });
            setChatMsg('');
        }
    };

    const handleVote = (playerId) => {
        if (!votedFor && !isDead) {
            setVotedFor(playerId);
            socket.emit('submit_vote', { roomId: room.id, votedForId: playerId });
        }
    };

    const handleReviveVote = (taskId) => {
        if (!reviveVotedFor && !isDead) {
            setReviveVotedFor(taskId);
            socket.emit('submit_revive_vote', { roomId: room.id, taskId });
        }
    };

    const handleCodeChangeThrottled = useRef(
        debounce((newCode, roomId) => {
            socket.emit('meeting_code_update', { roomId, code: newCode });
        }, 100)
    ).current;

    const onCodeChange = (value) => {
        if (crisis?.solved) return; 
        // Ghosts can help edit crisis code!
        setCrisisCode(value);
        handleCodeChangeThrottled(value, room.id);
    };

    const handleSubmitCrisis = () => {
        if (!crisis?.solved && !isCompiling) {
            setIsCompiling(true);
            // Simulate compilation time
            setTimeout(() => {
                socket.emit('meeting_code_update', { roomId: room.id, code: crisisCode });
                socket.emit('submit_meeting_crisis', { roomId: room.id });
                setIsCompiling(false);
            }, 1000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden text-black relative">
            <RulesPopup page="meeting" />
            {isDead && (
                <div className="w-full bg-red-600 text-white py-2 text-center font-black tracking-widest z-50 text-sm border-b-[4px] border-black flex justify-center items-center gap-2 uppercase shrink-0">
                    YOU ARE DEAD. (You can type code, but you cannot vote or chat).
                </div>
            )}
            {/* MAIN CONTENT AREA: SCROLLABLE VIRTUAL ARENA */}
            <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-6">
                
                {/* TOP ROW: VOTE & CHAT (SIDE-BY-SIDE) */}
                <div className="flex flex-col md:flex-row gap-6 mt-4 md:h-[650px] shrink-0">
                    {/* LEFT: Voting Area */}
                    <div className={`flex-1 flex flex-col border-[4px] border-black rounded-2xl shadow-[0_8px_0_#000] h-full bg-[#cbd5e1] pb-4 ${isDead ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
                        <div className="w-full bg-red-500 text-white py-3 font-black border-b-[4px] border-black flex items-center justify-center gap-2 tracking-widest uppercase text-xl drop-shadow-[2px_2px_0_#000] shrink-0" style={{ WebkitTextStroke: '1px black' }}>
                            <FaSkullCrossbones className="mb-1" /> EJECT VOTE
                        </div>
                        
                        <div className="w-full p-6 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                            {room.players.map(p => {
                                const isPlayerDead = p.isDead;
                                return (
                                    <button 
                                        key={p.id}
                                        onClick={() => handleVote(p.id)}
                                        disabled={!!votedFor || isPlayerDead || isDead}
                                        className={`relative p-4 rounded-xl flex flex-col items-center gap-2 transition-all btn-chunky ${
                                            votedFor === p.id 
                                            ? 'bg-[#16a34a] border-black translate-y-2 text-white shadow-none' 
                                            : (isPlayerDead ? 'bg-[#9ca3af] border-black opacity-50 grayscale cursor-not-allowed text-gray-700' : 'bg-white hover:bg-gray-100 border-black text-black')
                                        }`}
                                    >
                                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-black text-3xl border-[3px] border-black ${isPlayerDead ? 'bg-gray-400 text-gray-600' : 'bg-gray-200 text-black'}`}>
                                            {p.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className={`text-base font-black uppercase tracking-widest truncate w-full px-1 ${isPlayerDead ? 'line-through text-gray-600' : ''}`}>{p.username}</span>
                                        {votedFor === p.id && <div className="absolute top-2 left-2 text-white text-[10px] font-black px-2 py-1 rounded border-[2px] border-black bg-red-600 rotate-12 drop-shadow-[2px_2px_0_#000]">VOTED</div>}
                                    </button>
                                );
                            })}
                            <div className="col-span-full mt-4">
                                <button 
                                    onClick={() => handleVote('skip')}
                                    disabled={!!votedFor || isDead}
                                    className={`w-full p-4 rounded-xl text-center text-lg font-black tracking-widest uppercase btn-chunky ${
                                        votedFor === 'skip' ? 'bg-[#16a34a] border-black translate-y-2 text-white shadow-none' : 'bg-white border-black text-black hover:bg-gray-100'
                                    }`}
                                >
                                    {votedFor === 'skip' ? 'VOTED SKIP' : 'Skip Vote'}
                                </button>
                            </div>
                        </div>

                        {corruptedTasks.length > 0 && (
                            <div className="px-6 pb-2">
                                <div className="w-full bg-blue-500 text-white p-3 rounded-t-xl font-black border-[4px] border-black flex items-center justify-center gap-2 tracking-widest uppercase text-lg drop-shadow-[2px_2px_0_#000]" style={{ WebkitTextStroke: '1px black' }}>
                                    <FaHeartbeat className="mb-1" /> REVIVE TASK
                                </div>
                                <div className="w-full p-4 bg-white/50 border-x-[4px] border-b-[4px] border-black rounded-b-xl flex flex-col gap-3">
                                    {corruptedTasks.map(t => (
                                        <button 
                                            key={t.id}
                                            onClick={() => handleReviveVote(t.id)}
                                            disabled={!!reviveVotedFor || isDead}
                                            className={`relative p-3 rounded-lg flex flex-col items-start gap-1 transition-all text-left border-[3px] border-black btn-chunky font-black uppercase tracking-wider ${
                                                reviveVotedFor === t.id ? 'bg-green-500 text-white translate-y-1 shadow-none' : 'bg-white text-black'
                                            }`}
                                        >
                                            <span className="text-sm">{t.title}</span>
                                            {reviveVotedFor === t.id && <div className="absolute top-1 right-2 text-white text-[9px] font-black px-2 py-0.5 rounded bg-red-600 rotate-12">VOTED</div>}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => handleReviveVote('skip')}
                                        disabled={!!reviveVotedFor || isDead}
                                        className={`w-full p-2 rounded-lg text-xs font-black uppercase border-[3px] border-black btn-chunky ${
                                            reviveVotedFor === 'skip' ? 'bg-gray-600 text-white translate-y-1 shadow-none' : 'bg-white text-black'
                                        }`}
                                    >
                                        Skip Revive
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Chat Panel */}
                    <div className={`flex-1 flex flex-col border-[4px] border-black rounded-2xl overflow-hidden h-full bg-[#cbd5e1] shadow-[0_8px_0_#000] ${isDead ? 'opacity-70 grayscale pointer-events-none' : ''}`}>
                        <div className="p-4 border-b-[4px] border-black font-black text-white bg-[#4a68af] text-center uppercase tracking-widest text-2xl drop-shadow-[2px_2px_0_#000] shrink-0" style={{ WebkitTextStroke: '1px black' }}>Comms Log</div>
                        <div 
                            ref={chatContainerRef}
                            className="flex-1 overflow-y-auto w-full p-4 space-y-4 font-sans text-sm"
                        >
                            {room.chat.map((c, i) => (
                                <div key={i} className="flex flex-col bg-white border-[3px] border-black rounded-2xl p-4 text-black shadow-[4px_4px_0_#000] break-words whitespace-pre-wrap">
                                    <span className="font-black border-b-2 border-gray-200 pb-1 mb-2 text-gray-700 text-xs uppercase tracking-widest">{c.sender} <span className="font-bold text-[10px] text-gray-400">- Crew</span></span>
                                    <span className="leading-relaxed font-bold text-lg">{c.message}</span>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="p-6 flex gap-3 border-t-[4px] border-black bg-[#cbd5e1] shrink-0">
                            <input 
                                className="flex-1 bg-white border-[4px] border-black px-6 py-4 outline-none focus:bg-gray-50 text-black text-lg font-bold uppercase tracking-widest placeholder-gray-400 rounded-2xl min-w-0"
                                placeholder={isDead ? "> SIGNAL LOST" : "> TX MSG"}
                                value={chatMsg}
                                onChange={e => setChatMsg(e.target.value)}
                                disabled={isDead}
                                autoFocus
                            />
                            <button type="submit" disabled={isDead} className="bg-[#4a68af] text-white px-8 font-black text-3xl btn-chunky border-[4px] border-black drop-shadow-[2px_2px_0_#000] shrink-0">
                                &gt;
                            </button>
                        </form>
                    </div>
                </div>

                {/* BOTTOM SECTION: Shared Crisis Editor (User scrolls down for this) */}
                <div className={`w-full flex flex-col bg-[#1e1e1e] border-[4px] border-black rounded-3xl shadow-[0_12px_0_#000] overflow-hidden relative ${isDead ? 'opacity-90' : ''}`}>
                    <div className="bg-red-500 p-6 border-b-[4px] border-black z-10 text-white shrink-0">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <span className="font-black flex items-center gap-3 text-3xl tracking-tighter uppercase drop-shadow-[3px_3px_0_#000]" style={{ WebkitTextStroke: '1px black' }}>
                                🚨 CRITICAL FAILURE 🚨 
                            </span>
                            <div className="flex gap-4 items-center">
                                <span className={`font-mono px-6 py-3 rounded-2xl font-black tracking-widest border-[4px] border-black shadow-[6px_6px_0_#000] text-3xl bg-red-900 text-white ${room.meetingTimer <= 10 ? 'animate-pulse text-red-500' : ''}`}>
                                    {Math.floor(room.meetingTimer / 60)}:{(room.meetingTimer % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>
                        {/* The Task Description */}
                        <div className="bg-white border-[4px] border-black rounded-2xl p-6 text-black shadow-[6px_6px_0_#000] mt-2">
                            <div className="font-black text-red-600 mb-2 uppercase tracking-widest text-2xl">{crisis?.task?.title}</div>
                            <div className="leading-relaxed whitespace-pre-wrap font-mono uppercase font-bold tracking-widest text-lg">{crisis?.task?.description}</div>
                        </div>
                    </div>

                    <div className="min-h-[500px] relative border-b-[4px] border-black">
                        {validationMsg && (
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 px-10 py-4 rounded-2xl font-black border-[5px] border-black text-black bg-white shadow-[8px_8px_0_#000] text-2xl animate-bounce uppercase tracking-widest">
                                {validationMsg}
                            </div>
                        )}
                        {crisis?.solved && (
                            <div className="absolute inset-0 bg-green-500/90 backdrop-blur-md z-10 flex items-center justify-center">
                                <div className="bg-green-400 border-[8px] border-black font-black text-white px-12 py-8 rounded-3xl shadow-[12px_12px_0_#000] text-6xl rotate-[-3deg] drop-shadow-[6px_6px_0_#000] flex flex-col items-center gap-4" style={{ WebkitTextStroke: '3px black' }}>
                                    <span>CRISIS AVERTED</span>
                                    <span className="text-2xl opacity-80 tracking-[0.5em]">SYSTEM STABLE</span>
                                </div>
                            </div>
                        )}
                        <Editor
                            height="500px"
                            theme="vs-dark"
                            language={room.mode === 'sql' ? 'sql' : 'javascript'}
                            value={crisisCode}
                            onChange={onCodeChange}
                            options={{
                                readOnly: crisis?.solved || isCompiling,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 20,
                                padding: { top: 24, bottom: 24 },
                                fontFamily: 'Fira Code, monospace',
                                lineNumbers: 'on',
                                roundedSelection: true,
                            }}
                            onMount={(editor) => { editorRef.current = editor; }}
                        />
                    </div>

                    {/* Actions Area */}
                    <div className="p-8 bg-gray-200 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-base text-gray-800 font-black tracking-widest uppercase max-w-xl leading-loose text-center md:text-left">
                            <span className="text-red-600 block mb-1">TERMINAL SHARED:</span>
                            The meeting will not conclude until the failure is suppressed. All players share this terminal concurrently.
                        </div>
                        <div className="flex gap-6 shrink-0">
                            {isHost && (
                                <button 
                                    className={`px-12 py-4 rounded-xl font-black tracking-widest uppercase btn-chunky border-[4px] border-black text-2xl bg-gray-800 hover:bg-gray-700 text-white drop-shadow-[4px_4px_0_#000] ${room.meetingCrisis?.solved ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                    style={{ WebkitTextStroke: '1px black' }}
                                    onClick={handleSkipCrisis}
                                    disabled={room.meetingCrisis?.solved || isCompiling}
                                >
                                    {room.meetingCrisis?.solved ? 'SOLVED' : 'FORCE SKIP'}
                                </button>
                            )}
                            <button 
                                className={`px-16 py-4 rounded-xl font-black tracking-widest uppercase btn-chunky border-[4px] border-black text-2xl relative ${
                                    !crisis?.solved 
                                    ? 'bg-red-600 hover:bg-red-500 text-white drop-shadow-[4px_4px_0_#000]' 
                                    : 'bg-green-600 text-white opacity-80 cursor-not-allowed shadow-[0_6px_0_#000]'
                                }`}
                                style={!crisis?.solved ? { WebkitTextStroke: '1px black' } : {}}
                                onClick={handleSubmitCrisis}
                                disabled={crisis?.solved || isCompiling}
                            >
                                {isCompiling ? (
                                    <span className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                                        COMPILING...
                                    </span>
                                ) : (
                                    crisis?.solved ? "SUCCESS" : "EXECUTE"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
