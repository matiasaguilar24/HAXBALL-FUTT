
import React, { useState } from 'react';
import { LeagueState, LeagueTeam, LeagueMatch } from '../types';
import { Trophy, Shield, ArrowUp, ArrowDown, Play, Calendar, FastForward, Save, CheckCircle, LogOut } from 'lucide-react';

interface LeagueViewProps {
    league: LeagueState;
    onPlayMatch: (matchId: string) => void;
    onSimulateRound: () => void;
    onSaveLeague: () => void;
    onExit: () => void;
}

const LeagueView: React.FC<LeagueViewProps> = ({ league, onPlayMatch, onSimulateRound, onSaveLeague, onExit }) => {
    const [activeTab, setActiveTab] = useState<'div1' | 'div2' | 'div3'>('div1');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    const handleSave = () => {
        onSaveLeague();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const getTable = (teams: LeagueTeam[]) => {
        // Sort by Points, then GD, then GF
        return [...teams].sort((a, b) => {
            if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
            const gdA = a.stats.gf - a.stats.ga;
            const gdB = b.stats.gf - b.stats.ga;
            if (gdB !== gdA) return gdB - gdA;
            return b.stats.gf - a.stats.gf;
        });
    };

    const tableDiv1 = getTable(league.div1);
    const tableDiv2 = getTable(league.div2);
    const tableDiv3 = getTable(league.div3);

    const currentSchedule = activeTab === 'div1' 
        ? league.scheduleDiv1 
        : activeTab === 'div2' 
            ? league.scheduleDiv2 
            : league.scheduleDiv3;

    // Current round matches for display (clamped)
    const displayRound = Math.min(league.currentRound, league.totalRounds - 1);
    const roundMatches = currentSchedule[displayRound] || [];

    const getStatusColor = (index: number, div: 'div1' | 'div2' | 'div3') => {
        if (div === 'div1') {
            // Champion (1st Place)
            if (index === 0) return 'bg-yellow-500/20 border-l-4 border-yellow-500';
            // Top 16: Cup (2-16)
            if (index < 16) return 'bg-green-900/30 border-l-4 border-green-500'; 
            // Bottom 3: Relegation (17, 18, 19 in 0-indexed array)
            if (index >= 17) return 'bg-red-900/30 border-l-4 border-red-500'; 
        } else if (div === 'div2') {
            // Top 3: Promotion
            if (index < 3) return 'bg-blue-900/30 border-l-4 border-blue-500'; 
            // Bottom 5: Relegation (15, 16, 17, 18, 19)
            if (index >= 15) return 'bg-red-900/30 border-l-4 border-red-500'; 
        } else if (div === 'div3') {
            // Top 5: Promotion
            if (index < 5) return 'bg-blue-900/30 border-l-4 border-blue-500';
        }
        return 'bg-slate-800/50 border-l-4 border-transparent';
    };

    // Find User Next Match
    const userMatch = league.scheduleDiv1[displayRound]?.find(
        m => m.homeId === league.userTeamId || m.awayId === league.userTeamId
    );
    // User might be in div2 or div3 technically if we implemented full persistence, 
    // but current logic forces user to Div1 start. Checking all just in case.
    const userMatchD2 = league.scheduleDiv2[displayRound]?.find(m => m.homeId === league.userTeamId || m.awayId === league.userTeamId);
    const userMatchD3 = league.scheduleDiv3[displayRound]?.find(m => m.homeId === league.userTeamId || m.awayId === league.userTeamId);
    
    const activeUserMatch = userMatch || userMatchD2 || userMatchD3;
    const userMatchPlayed = activeUserMatch?.played;

    const getTeam = (id: string) => [...league.div1, ...league.div2, ...league.div3].find(t => t.id === id);

    return (
        <div className="w-full max-w-6xl mx-auto p-4 flex flex-col h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 bg-slate-800/80 p-6 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 uppercase tracking-tighter">
                        Championship Season
                    </h1>
                    <p className="text-slate-400 font-mono text-sm">
                        Temporada {league.season} / 15 • Jornada {league.currentRound + 1} de {league.totalRounds}
                    </p>
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={onExit}
                        className="p-3 rounded-xl bg-red-900/50 hover:bg-red-600/80 border border-red-700/50 text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                        title="Salir al Menú"
                    >
                        <LogOut size={20} />
                        <span className="hidden sm:inline">Salir</span>
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={saveStatus === 'saved'}
                        className={`
                            p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border 
                            ${saveStatus === 'saved' 
                                ? 'bg-green-600 border-green-400 text-white' 
                                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-white'}
                        `}
                        title="Guardar Temporada"
                    >
                        {saveStatus === 'saved' ? <CheckCircle size={20} /> : <Save size={20} />}
                        <span className="hidden sm:inline">{saveStatus === 'saved' ? 'Guardado' : 'Guardar'}</span>
                    </button>

                    {!userMatchPlayed && league.currentRound < league.totalRounds && activeUserMatch && (
                        <button 
                            onClick={() => onPlayMatch(activeUserMatch.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/50 transition-transform active:scale-95"
                        >
                            <Play fill="currentColor" size={18} /> Jugar Partido
                        </button>
                    )}
                    
                    {league.currentRound < league.totalRounds && (
                        <button 
                            onClick={onSimulateRound}
                            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${userMatchPlayed ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            <FastForward size={18} /> {userMatchPlayed ? 'Simular Resto de Fecha' : 'Simular Fecha'}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Left: Standings */}
                <div className="flex-1 flex flex-col bg-slate-900/60 rounded-xl border border-white/5 overflow-hidden">
                    <div className="flex border-b border-white/10 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('div1')}
                            className={`flex-1 min-w-[120px] py-4 font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors ${activeTab === 'div1' ? 'bg-slate-800 text-white border-b-2 border-yellow-500' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            División 1
                        </button>
                        <button 
                            onClick={() => setActiveTab('div2')}
                            className={`flex-1 min-w-[120px] py-4 font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors ${activeTab === 'div2' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            División 2
                        </button>
                        <button 
                            onClick={() => setActiveTab('div3')}
                            className={`flex-1 min-w-[120px] py-4 font-bold text-xs sm:text-sm tracking-wider uppercase transition-colors ${activeTab === 'div3' ? 'bg-slate-800 text-white border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            División 3
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                         <table className="w-full text-left text-sm">
                             <thead className="text-xs uppercase text-slate-500 font-bold sticky top-0 bg-slate-900 z-10 shadow-sm">
                                 <tr>
                                     <th className="py-3 px-2">Pos</th>
                                     <th className="py-3 px-2">Equipo</th>
                                     <th className="py-3 px-2 text-center">PJ</th>
                                     <th className="py-3 px-2 text-center">G</th>
                                     <th className="py-3 px-2 text-center">E</th>
                                     <th className="py-3 px-2 text-center">P</th>
                                     <th className="py-3 px-2 text-center hidden sm:table-cell">DG</th>
                                     <th className="py-3 px-2 text-center font-black text-white">PTS</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                                 {(activeTab === 'div1' ? tableDiv1 : activeTab === 'div2' ? tableDiv2 : tableDiv3).map((team, idx) => (
                                     <tr key={team.id} className={`${getStatusColor(idx, activeTab)} transition-colors hover:bg-white/5`}>
                                         <td className="py-2 px-2 font-mono text-slate-400">{idx + 1}</td>
                                         <td className="py-2 px-2 font-bold flex items-center gap-2">
                                             <div className="w-2 h-2 rounded-full shrink-0" style={{background: team.color}}></div>
                                             <span className="truncate max-w-[120px] sm:max-w-none">{team.name}</span>
                                             {team.id === league.userTeamId && <span className="text-[10px] bg-yellow-500 text-black px-1 rounded font-bold">TU</span>}
                                         </td>
                                         <td className="py-2 px-2 text-center text-slate-400">{team.stats.played}</td>
                                         <td className="py-2 px-2 text-center text-slate-400">{team.stats.won}</td>
                                         <td className="py-2 px-2 text-center text-slate-400">{team.stats.drawn}</td>
                                         <td className="py-2 px-2 text-center text-slate-400">{team.stats.lost}</td>
                                         <td className="py-2 px-2 text-center font-mono hidden sm:table-cell">{team.stats.gf - team.stats.ga}</td>
                                         <td className="py-2 px-2 text-center font-black text-white text-lg">{team.stats.points}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                         
                         {/* Legend */}
                         <div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase font-bold text-slate-500">
                             {activeTab === 'div1' ? (
                                <>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span> Campeón</div>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Playoffs (2-16)</div>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Descenso (17-20)</div>
                                </>
                             ) : activeTab === 'div2' ? (
                                <>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Ascenso (1-3)</div>
                                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Descenso (15-20)</div>
                                </>
                             ) : (
                                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Ascenso (1-5)</div>
                             )}
                         </div>
                    </div>
                </div>

                {/* Right: Fixtures */}
                <div className="w-80 flex flex-col bg-slate-900/60 rounded-xl border border-white/5 overflow-hidden shrink-0 hidden lg:flex">
                    <div className="p-4 border-b border-white/10 bg-slate-800/50">
                        <h3 className="font-bold flex items-center gap-2 text-slate-300">
                            <Calendar size={16} /> Partidos Fecha {league.currentRound + 1}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                        {roundMatches.map((m, i) => {
                            const home = getTeam(m.homeId);
                            const away = getTeam(m.awayId);
                            if (!home || !away) return null;
                            const isUserGame = m.homeId === league.userTeamId || m.awayId === league.userTeamId;

                            return (
                                <div key={m.id} className={`p-3 rounded-lg border ${isUserGame ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800/40 border-slate-700'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs font-bold truncate w-24 ${m.homeScore !== null && (m.homeScore > (m.awayScore||0)) ? 'text-green-400' : 'text-slate-300'}`}>{home.name}</span>
                                        <span className="font-mono font-bold text-white bg-black/30 px-2 rounded">
                                            {m.played ? m.homeScore : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-bold truncate w-24 ${m.awayScore !== null && (m.awayScore > (m.homeScore||0)) ? 'text-green-400' : 'text-slate-300'}`}>{away.name}</span>
                                        <span className="font-mono font-bold text-white bg-black/30 px-2 rounded">
                                            {m.played ? m.awayScore : '-'}
                                        </span>
                                    </div>
                                    {isUserGame && !m.played && (
                                        <div className="mt-2 text-[10px] text-center text-blue-400 font-bold uppercase tracking-wider">Tu Partido</div>
                                    )}
                                </div>
                            );
                        })}
                        {roundMatches.length === 0 && (
                            <div className="text-center text-slate-500 py-10">Temporada Finalizada</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeagueView;
