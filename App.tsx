
import React, { useState, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import TournamentView from './components/TournamentView';
import LeagueView from './components/LeagueView';
import MainMenu from './components/MainMenu';
import OnlineMenu from './components/OnlineMenu';
import { AppState, TournamentState, Match, Team, LeagueState, LeagueTeam, LeagueMatch, MatchSettings, Difficulty, Pattern, AITrait } from './types';
import { generateMatchCommentary } from './services/geminiService';
import { MessageSquare, ArrowRight, Copy, Loader2, Wifi } from 'lucide-react';
import { Peer } from "peerjs";

const TEAM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#d946ef', '#14b8a6', '#6366f1', '#f97316'];
const PATTERNS: Pattern[] = ['solid', 'stripes', 'sash', 'half'];
const TRAITS: AITrait[] = ['balanced', 'defensive', 'aggressive'];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.MENU);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [league, setLeague] = useState<LeagueState | null>(null);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [quickMatchState, setQuickMatchState] = useState<{player: Team, cpu: Team, settings: MatchSettings} | null>(null);
  const [nextSeasonData, setNextSeasonData] = useState<{ div1: LeagueTeam[], div2: LeagueTeam[], div3: LeagueTeam[], season: number } | null>(null);

  // Online State
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<any>(null);
  const networkDataRef = useRef<any>(null);

  const saveLeague = () => { if (league) localStorage.setItem('haxball_league_save', JSON.stringify(league)); };
  const loadLeague = () => {
      const savedData = localStorage.getItem('haxball_league_save');
      if (savedData) {
          const parsedLeague = JSON.parse(savedData) as LeagueState;
          if (!parsedLeague.userTeamId) {
             parsedLeague.userTeamId = parsedLeague.div1.find(t=>t.isPlayer)?.id || 'p1';
          }
          setLeague(parsedLeague);
          setAppState(AppState.LEAGUE);
      }
  };
  const hasSavedLeague = !!localStorage.getItem('haxball_league_save');

  // --- PEERJS ---
  const initializePeer = () => {
      if (peerRef.current) return;
      const newPeer = new Peer() as any;
      newPeer.on('open', (id: string) => setPeerId(id));
      newPeer.on('connection', (conn: any) => {
          connRef.current = conn; 
          setConnectionStatus('connected'); 
          setOnlineRole('host');
          setupConnectionListeners(conn); 
          setAppState(AppState.GAME);
      });
      peerRef.current = newPeer;
  };

  const connectToPeer = (targetId?: string) => {
      const idToConnect = targetId || remotePeerId;
      if (!peerRef.current || !idToConnect) return;
      setConnectionStatus('connecting');
      const conn = (peerRef.current as any).connect(idToConnect);
      connRef.current = conn; 
      setOnlineRole('client');
      conn.on('open', () => { 
          setConnectionStatus('connected'); 
          setupConnectionListeners(conn); 
          setAppState(AppState.GAME); 
      });
  };

  const setupConnectionListeners = (conn: any) => {
      conn.on('data', (data: any) => networkDataRef.current = data);
      conn.on('close', () => { alert('Conexión perdida'); returnToMenu(); window.location.reload(); });
  };
  const sendNetworkData = (data: any) => { if (connRef.current && connectionStatus === 'connected') connRef.current.send(data); };

  // --- HELPERS ---
  const generateRandomAI = (id: string, name: string): Team => {
      const color = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
      let secColor = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
      while(secColor === color) secColor = TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
      
      return {
          id, name, color, isPlayer: false,
          secondaryColor: secColor,
          pattern: PATTERNS[Math.floor(Math.random() * PATTERNS.length)],
          aiTrait: TRAITS[Math.floor(Math.random() * TRAITS.length)]
      };
  };

  const simulateRemainingMatchesInRound = (currentMatches: Match[], round: number) => {
      const aiMatches = currentMatches.filter(m => m.round === round && (!m.teamA.isPlayer && !m.teamB.isPlayer) && (!m.playedLeg1 || !m.playedLeg2));
      let updatedMatches = [...currentMatches];
      aiMatches.forEach(match => {
          let l1A = match.scoreLeg1A, l1B = match.scoreLeg1B, l2A = match.scoreLeg2A, l2B = match.scoreLeg2B, p1 = match.playedLeg1, p2 = match.playedLeg2;
          if (!p1) { l1A = Math.floor(Math.random() * 4); l1B = Math.floor(Math.random() * 4); p1 = true; }
          if (!p2) { l2A = Math.floor(Math.random() * 4); l2B = Math.floor(Math.random() * 4); p2 = true; }
          if (l1A + l2A === l1B + l2B) l2A++; 
          const index = updatedMatches.findIndex(m => m.id === match.id);
          if (index !== -1) {
              const winner = (l1A + l2A > l1B + l2B) ? updatedMatches[index].teamA : updatedMatches[index].teamB;
              updatedMatches[index] = { ...updatedMatches[index], scoreLeg1A: l1A, scoreLeg1B: l1B, scoreLeg2A: l2A, scoreLeg2B: l2B, playedLeg1: p1, playedLeg2: p2, winner };
              
              const nextRound = match.round + 1;
              const currentIdx = parseInt(match.id.split('_')[1]); 
              const nextMIdx = Math.floor(currentIdx / 2);
              const nextMIdPrefix = match.round === 0 ? 'qf' : match.round === 1 ? 'sf' : 'f';
              const nextMId = `${nextMIdPrefix}_${nextMIdx}`;
              
              const targetMatchIdx = updatedMatches.findIndex(nm => nm.id === nextMId);
              if (targetMatchIdx !== -1) {
                  if (currentIdx % 2 === 0) updatedMatches[targetMatchIdx].teamA = winner;
                  else updatedMatches[targetMatchIdx].teamB = winner;
              }
          }
      });
      return updatedMatches;
  };

  const startQuickMatch = (settings: MatchSettings) => {
      const pTeam: Team = { id: 'qm_p', name: 'Jugador', color: TEAM_COLORS[0], isPlayer: true, pattern: 'solid', secondaryColor: '#fff' };
      const cpuTeam = generateRandomAI('qm_cpu', 'CPU');
      setQuickMatchState({ player: pTeam, cpu: cpuTeam, settings });
      setAppState(AppState.QUICK_MATCH);
  };

  const startLeague = (playerTeam: Team, allNames: string[], settings: MatchSettings, existingTeams?: any, season: number = 1) => {
      let d1, d2, d3;
      if (existingTeams) { d1=existingTeams.div1; d2=existingTeams.div2; d3=existingTeams.div3; } else {
          const teams: LeagueTeam[] = [];
          teams.push({ ...playerTeam, stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 } });
          for (let i = 1; i < 60; i++) {
              const t = generateRandomAI(`ai_${i}`, allNames[i%allNames.length] + (i>=allNames.length?` ${i}`:''));
              teams.push({ ...t, stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 } });
          }
          const shuffled = [...teams].sort(() => Math.random() - 0.5);
          const p = shuffled.find(t => t.isPlayer)!; const others = shuffled.filter(t => !t.isPlayer);
          d1 = [p, ...others.slice(0, 19)]; d2 = others.slice(19, 39); d3 = others.slice(39, 59);
      }
      
      const genSched = (t: LeagueTeam[]) => {
           const sched = []; const ids=t.map(x=>x.id); const n=ids.length;
           for(let r=0; r<n-1; r++) {
               const round=[]; for(let i=0; i<n/2; i++) round.push({id:`r${r}_${i}`, homeId:ids[i], awayId:ids[n-1-i], homeScore:null, awayScore:null, played:false, round:r});
               sched.push(round); ids.splice(1,0,ids.pop()!);
           }
           return sched;
      }
      setLeague({ 
          div1: d1, div2: d2, div3: d3, 
          scheduleDiv1: genSched(d1), scheduleDiv2: genSched(d2), scheduleDiv3: genSched(d3), 
          currentRound: 0, totalRounds: 19, userTeamId: playerTeam.id, settings, season 
      });
      setAppState(AppState.LEAGUE);
  };

  const simulateLeagueRound = () => {
    if (!league) return;
    const r = league.currentRound;

    const simMatches = (matches: LeagueMatch[]) => {
        return matches.map(m => {
            if (m.played) return m;
            if (m.homeId === league.userTeamId || m.awayId === league.userTeamId) return m;
            const sH = Math.floor(Math.random() * 4);
            const sA = Math.floor(Math.random() * 4);
            return { ...m, homeScore: sH, awayScore: sA, played: true };
        });
    };

    const newS1 = [...league.scheduleDiv1]; newS1[r] = simMatches(newS1[r]);
    const newS2 = [...league.scheduleDiv2]; newS2[r] = simMatches(newS2[r]);
    const newS3 = [...league.scheduleDiv3]; newS3[r] = simMatches(newS3[r]);

    const updateStats = (teams: LeagueTeam[], matches: LeagueMatch[]) => {
        return teams.map(t => {
            const playedMatches = matches.filter(m => m.played && (m.homeId === t.id || m.awayId === t.id));
            const stats = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
            playedMatches.forEach(m => {
                const isHome = m.homeId === t.id;
                const myScore = isHome ? m.homeScore! : m.awayScore!;
                const opScore = isHome ? m.awayScore! : m.homeScore!;
                stats.played++; stats.gf += myScore; stats.ga += opScore;
                if (myScore > opScore) { stats.won++; stats.points += 3; }
                else if (myScore < opScore) { stats.lost++; }
                else { stats.drawn++; stats.points += 1; }
            });
            return { ...t, stats };
        });
    };

    const nD1 = updateStats(league.div1, newS1.flat());
    const nD2 = updateStats(league.div2, newS2.flat());
    const nD3 = updateStats(league.div3, newS3.flat());

    const userMatch = [newS1[r], newS2[r], newS3[r]].flat().find(m => m.homeId === league.userTeamId || m.awayId === league.userTeamId);
    const canAdvance = userMatch ? userMatch.played : true;
    const nextR = canAdvance ? r + 1 : r;

    if (nextR >= 19) {
        endSeason(nD1, nD2, nD3);
    } else {
        setLeague({ ...league, div1: nD1, div2: nD2, div3: nD3, scheduleDiv1: newS1, scheduleDiv2: newS2, scheduleDiv3: newS3, currentRound: nextR });
    }
  };

  const endSeason = (d1: LeagueTeam[], d2: LeagueTeam[], d3: LeagueTeam[]) => {
    if (!league) return;
    const sort = (l: LeagueTeam[]) => [...l].sort((a,b)=>b.stats.points-a.stats.points || (b.stats.gf-b.stats.ga)-(a.stats.gf-a.stats.ga));
    const s1 = sort(d1); const s2 = sort(d2); const s3 = sort(d3);

    const champion = s1[0];
    alert(`¡FIN DE LA LIGA!\nCampeón de Liga: ${champion.name}`);

    const nD1 = [...s1.slice(0,17), ...s2.slice(0,3)];
    const nD2 = [...s1.slice(17,20), ...s2.slice(3,15), ...s3.slice(0,5)];
    const nD3 = [...s2.slice(15,20), ...s3.slice(5,20)];
    
    const reset = (l: LeagueTeam[]) => l.map(t=>({...t, stats:{played:0,points:0,gf:0,ga:0,won:0,drawn:0,lost:0}}));
    
    setNextSeasonData({ div1: reset(nD1), div2: reset(nD2), div3: reset(nD3), season: league.season + 1 });

    const cupTeams = s1.slice(0, 16).map(t => ({...t} as Team));
    const userQualified = cupTeams.some(t => t.id === league.userTeamId);
    
    if (userQualified) {
        alert("¡Has clasificado a la Copa de Campeones!");
        setLeague(null);
        startTournament(league.div1.find(t=>t.id===league.userTeamId)!, [], league.settings);
    } else {
        alert("No clasificaste a la copa. Simulando playoffs...");
        setLeague(null);
        const dummyPlayer = league.div1.find(t=>t.id===league.userTeamId)!;
        startTournament(dummyPlayer, [], league.settings);
        setTimeout(() => simulateRestOfCup(dummyPlayer.id), 500);
    }
  };
  
  const simulateRestOfCup = (userId?: string) => {
      setTournament(prev => {
          if (!prev) return null;
          let matches = [...prev.matches];
          [0,1,2,3].forEach(r => {
             matches = matches.map(m => {
                 if (m.round !== r) return m;
                 if (m.teamA.name === 'TBD' || m.teamB.name === 'TBD') return m;
                 if (m.playedLeg1 && m.playedLeg2) return m;

                 const l1A = Math.floor(Math.random() * 4); const l1B = Math.floor(Math.random() * 4);
                 let l2A = Math.floor(Math.random() * 4); let l2B = Math.floor(Math.random() * 4);
                 if (l1A+l2A === l1B+l2B) l2A++;

                 const winner = (l1A+l2A > l1B+l2B) ? m.teamA : m.teamB;
                 const nextIdx = matches.findIndex(nm => nm.round === r + 1 && (nm.teamA.name === 'TBD' || nm.teamB.name === 'TBD'));
                 if (nextIdx !== -1) {
                     if (matches[nextIdx].teamA.name === 'TBD') matches[nextIdx].teamA = winner;
                     else matches[nextIdx].teamB = winner;
                 }
                 return { ...m, playedLeg1:true, playedLeg2:true, scoreLeg1A:l1A, scoreLeg1B:l1B, scoreLeg2A:l2A, scoreLeg2B:l2B, winner };
             });
          });
          return { ...prev, matches, champion: matches[14].winner || null };
      });
  };

  const startTournament = (playerTeam: Team, names: string[], settings: MatchSettings) => {
      const teams: Team[] = [playerTeam];
      if (names.length > 0) names.slice(0, 15).forEach((n, i) => teams.push(generateRandomAI(`ai_${i}`, n)));
      
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      
      const matches: Match[] = [];
      for(let i=0; i<8; i++) matches.push({ id:`r16_${i}`, teamA: shuffled[i*2] || {id:'dye',name:'Bye',color:'#000',isPlayer:false}, teamB: shuffled[i*2+1] || {id:'bye',name:'Bye',color:'#000',isPlayer:false}, scoreLeg1A:0, scoreLeg1B:0, scoreLeg2A:0, scoreLeg2B:0, playedLeg1:false, playedLeg2:false, round:0 });
      for(let i=0; i<4; i++) matches.push({id:`qf_${i}`, teamA:{id:'tbd',name:'TBD',color:'#333',isPlayer:false}, teamB:{id:'tbd',name:'TBD',color:'#333',isPlayer:false}, scoreLeg1A:0, scoreLeg1B:0, scoreLeg2A:0, scoreLeg2B:0, playedLeg1:false, playedLeg2:false, round:1});
      for(let i=0; i<2; i++) matches.push({id:`sf_${i}`, teamA:{id:'tbd',name:'TBD',color:'#333',isPlayer:false}, teamB:{id:'tbd',name:'TBD',color:'#333',isPlayer:false}, scoreLeg1A:0, scoreLeg1B:0, scoreLeg2A:0, scoreLeg2B:0, playedLeg1:false, playedLeg2:false, round:2});
      matches.push({id:`f_0`, teamA:{id:'tbd',name:'TBD',color:'#333',isPlayer:false}, teamB:{id:'tbd',name:'TBD',color:'#333',isPlayer:false}, scoreLeg1A:0, scoreLeg1B:0, scoreLeg2A:0, scoreLeg2B:0, playedLeg1:false, playedLeg2:false, round:3});
      
      setTournament({ matches, currentMatchId: null, champion: null, settings, userTeamId: playerTeam.id });
      setAppState(AppState.TOURNAMENT_TREE);
  };

  const playMatch = (matchId: string) => {
      if(!tournament) return;
      setTournament({...tournament, currentMatchId: matchId});
      setAppState(AppState.GAME);
  };
  
  const handleGameOver = (scoreA: number, scoreB: number) => {
      if (appState === AppState.QUICK_MATCH) { setAppState(AppState.MENU); return; }
      if (appState === AppState.GAME && onlineRole) { 
          alert(`Juego Terminado. Marcador: ${scoreA} - ${scoreB}`);
          setAppState(AppState.ONLINE_MENU); 
          return; 
      }
      
      // FIX: Check if league object exists instead of checking state (since state is currently GAME)
      if (league) { 
          const r = league.currentRound;
          const s1 = league.scheduleDiv1[r].find(m=>m.homeId===league.userTeamId||m.awayId===league.userTeamId);
          const s2 = league.scheduleDiv2[r].find(m=>m.homeId===league.userTeamId||m.awayId===league.userTeamId);
          const s3 = league.scheduleDiv3[r].find(m=>m.homeId===league.userTeamId||m.awayId===league.userTeamId);
          const m = s1 || s2 || s3;
          
          if(m) {
              const isHome = m.homeId === league.userTeamId;
              m.homeScore = isHome ? scoreA : scoreB;
              m.awayScore = isHome ? scoreB : scoreA;
              m.played = true;
              simulateLeagueRound();
          }
          setAppState(AppState.LEAGUE);
          return;
      }
      
      if (tournament && tournament.currentMatchId) {
          const mIdx = tournament.matches.findIndex(m=>m.id === tournament.currentMatchId);
          if (mIdx !== -1) {
              const m = tournament.matches[mIdx];
              let realScoreA = scoreA; 
              let realScoreB = scoreB;
              
              if (m.teamB.id === tournament.userTeamId) {
                   realScoreA = scoreB;
                   realScoreB = scoreA;
              }

              let newM = {...m};
              let roundCompleted = false;

              if (!newM.playedLeg1) {
                  newM.scoreLeg1A = realScoreA; newM.scoreLeg1B = realScoreB; newM.playedLeg1 = true;
              } else {
                  newM.scoreLeg2A = realScoreA; newM.scoreLeg2B = realScoreB; newM.playedLeg2 = true;
                  const aggA = newM.scoreLeg1A + newM.scoreLeg2A;
                  const aggB = newM.scoreLeg1B + newM.scoreLeg2B;
                  
                  if (aggA > aggB) newM.winner = newM.teamA;
                  else if (aggB > aggA) newM.winner = newM.teamB;
                  else {
                      newM.winner = newM.teamA; 
                  }
                  roundCompleted = true;
              }
              
              const tempMatches = [...tournament.matches];
              tempMatches[mIdx] = newM;

              if (newM.winner && roundCompleted) {
                   const currentIdx = parseInt(m.id.split('_')[1]); 
                   const nextMIdx = Math.floor(currentIdx / 2);
                   const nextMIdPrefix = m.round === 0 ? 'qf' : m.round === 1 ? 'sf' : 'f';
                   const nextMId = `${nextMIdPrefix}_${nextMIdx}`;
                   const targetMatchIdx = tempMatches.findIndex(nm => nm.id === nextMId);
                   if (targetMatchIdx !== -1) {
                       if (currentIdx % 2 === 0) tempMatches[targetMatchIdx].teamA = newM.winner!;
                       else tempMatches[targetMatchIdx].teamB = newM.winner!;
                   }
              }

              let finalMatches = tempMatches;
              if (roundCompleted) {
                  finalMatches = simulateRemainingMatchesInRound(tempMatches, newM.round);
              }

              if (newM.round === 3 && roundCompleted) {
                  setTournament({ ...tournament, matches: finalMatches, currentMatchId: null, champion: newM.winner });
              } else {
                  setTournament({ ...tournament, matches: finalMatches, currentMatchId: null });
              }
          }
          setAppState(AppState.TOURNAMENT_TREE);
      }
  };

  const returnToMenu = () => { 
      setAppState(AppState.MENU); 
      setTournament(null); 
      setLeague(null);
      networkDataRef.current = null; // Clean up network data
      if (peerRef.current && onlineRole) {
          // Keep peer connection alive?
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-green-500 selection:text-white">
      {appState === AppState.MENU && (
        <MainMenu 
            onStartTournament={startTournament} 
            onStartLeague={startLeague}
            onGoToOnline={() => { setAppState(AppState.ONLINE_MENU); initializePeer(); }}
            onQuickMatch={startQuickMatch}
            onLoadLeague={loadLeague}
            hasSavedGame={hasSavedLeague}
        />
      )}

      {appState === AppState.ONLINE_MENU && (
          <OnlineMenu 
             peerId={peerId}
             connectionStatus={connectionStatus}
             onConnect={(remoteId) => { setRemotePeerId(remoteId); connectToPeer(remoteId); }}
             onBack={() => {
                 setAppState(AppState.MENU);
             }}
          />
      )}
      
      {appState === AppState.LEAGUE && league && (
          <LeagueView 
             league={league} 
             onPlayMatch={(mid) => setAppState(AppState.GAME)}
             onSimulateRound={simulateLeagueRound}
             onSaveLeague={saveLeague}
             onExit={returnToMenu}
          />
      )}
      
      {appState === AppState.TOURNAMENT_TREE && tournament && (
         <div className="pt-10 animate-in fade-in duration-500 min-h-screen bg-black">
             <TournamentView state={tournament} onPlayMatch={playMatch} 
                onStartNextSeason={() => {
                    if (nextSeasonData && nextSeasonData.season <= 15) {
                        startLeague({id:tournament.userTeamId, name:'Player', color:'#fff', isPlayer:true}, [], league?.settings || {timeLimit:120,difficulty:'normal'}, nextSeasonData, nextSeasonData.season);
                    } else {
                        alert("Carrera Finalizada."); returnToMenu();
                    }
                }}
             />
         </div>
      )}

      {(appState === AppState.GAME || appState === AppState.QUICK_MATCH) && (
        <div className="h-screen flex items-center justify-center bg-green-950/20">
          {(() => {
            let tA: Team = {id:'1',name:'A',color:'#f00',isPlayer:true}, tB: Team = {id:'2',name:'B',color:'#00f',isPlayer:false};
            let allowDraw = false;
            let currentSettings: MatchSettings = { timeLimit: 120, difficulty: 'normal' };
            let leg1ScoreA = 0;
            let leg1ScoreB = 0;
            let mode: 'single' | 'online_host' | 'online_client' = 'single';

            if (appState === AppState.QUICK_MATCH && quickMatchState) { 
                tA = quickMatchState.player; 
                tB = quickMatchState.cpu; 
                allowDraw = false;
                currentSettings = quickMatchState.settings;
            } else if (onlineRole && connectionStatus === 'connected') {
                mode = onlineRole === 'host' ? 'online_host' : 'online_client';
                // Online Team Setup
                tA = { id: 'host', name: 'HOST', color: TEAM_COLORS[1], isPlayer: true, pattern: 'solid' };
                tB = { id: 'client', name: 'CLIENT', color: TEAM_COLORS[4], isPlayer: true, pattern: 'stripes', secondaryColor: '#fff' };
                currentSettings = { timeLimit: 180, difficulty: 'normal' }; // Default online time
            } else if (league && appState === AppState.GAME) {
                 allowDraw = true;
                 currentSettings = league.settings;
                 const allTeams = [...league.div1, ...league.div2, ...league.div3];
                 const allMatches = [...league.scheduleDiv1, ...league.scheduleDiv2, ...league.scheduleDiv3];
                 const currentRoundMatches = allMatches[league.currentRound] || [];
                 const userMatch = currentRoundMatches.find(m => m.homeId === league.userTeamId || m.awayId === league.userTeamId);
                 
                 if (userMatch) {
                     const homeTeam = allTeams.find(t => t.id === userMatch.homeId)!;
                     const awayTeam = allTeams.find(t => t.id === userMatch.awayId)!;
                     
                     if (awayTeam.isPlayer) { tA = awayTeam; tB = homeTeam; } else { tA = homeTeam; tB = awayTeam; }
                 }
            } else if (tournament && tournament.currentMatchId) {
                 const m = tournament.matches.find(x=>x.id===tournament.currentMatchId);
                 if(m) { 
                     if (m.teamB.isPlayer) { tA = m.teamB; tB = m.teamA; } else { tA = m.teamA; tB = m.teamB; }
                     
                     if (m.playedLeg1) {
                         allowDraw = false;
                         if (m.teamB.isPlayer) {
                             leg1ScoreA = m.scoreLeg1B;
                             leg1ScoreB = m.scoreLeg1A;
                         } else {
                             leg1ScoreA = m.scoreLeg1A;
                             leg1ScoreB = m.scoreLeg1B;
                         }
                     } else {
                         allowDraw = true; 
                     }
                 }
                 currentSettings = tournament.settings;
            }

            return (
              <GameCanvas 
                teamA={tA} teamB={tB} 
                onGameOver={handleGameOver}
                onExit={returnToMenu}
                allowDraw={allowDraw}
                matchDuration={currentSettings.timeLimit}
                aiDifficulty={currentSettings.difficulty}
                allowRestart={appState === AppState.QUICK_MATCH}
                leg1ScoreA={leg1ScoreA}
                leg1ScoreB={leg1ScoreB}
                mode={mode}
                networkSend={sendNetworkData}
                networkDataRef={networkDataRef}
              />
            );
          })()}
        </div>
      )}
      
      {appState === AppState.GAME_OVER && (
          <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-900/90 backdrop-blur">
             <h2 className="text-4xl font-bold mb-6 text-white">Partido Finalizado</h2>
             <button onClick={() => tournament ? setAppState(AppState.TOURNAMENT_TREE) : returnToMenu()} className="bg-blue-600 px-8 py-3 rounded-full font-bold">Continuar</button>
          </div>
      )}
    </div>
  );
};

export default App;
