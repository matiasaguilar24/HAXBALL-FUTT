
import React, { useState } from 'react';
import { TournamentState, Match } from '../types';
import { Trophy, Play, MapPin, Shield, FastForward } from 'lucide-react';

interface TournamentViewProps {
  state: TournamentState;
  onPlayMatch: (matchId: string) => void;
  onStartNextSeason?: () => void;
  onSimulateRest?: () => void;
}

const isPlayerMatch = (m: Match) => m.teamA.isPlayer || m.teamB.isPlayer;

// --- STYLED MATCH CARD ---
const BracketMatchCard: React.FC<{ match: Match, active?: boolean, align?: 'left' | 'right' }> = ({ match, active = false, align = 'left' }) => {
    if (!match) return <div className="h-14 w-40 bg-slate-800/10 rounded border border-white/5 opacity-20"></div>;

    const isKnown = match.teamA.name !== 'TBD' && match.teamB.name !== 'TBD';
    const isComplete = match.playedLeg1 && match.playedLeg2;
    const isUser = isPlayerMatch(match);
    
    // Aggregates
    const sA = isComplete ? match.scoreLeg1A + match.scoreLeg2A : match.playedLeg1 ? match.scoreLeg1A : '-';
    const sB = isComplete ? match.scoreLeg1B + match.scoreLeg2B : match.playedLeg1 ? match.scoreLeg1B : '-';
    
    const highlight = active || (isUser && !isComplete);
    const winnerId = match.winner?.id;

    return (
        <div 
            className={`
                relative flex flex-col w-40 h-16 bg-slate-800 rounded-lg overflow-hidden border shadow-lg transition-all z-10
                ${highlight ? 'ring-2 ring-yellow-400 border-yellow-500 scale-105 shadow-yellow-900/50' : 'border-slate-600'}
                ${!isKnown ? 'opacity-50' : 'opacity-100'}
            `}
        >
            {/* Team A */}
            <div className={`flex items-center justify-between px-2 h-1/2 border-b border-slate-700 ${winnerId === match.teamA.id ? 'bg-slate-700/50' : ''}`}>
                <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right ml-auto' : ''} w-full`}>
                    <div className="w-4 h-3 shrink-0 shadow-sm" style={{ backgroundColor: match.teamA.color, boxShadow: '0 0 2px rgba(0,0,0,0.5)' }}></div>
                    <span className={`text-[10px] font-bold uppercase truncate leading-tight ${winnerId === match.teamA.id ? 'text-white' : 'text-slate-400'}`}>
                        {match.teamA.name}
                    </span>
                </div>
                <div className={`font-mono text-xs font-bold w-6 text-center ${align === 'right' ? 'order-first mr-1' : 'bg-slate-900/50 rounded ml-1'} ${winnerId === match.teamA.id ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {sA}
                </div>
            </div>

            {/* Team B */}
            <div className={`flex items-center justify-between px-2 h-1/2 ${winnerId === match.teamB.id ? 'bg-slate-700/50' : ''}`}>
                <div className={`flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right ml-auto' : ''} w-full`}>
                    <div className="w-4 h-3 shrink-0 shadow-sm" style={{ backgroundColor: match.teamB.color, boxShadow: '0 0 2px rgba(0,0,0,0.5)' }}></div>
                    <span className={`text-[10px] font-bold uppercase truncate leading-tight ${winnerId === match.teamB.id ? 'text-white' : 'text-slate-400'}`}>
                        {match.teamB.name}
                    </span>
                </div>
                <div className={`font-mono text-xs font-bold w-6 text-center ${align === 'right' ? 'order-first mr-1' : 'bg-slate-900/50 rounded ml-1'} ${winnerId === match.teamB.id ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {sB}
                </div>
            </div>
            
            {/* Status Badge */}
            {match.playedLeg1 && !match.playedLeg2 && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse border border-slate-900"></div>
            )}
        </div>
    );
};

const TournamentView: React.FC<TournamentViewProps> = ({ state, onPlayMatch, onStartNextSeason, onSimulateRest }) => {
  const [viewMode, setViewMode] = useState<'next' | 'bracket'>('bracket');

  // Next match logic
  const nextPlayerMatch = state.matches.find(m => isPlayerMatch(m) && (!m.playedLeg1 || !m.playedLeg2));
  const playerEliminated = !nextPlayerMatch && !state.champion?.isPlayer && state.matches.some(m => isPlayerMatch(m) && m.winner && !m.winner.isPlayer);

  // DATA SLICING
  const r16Left = state.matches.filter(m => m.round === 0).slice(0, 4);
  const r16Right = state.matches.filter(m => m.round === 0).slice(4, 8);
  const qfLeft = state.matches.filter(m => m.round === 1).slice(0, 2);
  const qfRight = state.matches.filter(m => m.round === 1).slice(2, 4);
  const sfLeft = state.matches.filter(m => m.round === 2).slice(0, 1);
  const sfRight = state.matches.filter(m => m.round === 2).slice(1, 2);
  const finalMatch = state.matches.find(m => m.round === 3);

  return (
    <div className="w-full h-screen flex flex-col bg-[#0f172a] text-white overflow-hidden relative">
      
      {/* HEADER */}
      <div className="shrink-0 pt-4 pb-2 px-6 flex justify-between items-center z-20 bg-slate-900/50 backdrop-blur-sm border-b border-white/5">
         <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent uppercase tracking-tight">
                {state.champion ? 'TORNEO FINALIZADO' : 'COPA HAXBALL'}
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-widest">
                {state.champion ? `CAMPEÓN: ${state.champion.name}` : 'PLAYOFFS'}
            </p>
         </div>
         
         <div className="flex gap-2">
             <button onClick={() => setViewMode('bracket')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${viewMode === 'bracket' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Llaves</button>
             <button onClick={() => setViewMode('next')} className={`px-3 py-1.5 rounded text-xs font-bold uppercase ${viewMode === 'next' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Mi Partido</button>
         </div>
      </div>

      {/* --- BRACKET VIEW (WORLD CUP STYLE) --- */}
      {viewMode === 'bracket' && (
          <div className="flex-1 overflow-auto flex items-center justify-center p-8 custom-scrollbar">
             <div className="flex w-full max-w-7xl min-w-[1000px] h-[600px] relative">
                
                {/* === LEFT SIDE === */}

                {/* COL 1: OCTAVOS LEFT */}
                <div className="flex flex-col justify-around w-44 z-10">
                    {r16Left.map(m => (
                        <div key={m.id} className="flex justify-center">
                            <BracketMatchCard match={m} active={m.id === state.currentMatchId} align="left" />
                        </div>
                    ))}
                </div>

                {/* COL 2: CONNECTORS R16->QF LEFT */}
                <div className="w-12 relative opacity-50">
                    {/* Top Pair Connector */}
                    <div className="absolute w-full border-r-2 border-t-2 border-b-2 border-slate-600 rounded-r-lg" style={{ top: '12.5%', height: '25%' }}></div>
                    <div className="absolute w-full h-[2px] bg-slate-600" style={{ top: '25%', left: '0' }}></div> {/* Horizontal Stub to QF */}
                    
                    {/* Bottom Pair Connector */}
                    <div className="absolute w-full border-r-2 border-t-2 border-b-2 border-slate-600 rounded-r-lg" style={{ top: '62.5%', height: '25%' }}></div>
                </div>

                {/* COL 3: CUARTOS LEFT */}
                <div className="flex flex-col justify-around w-44 z-10">
                    {qfLeft.map(m => (
                        <div key={m.id} className="flex justify-center">
                            <BracketMatchCard match={m} active={m.id === state.currentMatchId} align="left" />
                        </div>
                    ))}
                </div>

                {/* COL 4: CONNECTORS QF->SF LEFT */}
                <div className="w-12 relative opacity-50">
                    <div className="absolute w-full border-r-2 border-t-2 border-b-2 border-slate-600 rounded-r-lg" style={{ top: '25%', height: '50%' }}></div>
                </div>

                {/* COL 5: SEMIS LEFT */}
                <div className="flex flex-col justify-center w-44 z-10">
                    {sfLeft.map(m => (
                        <div key={m.id} className="flex justify-center relative">
                            <BracketMatchCard match={m} active={m.id === state.currentMatchId} align="left" />
                            {/* Connector to Final */}
                            <div className="absolute left-full top-1/2 w-8 h-[2px] bg-slate-600 opacity-50"></div>
                        </div>
                    ))}
                </div>

                {/* === CENTER: FINAL === */}
                <div className="flex flex-col justify-center items-center w-64 z-20 mx-4">
                     <Trophy className={`w-20 h-20 mb-6 drop-shadow-2xl ${state.champion ? 'text-yellow-400 animate-bounce' : 'text-slate-700'}`} />
                     {finalMatch && (
                         <div className="scale-125 transform transition-transform hover:scale-150">
                             <BracketMatchCard match={finalMatch} active={finalMatch.id === state.currentMatchId} align="left" />
                         </div>
                     )}
                     <div className="mt-4 text-xs font-bold text-slate-500 tracking-[0.3em] uppercase">Gran Final</div>
                </div>

                {/* === RIGHT SIDE === */}

                {/* COL 7: SEMIS RIGHT */}
                <div className="flex flex-col justify-center w-44 z-10">
                    {sfRight.map(m => (
                        <div key={m.id} className="flex justify-center relative">
                            <BracketMatchCard match={m} active={m.id === state.currentMatchId} align="right" />
                            {/* Connector to Final */}
                            <div className="absolute right-full top-1/2 w-8 h-[2px] bg-slate-600 opacity-50"></div>
                        </div>
                    ))}
                </div>

                {/* COL 8: CONNECTORS QF->SF RIGHT */}
                <div className="w-12 relative opacity-50">
                    <div className="absolute w-full border-l-2 border-t-2 border-b-2 border-slate-600 rounded-l-lg" style={{ top: '25%', height: '50%' }}></div>
                </div>

                {/* COL 9: CUARTOS RIGHT */}
                <div className="flex flex-col justify-around w-44 z-10">
                    {qfRight.map(m => (
                        <div key={m.id} className="flex justify-center">
                            <BracketMatchCard match={m} active={m.id === state.currentMatchId} align="right" />
                        </div>
                    ))}
                </div>

                {/* COL 10: CONNECTORS R16->QF RIGHT */}
                <div className="w-12 relative opacity-50">
                    <div className="absolute w-full border-l-2 border-t-2 border-b-2 border-slate-600 rounded-l-lg" style={{ top: '12.5%', height: '25%' }}></div>
                    <div className="absolute w-full border-l-2 border-t-2 border-b-2 border-slate-600 rounded-l-lg" style={{ top: '62.5%', height: '25%' }}></div>
                </div>

                {/* COL 11: OCTAVOS RIGHT */}
                <div className="flex flex-col justify-around w-44 z-10">
                    {r16Right.map(m => (
                        <div key={m.id} className="flex justify-center">
                            <BracketMatchCard match={m} active={m.id === state.currentMatchId} align="right" />
                        </div>
                    ))}
                </div>

             </div>
          </div>
      )}

      {/* --- NEXT MATCH VIEW (Same as before) --- */}
      {viewMode === 'next' && (
          <div className="flex-1 flex items-center justify-center p-6">
              {state.champion ? (
                  <div className="text-center animate-in zoom-in duration-500">
                      <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-4" />
                      <h2 className="text-5xl font-black text-white mb-2">{state.champion.name}</h2>
                      <p className="text-xl text-yellow-500 uppercase tracking-widest mb-8">Campeón Indiscutible</p>
                      {onStartNextSeason && (
                          <button onClick={onStartNextSeason} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xl font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-900/50">
                              Siguiente Temporada
                          </button>
                      )}
                  </div>
              ) : playerEliminated ? (
                  <div className="text-center max-w-md bg-slate-800/50 p-8 rounded-2xl border border-white/5">
                      <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-white mb-2">Eliminado</h2>
                      <p className="text-slate-400 mb-6">Tu camino en la copa ha terminado. Puedes ver el desarrollo del torneo.</p>
                      <button onClick={() => setViewMode('bracket')} className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-lg font-bold">Ver Llaves</button>
                  </div>
              ) : nextPlayerMatch ? (
                  <div className="w-full max-w-xl bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                       <div className="text-center mb-8">
                           <h3 className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-1">
                                {nextPlayerMatch.round === 0 ? 'Octavos de Final' : nextPlayerMatch.round === 1 ? 'Cuartos de Final' : nextPlayerMatch.round === 2 ? 'Semifinal' : 'Gran Final'}
                           </h3>
                           <p className="text-xs text-slate-500 font-bold">{nextPlayerMatch.playedLeg1 ? 'Partido de Vuelta' : 'Partido de Ida'}</p>
                       </div>
                       
                       <div className="flex justify-between items-center mb-8">
                           <div className="flex flex-col items-center gap-2 w-1/3">
                               <div className="w-16 h-16 rounded-full border-4 border-slate-600 shadow-lg" style={{backgroundColor: nextPlayerMatch.teamA.color}}></div>
                               <span className="font-bold text-lg text-center leading-tight">{nextPlayerMatch.teamA.name}</span>
                               {nextPlayerMatch.playedLeg1 && <span className="text-2xl font-mono">{nextPlayerMatch.scoreLeg1A}</span>}
                           </div>
                           <div className="text-4xl font-black text-slate-700">VS</div>
                           <div className="flex flex-col items-center gap-2 w-1/3">
                               <div className="w-16 h-16 rounded-full border-4 border-slate-600 shadow-lg" style={{backgroundColor: nextPlayerMatch.teamB.color}}></div>
                               <span className="font-bold text-lg text-center leading-tight">{nextPlayerMatch.teamB.name}</span>
                               {nextPlayerMatch.playedLeg1 && <span className="text-2xl font-mono">{nextPlayerMatch.scoreLeg1B}</span>}
                           </div>
                       </div>
                       
                       <button onClick={() => onPlayMatch(nextPlayerMatch.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
                           <Play fill="currentColor" /> JUGAR AHORA
                       </button>
                  </div>
              ) : (
                  <div className="text-slate-500 animate-pulse">Esperando resultados...</div>
              )}
          </div>
      )}

      {playerEliminated && !state.champion && (
           <div className="absolute bottom-6 right-6 z-30">
               <button 
                  onClick={onSimulateRest || ((window as any).simulateRestFallback)}
                  className="bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-600 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-xl"
               >
                   <FastForward size={14} /> Simular Resto
               </button>
           </div>
      )}

    </div>
  );
};

export default TournamentView;
