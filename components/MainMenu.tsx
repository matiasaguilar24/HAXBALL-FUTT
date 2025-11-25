
import React, { useState } from 'react';
import { generateTeamNames } from '../services/geminiService';
import { Loader2, Globe, Trophy, Users, PlayCircle, Sparkles, Zap, LayoutList, Clock, BarChart3, Save, Shield, Skull, Crown, Star, Palette, Brush } from 'lucide-react';
import { MatchSettings, Difficulty, Team, Pattern, Emblem } from '../types';

interface MainMenuProps {
  onStartTournament: (playerTeam: Team, generatedTeams: string[], settings: MatchSettings) => void;
  onStartLeague: (playerTeam: Team, generatedTeams: string[], settings: MatchSettings) => void;
  onGoToOnline: () => void;
  onQuickMatch: (settings: MatchSettings) => void;
  onLoadLeague?: () => void;
  hasSavedGame?: boolean;
}

// Predefined colors
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#111827', '#ffffff'];

const MainMenu: React.FC<MainMenuProps> = ({ 
    onStartTournament, 
    onStartLeague, 
    onGoToOnline, 
    onQuickMatch,
    onLoadLeague,
    hasSavedGame = false 
}) => {
  const [playerName, setPlayerName] = useState('Mi Equipo');
  
  // Customization State
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [selectedPattern, setSelectedPattern] = useState<Pattern>('solid');
  const [selectedEmblem, setSelectedEmblem] = useState<Emblem>('shield');

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cup' | 'league' | 'online' | 'quick'>('league');
  
  const [selectedTime, setSelectedTime] = useState<number>(120);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');

  const getPlayerTeam = (): Team => ({
      id: 'p1',
      name: playerName,
      color: primaryColor,
      secondaryColor: secondaryColor,
      pattern: selectedPattern,
      emblem: selectedEmblem,
      isPlayer: true
  });

  const handleStart = async (mode: 'cup' | 'league') => {
    setIsLoading(true);
    const names = await generateTeamNames(); 
    const settings: MatchSettings = { timeLimit: selectedTime, difficulty: selectedDifficulty };
    
    if (mode === 'cup') {
        onStartTournament(getPlayerTeam(), names, settings);
    } else {
        onStartLeague(getPlayerTeam(), names, settings);
    }
    setIsLoading(false);
  };

  const handleQuickMatch = () => {
      const settings: MatchSettings = { timeLimit: selectedTime, difficulty: selectedDifficulty };
      onQuickMatch(settings);
  };

  const TeamEditor = () => (
      <div className="bg-black/30 rounded-xl p-4 space-y-4 border border-white/10">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
               <Palette size={12} /> Personalización
          </label>
          
          {/* Colors */}
          <div className="flex gap-4">
               <div className="flex-1">
                   <p className="text-[10px] text-slate-500 mb-1">PRIMARIO</p>
                   <div className="flex flex-wrap gap-1">
                       {COLORS.map(c => (
                           <button key={c} onClick={()=>setPrimaryColor(c)} className={`w-5 h-5 rounded-full border ${primaryColor===c?'border-white scale-110':'border-transparent opacity-50'}`} style={{background:c}}/>
                       ))}
                   </div>
               </div>
               <div className="flex-1">
                   <p className="text-[10px] text-slate-500 mb-1">SECUNDARIO</p>
                   <div className="flex flex-wrap gap-1">
                       {COLORS.map(c => (
                           <button key={c} onClick={()=>setSecondaryColor(c)} className={`w-5 h-5 rounded-full border ${secondaryColor===c?'border-white scale-110':'border-transparent opacity-50'}`} style={{background:c}}/>
                       ))}
                   </div>
               </div>
          </div>

          {/* Pattern & Emblem */}
          <div className="flex gap-2">
              <div className="flex-1">
                   <p className="text-[10px] text-slate-500 mb-1">DISEÑO</p>
                   <div className="flex gap-1">
                        {(['solid', 'stripes', 'sash', 'half'] as Pattern[]).map(p => (
                             <button key={p} onClick={()=>setSelectedPattern(p)} className={`p-1 rounded ${selectedPattern===p ? 'bg-white/20' : 'bg-black/20'}`} title={p}>
                                 <div className={`w-6 h-6 rounded-full border border-white/30 overflow-hidden relative`} style={{background: primaryColor}}>
                                     {p === 'stripes' && <div className="absolute inset-0 flex justify-around"><div className="w-1 h-full bg-white/50"></div><div className="w-1 h-full bg-white/50"></div></div>}
                                     {p === 'sash' && <div className="absolute w-[150%] h-2 bg-white/50 -rotate-45 top-2 -left-2"></div>}
                                     {p === 'half' && <div className="absolute right-0 w-1/2 h-full bg-white/50"></div>}
                                 </div>
                             </button>
                        ))}
                   </div>
              </div>
              <div className="flex-1">
                   <p className="text-[10px] text-slate-500 mb-1">ESCUDO</p>
                   <div className="flex gap-1">
                        {(['shield', 'zap', 'crown', 'skull'] as Emblem[]).map(e => (
                             <button key={e} onClick={()=>setSelectedEmblem(e)} className={`p-1 rounded ${selectedEmblem===e ? 'bg-white/20' : 'bg-black/20'}`}>
                                 {e === 'shield' && <Shield size={16} />}
                                 {e === 'zap' && <Zap size={16} />}
                                 {e === 'crown' && <Crown size={16} />}
                                 {e === 'skull' && <Skull size={16} />}
                             </button>
                        ))}
                   </div>
              </div>
          </div>
      </div>
  );

  const SettingsControls = () => (
      <div className="bg-black/20 rounded-xl p-4 space-y-4 border border-white/5">
          {/* Time Selector */}
          <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Clock size={12} /> Duración
              </label>
              <div className="flex bg-black/40 rounded-lg p-1">
                  {[60, 120, 180, 300].map(time => (
                      <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${selectedTime === time ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                          {time / 60}'
                      </button>
                  ))}
              </div>
          </div>

          {/* Difficulty Selector */}
          <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <BarChart3 size={12} /> Dificultad
              </label>
              <div className="flex bg-black/40 rounded-lg p-1">
                  {(['easy', 'normal', 'hard', 'legend'] as Difficulty[]).map(diff => (
                      <button
                          key={diff}
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded transition-colors uppercase ${
                              selectedDifficulty === diff 
                              ? (diff === 'legend' ? 'bg-purple-600 text-white shadow' : 'bg-slate-600 text-white shadow') 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                      >
                          {diff === 'easy' ? 'Fácil' : diff === 'normal' ? 'Normal' : diff === 'hard' ? 'Difícil' : 'Leyenda'}
                      </button>
                  ))}
              </div>
          </div>
      </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col md:flex-row gap-8 items-stretch">
        
        {/* Left Side: Branding & Input */}
        <div className="flex-1 flex flex-col justify-center text-left space-y-6">
          <div className="space-y-2">
            <h2 className="text-blue-500 font-bold tracking-widest text-sm uppercase flex items-center gap-2">
              <Sparkles size={16} /> Version 1.1
            </h2>
            <h1 className="text-6xl md:text-7xl font-black text-white leading-tight tracking-tighter">
              HAXBALL <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                FUTT
              </span>
            </h1>
            <p className="text-slate-400 max-w-md text-lg">
              Bienvenido a HAXBALL FUTT. Personaliza tu equipo y domina la cancha.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-xl flex gap-1 w-full max-w-lg shadow-2xl overflow-hidden flex-wrap">
            <button 
                onClick={() => setActiveTab('league')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'league' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <LayoutList size={16} /> LIGA
            </button>
            <button 
                onClick={() => setActiveTab('cup')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'cup' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Trophy size={16} /> COPA
            </button>
            <button 
                onClick={() => setActiveTab('quick')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'quick' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Zap size={16} /> RÁPIDA
            </button>
            <button 
                onClick={() => setActiveTab('online')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'online' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Globe size={16} /> ONLINE
            </button>
          </div>
        </div>

        {/* Right Side: Action Card */}
        <div className="flex-1 min-h-[420px]">
            <div className="h-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group transition-all">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                {activeTab === 'league' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full overflow-y-auto custom-scrollbar">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Championship Mode</h3>
                            <p className="text-slate-400 text-sm">Modo Carrera. 15 Temporadas. Ascensos, descensos y progresión.</p>
                        </div>
                        
                        {hasSavedGame && onLoadLeague && (
                             <button onClick={onLoadLeague} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-3 shadow-xl"><Save fill="currentColor" size={18} /> CONTINUAR</button>
                        )}

                        <div className="space-y-2 border-t border-white/10 pt-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Club</label>
                            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-lg focus:outline-none focus:border-yellow-500" maxLength={15} />
                        </div>
                        
                        <TeamEditor />
                        <SettingsControls />

                        <button onClick={() => handleStart('league')} disabled={isLoading} className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-black py-4 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            {isLoading ? <Loader2 className="animate-spin" /> : <LayoutList fill="currentColor" className="text-black" />}
                            {isLoading ? 'PREPARANDO...' : 'NUEVA TEMPORADA'}
                        </button>
                    </div>
                )}

                {activeTab === 'cup' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full overflow-y-auto custom-scrollbar">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Copa de 16 Equipos</h3>
                            <p className="text-slate-400 text-sm">Eliminación directa. Partidos de ida y vuelta. Desempate por GOL DE ORO en empate global.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Club</label>
                            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-lg focus:outline-none focus:border-purple-500" maxLength={15} />
                        </div>

                        <TeamEditor />
                        <SettingsControls />

                        <button onClick={() => handleStart('cup')} disabled={isLoading} className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-black py-4 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            {isLoading ? <Loader2 className="animate-spin" /> : <Trophy fill="currentColor" className="text-black" />}
                            {isLoading ? 'GENERANDO...' : 'JUGAR COPA'}
                        </button>
                    </div>
                )}

                {activeTab === 'quick' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Partida Rápida</h3>
                            <p className="text-slate-400 text-sm">Un partido amistoso. Usa tu equipo personalizado o uno aleatorio.</p>
                        </div>
                        
                        <SettingsControls />

                        <button onClick={handleQuickMatch} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-4 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            <PlayCircle fill="currentColor" /> JUGAR AMISTOSO
                        </button>
                    </div>
                )}

                {activeTab === 'online' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col justify-center">
                         <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Multijugador P2P</h3>
                            <p className="text-slate-400 text-sm">Conecta con un amigo. Tú eres el host, tú pones las reglas.</p>
                        </div>
                        <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                            <Users className="text-emerald-400 shrink-0 mt-1" size={20} />
                            <p className="text-xs text-emerald-200">Baja latencia. Conexión directa.</p>
                        </div>
                        <button onClick={onGoToOnline} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-5 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            <Globe size={24} /> IR AL LOBBY
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
      <div className="absolute bottom-6 text-slate-600 text-xs font-mono tracking-widest">POWERED BY REACT 19</div>
    </div>
  );
};

export default MainMenu;
