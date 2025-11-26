
import React, { useState } from 'react';
import { generateTeamNames } from '../services/geminiService';
import { translations } from '../services/translations';
import { Loader2, Globe, Trophy, Users, PlayCircle, Sparkles, Zap, LayoutList, Clock, BarChart3, Save, Shield, Skull, Crown, Star, Palette, Settings, X, Smartphone, ChevronDown, ChevronUp } from 'lucide-react';
import { MatchSettings, Difficulty, Team, Pattern, Emblem, Language } from '../types';

interface MainMenuProps {
  onStartTournament: (playerTeam: Team, generatedTeams: string[], settings: MatchSettings) => void;
  onStartLeague: (playerTeam: Team, generatedTeams: string[], settings: MatchSettings) => void;
  onGoToOnline: (playerTeam: Team) => void;
  onQuickMatch: (settings: MatchSettings) => void;
  onLoadLeague?: () => void;
  hasSavedGame?: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  mobileControls: boolean;
  setMobileControls: (enabled: boolean) => void;
}

// Predefined colors
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#111827', '#ffffff'];

const MainMenu: React.FC<MainMenuProps> = ({ 
    onStartTournament, 
    onStartLeague, 
    onGoToOnline, 
    onQuickMatch,
    onLoadLeague,
    hasSavedGame = false,
    language,
    setLanguage,
    mobileControls,
    setMobileControls
}) => {
  const [playerName, setPlayerName] = useState('Mi Equipo');
  const t = translations[language];
  
  // Customization State
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [selectedPattern, setSelectedPattern] = useState<Pattern>('solid');
  // Default emblem set to 'none' for offline modes as requested
  const [selectedEmblem, setSelectedEmblem] = useState<Emblem>('none');
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
      <div className="bg-black/30 rounded-xl border border-white/10 overflow-hidden transition-all duration-300">
          <button 
            onClick={() => setIsCustomizationOpen(!isCustomizationOpen)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors group"
          >
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 cursor-pointer group-hover:text-white">
                 <Palette size={12} /> {t.customize}
            </label>
            {isCustomizationOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>
          
          {isCustomizationOpen && (
            <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Colors */}
              <div className="flex gap-4">
                  <div className="flex-1">
                      <p className="text-[10px] text-slate-500 mb-1">{t.primary}</p>
                      <div className="flex flex-wrap gap-1">
                          {COLORS.map(c => (
                              <button key={c} onClick={()=>setPrimaryColor(c)} className={`w-5 h-5 rounded-full border ${primaryColor===c?'border-white scale-110':'border-transparent opacity-50'}`} style={{background:c}}/>
                          ))}
                      </div>
                  </div>
                  <div className="flex-1">
                      <p className="text-[10px] text-slate-500 mb-1">{t.secondary}</p>
                      <div className="flex flex-wrap gap-1">
                          {COLORS.map(c => (
                              <button key={c} onClick={()=>setSecondaryColor(c)} className={`w-5 h-5 rounded-full border ${secondaryColor===c?'border-white scale-110':'border-transparent opacity-50'}`} style={{background:c}}/>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Pattern Only (Emblem removed for offline modes) */}
              <div>
                  <p className="text-[10px] text-slate-500 mb-1">{t.design}</p>
                  <div className="flex gap-1">
                        {(['solid', 'stripes', 'sash', 'half'] as Pattern[]).map(p => (
                            <button key={p} onClick={()=>setSelectedPattern(p)} className={`flex-1 p-2 rounded flex justify-center ${selectedPattern===p ? 'bg-white/20' : 'bg-black/20'}`} title={p}>
                                <div className={`w-6 h-6 rounded-full border border-white/30 overflow-hidden relative`} style={{background: primaryColor}}>
                                    {p === 'stripes' && <div className="absolute inset-0 flex justify-around"><div className="w-1 h-full bg-white/50"></div><div className="w-1 h-full bg-white/50"></div></div>}
                                    {p === 'sash' && <div className="absolute w-[150%] h-2 bg-white/50 -rotate-45 top-2 -left-2"></div>}
                                    {p === 'half' && <div className="absolute right-0 w-1/2 h-full bg-white/50"></div>}
                                </div>
                            </button>
                        ))}
                  </div>
              </div>
            </div>
          )}
      </div>
  );

  const SettingsControls = () => (
      <div className="bg-black/20 rounded-xl p-4 space-y-4 border border-white/5">
          {/* Time Selector */}
          <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Clock size={12} /> {t.time}
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
                  <BarChart3 size={12} /> {t.difficulty}
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
                          {diff === 'easy' ? t.easy : diff === 'normal' ? t.normal : diff === 'hard' ? t.hard : t.legend}
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
      
      {/* SETTINGS BUTTON */}
      <div className="absolute top-4 right-4 z-50">
          <button 
             onClick={() => setShowSettings(true)}
             className="p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full border border-white/10 shadow-lg"
          >
              <Settings size={24} />
          </button>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl animate-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white flex items-center gap-2"><Settings size={20} /> {t.settings}</h3>
                      <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="space-y-6">
                      {/* Language */}
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.language}</label>
                          <div className="flex gap-2">
                              <button onClick={() => setLanguage('es')} className={`flex-1 py-3 rounded-lg border font-bold ${language==='es' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>ES</button>
                              <button onClick={() => setLanguage('en')} className={`flex-1 py-3 rounded-lg border font-bold ${language==='en' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>EN</button>
                              <button onClick={() => setLanguage('pt')} className={`flex-1 py-3 rounded-lg border font-bold ${language==='pt' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>PT</button>
                          </div>
                      </div>

                      {/* Controls */}
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t.controls}</label>
                          <button 
                              onClick={() => setMobileControls(!mobileControls)} 
                              className={`w-full py-4 rounded-xl border flex items-center justify-center gap-3 font-bold transition-all ${mobileControls ? 'bg-green-600 border-green-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                          >
                              <Smartphone size={20} />
                              {t.touchControls}
                              <div className={`w-3 h-3 rounded-full ml-2 ${mobileControls ? 'bg-white' : 'bg-slate-600'}`}></div>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="relative z-10 w-full max-w-5xl px-4 flex flex-col md:flex-row gap-8 items-stretch">
        
        {/* Left Side: Branding & Input */}
        <div className="flex-1 flex flex-col justify-center text-left space-y-6">
          <div className="space-y-2">
            <h2 className="text-blue-500 font-bold tracking-widest text-sm uppercase flex items-center gap-2">
              <Sparkles size={16} /> {t.version}
            </h2>
            <h1 className="text-6xl md:text-7xl font-black text-white leading-tight tracking-tighter">
              HAXBALL <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                FUTT
              </span>
            </h1>
            <p className="text-slate-400 max-w-md text-lg">
              {language === 'es' ? "Bienvenido a HAXBALL FUTT. Personaliza tu equipo y domina la cancha." : 
               language === 'pt' ? "Bem-vindo ao HAXBALL FUTT. Personalize sua equipe e domine o campo." :
               "Welcome to HAXBALL FUTT. Customize your team and dominate the pitch."}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-xl flex gap-1 w-full max-w-lg shadow-2xl overflow-hidden flex-wrap">
            <button 
                onClick={() => setActiveTab('league')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'league' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <LayoutList size={16} /> {t.league}
            </button>
            <button 
                onClick={() => setActiveTab('cup')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'cup' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Trophy size={16} /> {t.cup}
            </button>
            <button 
                onClick={() => setActiveTab('quick')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'quick' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Zap size={16} /> {t.quick}
            </button>
            <button 
                onClick={() => setActiveTab('online')}
                className={`flex-1 py-3 px-2 rounded-lg font-bold text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'online' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Globe size={16} /> {t.online}
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
                            <p className="text-slate-400 text-sm">{t.leagueDesc}</p>
                        </div>
                        
                        {hasSavedGame && onLoadLeague && (
                             <button onClick={onLoadLeague} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-3 shadow-xl"><Save fill="currentColor" size={18} /> {t.continue}</button>
                        )}

                        <div className="space-y-2 border-t border-white/10 pt-4">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.teamName}</label>
                            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-lg focus:outline-none focus:border-yellow-500" maxLength={15} />
                        </div>
                        
                        <TeamEditor />
                        <SettingsControls />

                        <button onClick={() => handleStart('league')} disabled={isLoading} className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-black py-4 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            {isLoading ? <Loader2 className="animate-spin" /> : <LayoutList fill="currentColor" className="text-black" />}
                            {isLoading ? '...' : t.startSeason}
                        </button>
                    </div>
                )}

                {activeTab === 'cup' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full overflow-y-auto custom-scrollbar">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t.cup}</h3>
                            <p className="text-slate-400 text-sm">{t.cupDesc}</p>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.teamName}</label>
                            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-lg focus:outline-none focus:border-purple-500" maxLength={15} />
                        </div>

                        <TeamEditor />
                        <SettingsControls />

                        <button onClick={() => handleStart('cup')} disabled={isLoading} className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-black py-4 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            {isLoading ? <Loader2 className="animate-spin" /> : <Trophy fill="currentColor" className="text-black" />}
                            {isLoading ? '...' : t.startCup}
                        </button>
                    </div>
                )}

                {activeTab === 'quick' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">{t.quick}</h3>
                            <p className="text-slate-400 text-sm">{t.quickDesc}</p>
                        </div>
                        
                        <SettingsControls />

                        <button onClick={handleQuickMatch} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-4 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            <PlayCircle fill="currentColor" /> {t.startFriendly}
                        </button>
                    </div>
                )}

                {activeTab === 'online' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col justify-center">
                         <div>
                            <h3 className="text-2xl font-bold text-white mb-2">P2P Multiplayer</h3>
                            <p className="text-slate-400 text-sm">{t.onlineDesc}</p>
                        </div>
                        <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                            <Users className="text-emerald-400 shrink-0 mt-1" size={20} />
                            <p className="text-xs text-emerald-200">{t.onlineCardDesc}</p>
                        </div>
                        
                        {/* Customization Preview in Online Card */}
                        <div className="mt-2 space-y-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.teamName}</label>
                                <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-lg focus:outline-none focus:border-emerald-500" maxLength={15} />
                            </div>
                            <TeamEditor />
                        </div>

                        <button onClick={() => onGoToOnline(getPlayerTeam())} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-5 rounded-xl text-lg flex items-center justify-center gap-3 transition-transform active:scale-[0.98] mt-auto">
                            <Globe size={24} /> {t.goToLobby}
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
