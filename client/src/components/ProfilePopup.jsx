import React, { useEffect, useState } from 'react';
import { FaTimes, FaChartBar, FaTrophy, FaUserNinja, FaClock } from 'react-icons/fa';

export default function ProfilePopup({ currentUser, onClose }) {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        
        fetch(`http://localhost:3001/api/user/${currentUser}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setAnalytics(data.analytics);
                } else {
                    setError('Failed to load profile.');
                }
            })
            .catch(err => {
                setError('Network error.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [currentUser]);

    const formatTime = (ms) => {
        if (!ms) return '0s';
        const s = Math.floor(ms / 1000);
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        const remS = s % 60;
        return `${m}m ${remS}s`;
    };

    const calculateAvg = (diffObj) => {
        if (!diffObj || diffObj.count === 0) return 'N/A';
        return formatTime(diffObj.totalMs / diffObj.count);
    };

    let bestRole = "N/A";
    if (analytics) {
        if (analytics.roleWins.crewmate === 0 && analytics.roleWins.imposter === 0) {
            bestRole = "Unknown";
        } else if (analytics.roleWins.crewmate >= analytics.roleWins.imposter) {
            bestRole = "Crewmate";
        } else {
            bestRole = "Imposter";
        }
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#cbd5e1] border-[6px] border-black rounded-[2.5rem] p-6 max-w-xl w-full shadow-[12px_12px_0_#000] relative animate-[zoomIn_0.2s_ease-out_forwards]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-red-500 text-white border-[4px] border-black w-10 h-10 rounded-full flex items-center justify-center font-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all text-xl"
                >
                    <FaTimes />
                </button>

                <h2 className="text-3xl font-black uppercase tracking-widest text-center border-b-[4px] border-black pb-4 mb-6 text-black drop-shadow-[2px_2px_0_rgba(255,255,255,0.5)] flex items-center justify-center gap-3">
                    <FaChartBar /> SERVICE RECORD
                </h2>

                {loading && <div className="text-center font-bold text-xl uppercase tracking-widest my-10">Accessing Database...</div>}
                {error && <div className="text-center font-bold text-red-600 text-xl uppercase tracking-widest my-10">{error}</div>}

                {analytics && !loading && !error && (
                    <div className="flex flex-col gap-6">
                        <div className="bg-white border-[4px] border-black rounded-2xl p-4 flex items-center gap-4 shadow-[4px_4px_0_#000]">
                            <div className="bg-yellow-400 p-4 border-[3px] border-black rounded-xl drop-shadow-[2px_2px_0_#000]">
                                <FaTrophy className="text-4xl text-black" />
                            </div>
                            <div>
                                <div className="text-sm font-black uppercase text-gray-500 tracking-widest">Games Won</div>
                                <div className="text-4xl font-black text-black drop-shadow-[2px_2px_0_#cbd5e1]">{analytics.gamesWon}</div>
                            </div>
                        </div>

                        <div className="bg-white border-[4px] border-black rounded-2xl p-4 flex items-center gap-4 shadow-[4px_4px_0_#000]">
                            <div className="bg-purple-500 p-4 border-[3px] border-black rounded-xl drop-shadow-[2px_2px_0_#000]">
                                <FaUserNinja className="text-4xl text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-black uppercase text-gray-500 tracking-widest">Best Role</div>
                                <div className="text-2xl font-black text-black uppercase">{bestRole}</div>
                                <div className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Crew: {analytics.roleWins.crewmate} | Imp: {analytics.roleWins.imposter}</div>
                            </div>
                        </div>

                        <div className="bg-white border-[4px] border-black rounded-2xl p-4 flex flex-col gap-2 shadow-[4px_4px_0_#000]">
                            <div className="flex items-center gap-2 mb-2 font-black uppercase text-gray-800 tracking-widest pb-2 border-b-2 border-gray-200">
                                <FaClock /> Avg Task Completion times
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-center mt-2">
                                <div className="bg-green-100 border-2 border-green-400 rounded-lg p-2">
                                    <div className="text-[10px] uppercase font-black text-green-700 tracking-wider">EASY</div>
                                    <div className="text-lg font-black text-green-900">{calculateAvg(analytics.taskTimes.easy)}</div>
                                </div>
                                <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-2">
                                    <div className="text-[10px] uppercase font-black text-yellow-700 tracking-wider">MED</div>
                                    <div className="text-lg font-black text-yellow-900">{calculateAvg(analytics.taskTimes.medium)}</div>
                                </div>
                                <div className="bg-red-100 border-2 border-red-400 rounded-lg p-2">
                                    <div className="text-[10px] uppercase font-black text-red-700 tracking-wider">HARD</div>
                                    <div className="text-lg font-black text-red-900">{calculateAvg(analytics.taskTimes.hard)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
