import React, { useState } from 'react';
import { socket } from '../socket';
import { FaUserSecret, FaCopy, FaUser } from 'react-icons/fa';
import RulesPopup from '../components/RulesPopup';
import ProfilePopup from '../components/ProfilePopup';

export default function Lobby({ room, currentUser, onLogout }) {
    const [username, setUsername] = useState(currentUser || '');
    const [roomIdInput, setRoomIdInput] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    if (!room) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 w-full">
                {currentUser && (
                    <button
                        onClick={() => setShowProfile(true)}
                        className="fixed top-4 right-4 z-50 bg-[#4a68af] text-white border-[4px] border-black rounded-lg px-4 py-2 font-black uppercase tracking-widest flex items-center gap-2 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-blue-600 transition-all text-sm md:text-base"
                    >
                        <FaUser /> Account
                    </button>
                )}
                {showProfile && <ProfilePopup currentUser={currentUser} onClose={() => setShowProfile(false)} />}
                
                <div className="bg-[#d2d6df] border-[5px] border-black rounded-[2.5rem] p-8 w-full max-w-md shadow-[8px_8px_0_rgba(0,0,0,1)]">
                    <div className="flex justify-center mb-6">
                        <FaUserSecret className="text-6xl text-black" />
                    </div>
                    <h2 className="text-4xl font-black text-center mb-6 text-white tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px black' }}>HOST / JOIN</h2>
                    
                    <div className="flex gap-2 mb-6 p-2 bg-[#a3aab8] rounded-xl border-[4px] border-black shadow-inner">
                        <button className={`flex-1 py-3 rounded-lg text-sm font-black tracking-widest uppercase transition-colors border-[3px] ${!isJoining ? 'bg-[#78c82a] text-white border-black shadow-[0_4px_0_#000]' : 'bg-transparent border-transparent text-black/50 hover:text-black'}`} onClick={() => setIsJoining(false)}>Create</button>
                        <button className={`flex-1 py-3 rounded-lg text-sm font-black tracking-widest uppercase transition-colors border-[3px] ${isJoining ? 'bg-[#78c82a] text-white border-black shadow-[0_4px_0_#000]' : 'bg-transparent border-transparent text-black/50 hover:text-black'}`} onClick={() => setIsJoining(true)}>Join</button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input 
                                placeholder="YOUR NAME" 
                                autoFocus={!currentUser}
                                disabled={!!currentUser}
                                className={`flex-1 w-full bg-white border-[4px] border-black rounded-2xl p-4 outline-none transition-colors uppercase font-black tracking-wider text-black placeholder-[#a3aab8] text-xl ${currentUser ? 'opacity-70 cursor-not-allowed' : ''}`}
                                value={username} 
                                onChange={e => setUsername(e.target.value.toUpperCase().slice(0, 10))} 
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && username && (!isJoining || roomIdInput)) {
                                        if (isJoining) socket.emit('join_room', { roomId: roomIdInput, username });
                                        else socket.emit('create_room', { username });
                                    }
                                }}
                            />
                            {onLogout && (
                                <button 
                                    className="px-4 bg-red-500 text-white border-[4px] border-black rounded-2xl font-black uppercase text-sm shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                                    onClick={onLogout}
                                >
                                    LOGOUT
                                </button>
                            )}
                        </div>
                        {isJoining && (
                            <input 
                                placeholder="ROOM CODE" 
                                className="w-full bg-white border-[4px] border-black rounded-2xl p-4 outline-none transition-colors uppercase font-black tracking-wider text-black placeholder-[#a3aab8] text-xl text-center"
                                value={roomIdInput} 
                                onChange={e => setRoomIdInput(e.target.value.toUpperCase().slice(0, 5))} 
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && username && roomIdInput) {
                                        socket.emit('join_room', { roomId: roomIdInput, username });
                                    }
                                }}
                            />
                        )}
                        <button 
                            className="w-full btn-chunky bg-[#78c82a] text-white mt-2 py-4 border-black disabled:opacity-50 font-black text-2xl tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]"
                            onClick={() => {
                                if (isJoining) socket.emit('join_room', { roomId: roomIdInput, username });
                                else socket.emit('create_room', { username });
                            }}
                            disabled={!username || (isJoining && !roomIdInput)}
                        >
                            {isJoining ? 'JOIN' : 'CREATE'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const [mode, setMode] = useState('dsa');
    const [numGameRooms, setNumGameRooms] = useState('5');
    const [difficulty, setDifficulty] = useState('medium');
    const [numImposters, setNumImposters] = useState('1');
    const [shapeshifterEnabled, setShapeshifterEnabled] = useState(false);
    const [maxMeetings, setMaxMeetings] = useState('1');
    const isHost = room.hostId === socket.id;

    return (
        <div className="h-full flex flex-col p-8 relative">
            <RulesPopup page="lobby" />
            {currentUser && (
                <button
                    onClick={() => setShowProfile(true)}
                    className="fixed top-4 right-[160px] md:right-[200px] z-50 bg-[#4a68af] text-white border-[4px] border-black rounded-lg px-4 py-2 font-black uppercase tracking-widest flex items-center gap-2 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-blue-600 transition-all text-sm md:text-base"
                >
                    <FaUser /> Account
                </button>
            )}
            {showProfile && <ProfilePopup currentUser={currentUser} onClose={() => setShowProfile(false)} />}
            
            <div className="text-center mb-8 pb-4 border-b-[4px] border-black/10">
                <h2 className="text-4xl font-black mb-2 tracking-widest uppercase text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px black' }}>Lobby</h2>
                <div className="flex justify-center items-center gap-4 mt-3 text-black font-black tracking-widest uppercase text-xl">
                    Room Code: <span className="font-mono text-black bg-white border-[4px] border-black rounded-xl px-4 py-2 shadow-[2px_2px_0_rgba(0,0,0,1)]">{room.id}</span>
                    <button 
                        className="p-3 bg-white rounded-xl border-[4px] border-black active:translate-y-1 shadow-[4px_4px_0_rgba(0,0,0,1)] active:shadow-[0_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center text-xl"
                        title="Copy Code"
                        onClick={() => navigator.clipboard.writeText(room.id)}
                    >
                        <FaCopy />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 content-start overflow-y-auto min-h-0 p-4">
                {room.players.map((p, idx) => (
                    <div key={idx} className="bg-white border-[4px] border-black rounded-2xl p-4 flex flex-col items-center gap-3 relative shadow-[4px_4px_0_#000]">
                        <div className="w-16 h-16 bg-gray-200 border-[4px] border-black rounded-xl flex items-center justify-center text-3xl font-black text-black">
                            {p.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-black text-lg uppercase truncate w-full text-center text-black">{p.username}</span>
                        {p.id === room.hostId && <span className="absolute -top-3 -right-3 text-[10px] uppercase font-black text-white bg-red-500 border-[3px] border-black px-2 py-1 rounded-lg rotate-12">Host</span>}
                    </div>
                ))}
            </div>

            {isHost && (
                <div className="mt-8 pt-6 border-t-[4px] border-black/10 flex flex-col items-center gap-6">
                    <div className="flex flex-wrap justify-center items-center gap-6">
                        {/* Game Base Settings */}
                        <div className="flex flex-col items-center gap-1">
                            <label className="text-black font-black uppercase text-[12px] bg-white px-2 border-2 border-black rounded-t-lg -mb-3 z-10 w-fit">Game Mode</label>
                            <select 
                                value={mode} 
                                onChange={e => setMode(e.target.value)}
                                className="bg-white border-[4px] border-black text-black font-black uppercase px-3 pt-3 pb-2 rounded-xl outline-none w-40 text-center"
                            >
                                <option value="dsa">DSA</option>
                                <option value="sql" disabled>SQL</option>
                            </select>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <label className="text-black font-black uppercase text-[12px] bg-white px-2 border-2 border-black rounded-t-lg -mb-3 z-10 w-fit">Map Size</label>
                            <select 
                                value={numGameRooms} 
                                onChange={e => setNumGameRooms(e.target.value)}
                                className="bg-white border-[4px] border-black text-black font-black uppercase px-3 pt-3 pb-2 rounded-xl outline-none w-40 text-center"
                            >
                                {[5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} Rooms</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <label className="text-black font-black uppercase text-[12px] bg-white px-2 border-2 border-black rounded-t-lg -mb-3 z-10 w-fit">Difficulty</label>
                            <select 
                                value={difficulty} 
                                onChange={e => setDifficulty(e.target.value)}
                                className="bg-white border-[4px] border-black text-black font-black uppercase px-3 pt-3 pb-2 rounded-xl outline-none w-40 text-center"
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>

                        {/* Social Deduction Settings */}
                        <div className="flex flex-col items-center gap-1">
                            <label className="text-white bg-red-600 font-black uppercase text-[12px] px-2 border-2 border-black rounded-t-lg -mb-3 z-10 w-fit drop-shadow-[1px_1px_0_#000]">Imposters</label>
                            <select 
                                value={numImposters} 
                                onChange={e => setNumImposters(e.target.value)}
                                className="bg-white border-[4px] border-black text-red-600 font-black uppercase px-3 pt-3 pb-2 rounded-xl outline-none w-40 text-center"
                            >
                                {[1,2,3].map(n => <option key={n} value={n}>{n} Imposter{n > 1 ? 's' : ''}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <label className="text-black font-black uppercase text-[12px] bg-white px-2 border-2 border-black rounded-t-lg -mb-3 z-10 w-fit">Shapeshift</label>
                            <select 
                                value={shapeshifterEnabled.toString()} 
                                onChange={e => setShapeshifterEnabled(e.target.value === 'true')}
                                className="bg-white border-[4px] border-black text-black font-black uppercase px-3 pt-3 pb-2 rounded-xl outline-none w-40 text-center"
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </select>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <label className="text-black font-black uppercase text-[12px] bg-white px-2 border-2 border-black rounded-t-lg -mb-3 z-10 w-fit">Meetings</label>
                            <select 
                                value={maxMeetings} 
                                onChange={e => setMaxMeetings(e.target.value)}
                                className="bg-white border-[4px] border-black text-black font-black uppercase px-3 pt-3 pb-2 rounded-xl outline-none w-40 text-center"
                            >
                                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / Player</option>)}
                            </select>
                        </div>
                    </div>
                    <button 
                        className="mt-4 bg-[#78c82a] text-white px-12 py-5 btn-chunky border-[5px] border-black w-full max-w-xl text-3xl font-black tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]"
                        style={{ WebkitTextStroke: '2px black' }}
                        onClick={() => socket.emit('start_game', { roomId: room.id, mode, numGameRooms, difficulty, numImposters, shapeshifterEnabled, maxMeetings })}
                        disabled={room.players.length < 2 || room.players.length <= parseInt(numImposters)}
                    >
                        START GAME
                    </button>
                </div>
            )}
            {!isHost && (
                <div className="mt-8 pt-6 border-t-[4px] border-black/10 text-center text-black font-black tracking-widest uppercase text-xl">
                    Waiting for captain to start...
                </div>
            )}
        </div>
    );
}
