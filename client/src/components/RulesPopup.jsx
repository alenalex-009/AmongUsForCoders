import React, { useState } from 'react';
import { FaTimes, FaInfoCircle } from 'react-icons/fa';

export default function RulesPopup({ page }) {
    const [isOpen, setIsOpen] = useState(false);

    let title = "";
    let rules = [];

    if (page === 'lobby') {
        title = "Rules for Lobby";
        rules = [
            "Crewmate can only win if all the questions are corrected or the impostors were found",
            "Impostor can only win when he corrupts all the problems or until he survives 1:1 ratio"
        ];
    } else if (page === 'game') {
        title = "Rules for Game";
        rules = [
            "Imposter task is to corrupt the code - means changing the code to work in a different functionality .given to the imposter",
            "Impostor can shape shift only once per round",
            "Crewmates task is to solve all the questions and find the imposter",
            "A code can be edited by a single member at a time",
            "A question done by imposter or crewmate can't be changed"
        ];
    } else if (page === 'meeting') {
        title = "Rules for Meeting";
        rules = [
            "Players have to chat with each other to discuss who is the imposter",
            "The players should also chat to discuss and solve the problem together",
            "Only 1 corrupted code can be revived per emergency meeting",
            "Players can't end a meeting unless solving a code",
            "Only the host has the permission to end the meeting without solving a code"
        ];
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 z-[100] bg-white text-black border-[4px] border-black rounded-lg px-4 py-2 font-black uppercase tracking-widest flex items-center gap-2 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-gray-100 transition-all text-sm md:text-base"
            >
                <FaInfoCircle /> {title}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border-[6px] border-black rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-[12px_12px_0_#000] animate-[zoomIn_0.2s_ease-out_forwards] relative">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 bg-red-500 text-white border-[4px] border-black w-10 h-10 rounded-full flex items-center justify-center font-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all text-xl"
                        >
                            <FaTimes />
                        </button>
                        
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-center border-b-[4px] border-black/20 pb-4 mb-6 text-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                            {title}
                        </h2>
                        
                        <ul className="space-y-4">
                            {rules.map((rule, idx) => (
                                <li key={idx} className="flex gap-4 items-start text-black">
                                    <span className="font-black text-xl shrink-0 text-[#4a68af] mt-0.5">•</span>
                                    <span className="font-bold text-lg md:text-xl uppercase tracking-wider leading-snug">{rule}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="bg-[#78c82a] text-white border-[4px] border-black rounded-xl px-12 py-3 font-black uppercase tracking-widest shadow-[6px_6px_0_#000] active:translate-y-2 active:shadow-none transition-all text-xl w-full md:w-auto"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
