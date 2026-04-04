import React, { useEffect } from 'react';
import { FaHistory, FaSkull, FaTrophy, FaUserAstronaut, FaUserSecret } from 'react-icons/fa';

export default function Result({ room, socket }) {
    const isHost = room.hostId === socket.id;
    const isGameOver = !!room.winner;

    const handleNextPhase = () => {
        if (isHost) {
            if (isGameOver) {
                socket.emit('next_phase', { roomId: room.id, phase: 'lobby' });
            } else {
                socket.emit('next_phase', { roomId: room.id, phase: 'playing' });
            }
        }
    };

    const ejected = room.lastEjected;

    useEffect(() => {
        if (ejected) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const audioCtx = new AudioContext();
                const gain = audioCtx.createGain();
                gain.connect(audioCtx.destination);
                
                // Vacuum sound (white noise with fading)
                const bufferSize = 2 * audioCtx.sampleRate;
                const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                
                const whiteNoise = audioCtx.createBufferSource();
                whiteNoise.buffer = noiseBuffer;
                
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 4);
                
                whiteNoise.connect(filter);
                filter.connect(gain);
                
                gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 4);
                
                whiteNoise.start();
                whiteNoise.stop(audioCtx.currentTime + 4);

                // Sudden "thump/whoosh" at the start
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(60, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.8);
                const oscGain = audioCtx.createGain();
                osc.connect(oscGain);
                oscGain.connect(audioCtx.destination);
                oscGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
                oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.8);
                
            } catch (e) {
                console.error("Audio error:", e);
            }
        }
    }, [ejected]);

    return (
        <div className="flex flex-col h-full overflow-y-auto relative bg-[#cbd5e1] text-black w-full overflow-hidden">
            <div className="w-full flex-1 flex flex-col justify-center items-center py-16 text-center min-h-[400px]">
                {isGameOver ? (
                    <div className="w-full py-16 bg-white border-y-[6px] border-black shadow-[0_10px_0_rgba(0,0,0,0.2)]">
                        <h1 className="text-5xl md:text-8xl font-black mb-4 text-yellow-500 uppercase tracking-widest flex justify-center items-center gap-6 drop-shadow-[4px_4px_0_#000]" style={{ WebkitTextStroke: '3px black' }}>
                            <FaTrophy className="text-yellow-500" /> GAME OVER <FaTrophy className="text-yellow-500" />
                        </h1>
                        <div className="text-3xl md:text-5xl font-black mt-8 tracking-widest uppercase">
                            {room.winner === 'crewmates' ? (
                                <span className="text-white flex justify-center items-center gap-4 drop-shadow-[3px_3px_0_#000]" style={{ WebkitTextStroke: '2px black' }}><FaUserAstronaut /> CREWMATES WIN</span>
                            ) : (
                                <span className="text-red-500 flex justify-center items-center gap-4 drop-shadow-[3px_3px_0_#000]" style={{ WebkitTextStroke: '2px black' }}><FaUserSecret /> IMPOSTERS WIN</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-[#020617] overflow-hidden pointer-events-none z-0">
                            {/* Stars background */}
                            {[...Array(40)].map((_, i) => (
                                <div key={i} className="absolute bg-white rounded-full opacity-50 animate-pulse" style={{
                                    width: Math.random() * 2 + 1 + 'px',
                                    height: Math.random() * 2 + 1 + 'px',
                                    top: Math.random() * 100 + '%',
                                    left: Math.random() * 100 + '%',
                                    animationDelay: Math.random() * 5 + 's'
                                }}></div>
                            ))}
                            {ejected && (
                                <div className="absolute top-[20%] left-[-20%] animate-[eject_8s_linear_infinite] drop-shadow-[2px_2px_0_#000] opacity-100">
                                    <FaUserAstronaut className={`text-[120px] md:text-[200px] ${ejected.role === 'imposter' ? 'text-red-500' : 'text-white'}`} style={{ WebkitTextStroke: '4px black' }}/>
                                </div>
                            )}
                        </div>
                        <div className="w-full py-20 bg-black border-y-[6px] border-white shadow-[0_10px_0_#000] z-10 relative">
                            <div className="flex justify-center items-center gap-4 text-2xl md:text-4xl font-black tracking-widest uppercase drop-shadow-[2px_2px_0_#fff]">
                                {ejected ? (
                                    <div className="text-white flex flex-col items-center gap-6" style={{ WebkitTextStroke: '1px black' }}>
                                        <div className="flex items-center tracking-widest text-center">
                                            <span className="text-white font-black mr-4 drop-shadow-[2px_2px_0_#fff]">{ejected.username}</span> 
                                            was ejected.
                                        </div>
                                        <div className={`text-xl md:text-2xl mt-4 font-mono tracking-widest px-4 py-2 bg-white border-[4px] border-black rounded-lg shadow-[4px_4px_0_#000] ${ejected.role === 'imposter' ? 'text-red-600' : 'text-blue-600'}`} style={{ WebkitTextStroke: '0' }}>
                                            They were {ejected.role === 'imposter' ? 'an Imposter 🔪' : 'a Crewmate 🛠️'}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-white italic tracking-widest bg-black px-6 py-4 border-[4px] border-white">No one was ejected. (Skipped / Tied)</span>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="px-8 pb-8 flex flex-col md:flex-row gap-8 max-w-6xl mx-auto w-full z-10 shrink-0 mt-8">
                {/* L: Voting Summary */}
                <div className="flex-1 bg-white p-6 border-[4px] border-black rounded-2xl shadow-[8px_8px_0_#000]">
                    <h2 className="text-xl font-black tracking-widest uppercase mb-4 flex items-center gap-2 border-b-[4px] border-black/10 pb-2">
                        <span className="text-black border-[3px] border-black bg-gray-200 p-2 rounded-lg">🗳️</span> Voting Results
                    </h2>
                    <div className="space-y-3 font-mono font-bold">
                        {room.players.map(p => {
                            if (p.isDead && p.id !== ejected?.id) return null; // Only show living players' votes + the newly dead guy's vote
                            const votedForId = room.votes[p.id];
                            const votedForName = votedForId === 'skip' ? 'Skipped' 
                                : room.players.find(x => x.id === votedForId)?.username || 'No Vote';
                            
                            return (
                                <div key={p.id} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg border-[3px] border-black">
                                    <span className={`uppercase tracking-wider font-black ${p.isDead ? 'text-red-500 line-through' : 'text-black'}`}>{p.username}</span>
                                    <span className="text-gray-600 text-xs font-black">voted <span className="text-white bg-black px-3 py-1 ml-2 border-[2px] border-black rounded-lg">{votedForName}</span></span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {isGameOver && (
                    <div className="flex-1 bg-white p-6 border-[4px] border-black rounded-2xl shadow-[8px_8px_0_#000] flex flex-col min-h-0">
                        {/* R: Suspicious Activity (Edit Logs) */}
                        <h2 className="text-xl font-black tracking-widest uppercase mb-4 flex items-center gap-2 shrink-0 text-black border-b-[4px] border-black/10 pb-2">
                            <FaHistory className="text-purple-600" /> Suspicious Activity logs
                        </h2>
                        <div className="flex-1 overflow-y-auto pr-2">
                            {room.editLogs.length === 0 ? (
                                <div className="text-gray-500 font-black italic p-4 text-center bg-gray-100 rounded-lg border-[3px] border-black shadow-inner">No code was edited.</div>
                            ) : (
                                <div className="space-y-3 font-mono">
                                    {room.editLogs.map((log, i) => {
                                        const player = room.players.find(p => p.id === log.playerId);
                                        const date = new Date(log.timestamp);
                                        return (
                                            <div key={i} className="flex gap-4 items-center bg-gray-100 p-3 rounded-lg border-[3px] border-black shadow-[2px_2px_0_#000]">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-black text-black uppercase tracking-widest mb-1">{player?.username || 'Unknown'} <span className="text-[10px] text-gray-500 float-right">{date.toLocaleTimeString()}</span></div>
                                                    <div className="text-xs text-black font-bold truncate">Edited: <span className="font-black text-blue-600">{log.taskId || 'Code'}</span></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isHost && (
                <div className="p-8 mt-auto flex justify-center bg-transparent z-10 shrink-0">
                    <button 
                        className={`px-16 py-5 btn-chunky border-black font-black tracking-widest text-2xl uppercase text-white shadow-[0_6px_0_#000] drop-shadow-[2px_2px_0_#000] ${
                            isGameOver ? 'bg-purple-600 hover:bg-purple-500' : 'bg-green-500 hover:bg-green-400'
                        }`}
                        style={{ WebkitTextStroke: '1px black' }}
                        onClick={handleNextPhase}
                    >
                        {isGameOver ? 'Return to Lobby' : 'Next Round'}
                    </button>
                </div>
            )}
            {!isHost && (
                <div className="p-8 mt-auto text-center font-black tracking-widest text-black/50 uppercase z-10 shrink-0 animate-pulse text-xl">
                    Waiting for captain to {isGameOver ? 'return to lobby' : 'initiate next round'}...
                </div>
            )}
        </div>
    );
}
