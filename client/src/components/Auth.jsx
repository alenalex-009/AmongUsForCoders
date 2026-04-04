import React, { useState } from 'react';
import { FaUserSecret } from 'react-icons/fa';

export default function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!username || !password) {
            setError("Username and password are required.");
            return;
        }

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        
        try {
            const res = await fetch(`http://localhost:3001${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                onLogin(data.username);
            } else {
                setError(data.error || "Authentication failed");
            }
        } catch (err) {
            setError("Cannot connect to server. Ensure it is running.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 w-full relative z-10">
            <div className="bg-[#d2d6df] border-[5px] border-black rounded-[2.5rem] p-8 w-full max-w-md shadow-[8px_8px_0_rgba(0,0,0,1)]">
                <div className="flex justify-center mb-6">
                    <FaUserSecret className="text-6xl text-black" />
                </div>
                <h2 className="text-4xl font-black text-center mb-6 text-white tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" style={{ WebkitTextStroke: '2px black' }}>
                    {isLogin ? 'SIGN IN' : 'REGISTER'}
                </h2>
                
                {error && <div className="bg-red-500 text-white font-black p-3 rounded-xl border-[3px] border-black mb-4 text-center">{error}</div>}

                <div className="flex gap-2 mb-6 p-2 bg-[#a3aab8] rounded-xl border-[4px] border-black shadow-inner">
                    <button type="button" className={`flex-1 py-3 rounded-lg text-sm font-black tracking-widest uppercase transition-colors border-[3px] ${isLogin ? 'bg-[#78c82a] text-white border-black shadow-[0_4px_0_#000]' : 'bg-transparent border-transparent text-black/50 hover:text-black'}`} onClick={() => setIsLogin(true)}>Login</button>
                    <button type="button" className={`flex-1 py-3 rounded-lg text-sm font-black tracking-widest uppercase transition-colors border-[3px] ${!isLogin ? 'bg-[#78c82a] text-white border-black shadow-[0_4px_0_#000]' : 'bg-transparent border-transparent text-black/50 hover:text-black'}`} onClick={() => setIsLogin(false)}>Register</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input 
                        placeholder="USERNAME" 
                        autoFocus
                        className="w-full bg-white border-[4px] border-black rounded-2xl p-4 outline-none transition-colors uppercase font-black tracking-wider text-black placeholder-[#a3aab8] text-xl"
                        value={username} 
                        onChange={e => setUsername(e.target.value.toUpperCase().slice(0, 10))} 
                    />
                    <input 
                        type="password"
                        placeholder="PASSWORD" 
                        className="w-full bg-white border-[4px] border-black rounded-2xl p-4 outline-none transition-colors uppercase font-black tracking-wider text-black placeholder-[#a3aab8] text-xl"
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                    />
                    <button 
                        type="submit"
                        className="w-full btn-chunky bg-[#78c82a] text-white mt-2 py-4 border-[5px] border-black font-black text-2xl tracking-widest uppercase drop-shadow-[2px_2px_0_rgba(0,0,0,1)] active:translate-y-1 active:drop-shadow-none transition-all"
                    >
                        {isLogin ? 'ENTER ARENA' : 'CREATE ID'}
                    </button>
                </form>
            </div>
        </div>
    );
}
