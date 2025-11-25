
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsCircle, Team, GameStatePayload, InputPayload, Difficulty, Pattern } from '../types';
import { Pause, Play, LogOut, Volume2, VolumeX, Target } from 'lucide-react';

interface GameCanvasProps {
  teamA: Team;
  teamB: Team;
  onGameOver: (scoreA: number, scoreB: number) => void;
  onExit?: () => void;
  mode?: 'single' | 'online_host' | 'online_client';
  networkSend?: (data: any) => void;
  networkDataRef?: React.MutableRefObject<any>;
  allowDraw?: boolean;
  matchDuration?: number;
  aiDifficulty?: Difficulty;
  allowRestart?: boolean;
  leg1ScoreA?: number;
  leg1ScoreB?: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const PITCH_MARGIN = 40;
const GOAL_HEIGHT = 140;
const PLAYER_RADIUS = 16;
const BALL_RADIUS = 9;
const MAX_SPEED = 4.5;
const MAX_BALL_SPEED = 8.5; // Reduced to prevent visibility issues
const KICK_STRENGTH = 4.0; // Adjusted for better control
const PHYSICS_STEPS = 5;

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  teamA, teamB, onGameOver, onExit, mode = 'single', networkSend, networkDataRef, 
  allowDraw = false, matchDuration = 120, aiDifficulty = 'normal', allowRestart = false,
  leg1ScoreA = 0, leg1ScoreB = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [timeLeft, setTimeLeft] = useState(matchDuration); 
  const [isGoldenGoal, setIsGoldenGoal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const requestRef = useRef<number>(0);
  
  // PENALTY STATE (Kept for compatibility, but bypassed for Golden Goal)
  const [isPenaltyMode, setIsPenaltyMode] = useState(false);
  const [penaltyPhase, setPenaltyPhase] = useState<'aiming' | 'kicking' | 'result'>('aiming');
  const [penaltyRound, setPenaltyRound] = useState(0);
  const [penaltyTurn, setPenaltyTurn] = useState<'player' | 'cpu'>('player');
  const penaltyAimAngle = useRef(0);
  const penaltyAimDirection = useRef(1); // 1 or -1 for oscillation

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundTimeRef = useRef<number>(0);
  const isEndingRef = useRef(false);
  
  // Game Objects
  const playerRef = useRef<PhysicsCircle>({ 
      x: 150, y: CANVAS_HEIGHT / 2, radius: PLAYER_RADIUS, vx: 0, vy: 0, mass: 10, damping: 0.94, 
      color: teamA.color, secondaryColor: teamA.secondaryColor, pattern: teamA.pattern 
  });
  const opponentRef = useRef<PhysicsCircle>({ 
      x: CANVAS_WIDTH - 150, y: CANVAS_HEIGHT / 2, radius: PLAYER_RADIUS, vx: 0, vy: 0, mass: 10, damping: 0.94, 
      color: teamB.color, secondaryColor: teamB.secondaryColor, pattern: teamB.pattern
  });
  const ballRef = useRef<PhysicsCircle>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, radius: BALL_RADIUS, vx: 0, vy: 0, mass: 1, damping: 0.985, color: '#ffffff' });
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const remoteKeysRef = useRef<{ [key: string]: boolean }>({});

  const getAISpeed = (diff: Difficulty) => {
      switch(diff) {
          case 'easy': return 2.2;
          case 'normal': return 3.0;
          case 'hard': return 4.0;
          case 'legend': return 4.8;
          default: return 3.0;
      }
  };
  const AI_SPEED = getAISpeed(aiDifficulty as Difficulty);

  const initAudio = () => {
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) { audioCtxRef.current = new AudioContext(); }
      }
      if (audioCtxRef.current?.state === 'suspended') { audioCtxRef.current.resume(); }
  };

  const playSound = useCallback((type: 'kick' | 'collision' | 'goal') => {
      if (!soundEnabled || !audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'kick') {
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'collision') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(); osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        osc.start(); osc.stop(ctx.currentTime + 1);
      }
  }, [soundEnabled]);

  const resetPositions = useCallback((mode: 'kickoff' | 'penalty') => {
    if (mode === 'kickoff') {
        playerRef.current.x = 150; playerRef.current.y = CANVAS_HEIGHT / 2;
        opponentRef.current.x = CANVAS_WIDTH - 150; opponentRef.current.y = CANVAS_HEIGHT / 2;
        ballRef.current.x = CANVAS_WIDTH / 2; ballRef.current.y = CANVAS_HEIGHT / 2;
    } else {
        ballRef.current.x = CANVAS_WIDTH - 200; 
        ballRef.current.y = CANVAS_HEIGHT / 2;
        playerRef.current.x = CANVAS_WIDTH - 240;
        playerRef.current.y = CANVAS_HEIGHT / 2;
        opponentRef.current.x = CANVAS_WIDTH - 50;
        opponentRef.current.y = CANVAS_HEIGHT / 2;
        
        if (penaltyTurn === 'cpu') {
             ballRef.current.x = 200;
             opponentRef.current.x = 240; 
             playerRef.current.x = 50; 
        }
    }
    [playerRef.current, opponentRef.current, ballRef.current].forEach(e => { e.vx = 0; e.vy = 0; });
  }, [penaltyTurn]);

  // --- PENALTY LOGIC ---
  const startPenaltyShootout = () => {
      setIsGoldenGoal(false);
      setIsPenaltyMode(true);
      setPenaltyTurn('player');
      setPenaltyRound(1);
      setPenaltyPhase('aiming');
      resetPositions('penalty');
  };

  const updatePenaltyLogic = () => {
      if (penaltyPhase === 'aiming') {
          penaltyAimAngle.current += 0.05 * penaltyAimDirection.current;
          if (penaltyAimAngle.current > 0.8) penaltyAimDirection.current = -1;
          if (penaltyAimAngle.current < -0.8) penaltyAimDirection.current = 1;

          if (keysRef.current[' '] && penaltyTurn === 'player') {
              setPenaltyPhase('kicking');
              const angle = penaltyAimAngle.current;
              if (penaltyTurn === 'player') {
                  playerRef.current.vx = Math.cos(angle) * 3;
                  playerRef.current.vy = Math.sin(angle) * 3;
                  setTimeout(() => {
                     ballRef.current.vx = Math.cos(angle) * 12;
                     ballRef.current.vy = Math.sin(angle) * 12;
                     playSound('kick');
                  }, 100);
                  setTimeout(() => {
                     const diveDir = Math.random() > 0.5 ? 1 : -1;
                     opponentRef.current.vy = diveDir * 6;
                  }, 200);
              }
          }
          
          if (penaltyTurn === 'cpu') {
              if (Math.random() < 0.05) { 
                  setPenaltyPhase('kicking');
                  const angle = (Math.random() - 0.5); 
                  opponentRef.current.vx = -Math.cos(angle) * 3;
                  opponentRef.current.vy = Math.sin(angle) * 3;
                  setTimeout(() => {
                     ballRef.current.vx = -Math.cos(angle) * 12;
                     ballRef.current.vy = Math.sin(angle) * 12;
                     playSound('kick');
                  }, 100);
              }
              const up = keysRef.current['w'] || keysRef.current['ArrowUp'];
              const down = keysRef.current['s'] || keysRef.current['ArrowDown'];
              if (up) playerRef.current.vy = -4;
              if (down) playerRef.current.vy = 4;
          }
      } else if (penaltyPhase === 'kicking') {
          const ball = ballRef.current;
          if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
             handlePenaltyEnd(false);
          }
      }
  };
  
  const handlePenaltyEnd = (isGoal: boolean) => {
      setPenaltyPhase('result');
      if (isGoal) {
          if (penaltyTurn === 'player') setScoreA(s => s + 1);
          else setScoreB(s => s + 1);
          playSound('goal');
      }
      setTimeout(() => {
          if (penaltyTurn === 'player') {
              setPenaltyTurn('cpu');
          } else {
              setPenaltyTurn('player');
              setPenaltyRound(r => r + 1);
              if (penaltyRound >= 3 && scoreA !== scoreB) {
                   onGameOver(scoreA, scoreB);
                   return;
              }
          }
          setPenaltyPhase('aiming');
          resetPositions('penalty');
      }, 2000);
  };

  const handleGoal = useCallback((scorer: 'A' | 'B') => {
      if (isEndingRef.current) return;
      if (isPenaltyMode) {
          if ((scorer === 'A' && penaltyTurn === 'player') || (scorer === 'B' && penaltyTurn === 'cpu')) handlePenaltyEnd(true);
          else handlePenaltyEnd(false);
          return;
      }
      playSound('goal');
      if (scorer === 'A') setScoreA(s => s + 1); else setScoreB(s => s + 1);
      
      // If Golden Goal mode is active, any goal ends the game immediately
      if (isGoldenGoal) {
          isEndingRef.current = true;
          // Pass the updated score
          setTimeout(() => onGameOver(scorer==='A'?scoreA+1:scoreA, scorer==='B'?scoreB+1:scoreB), 100);
      } else {
          resetPositions('kickoff');
      }
  }, [scoreA, scoreB, isGoldenGoal, onGameOver, resetPositions, playSound, isPenaltyMode, penaltyTurn]);

  // PHYSICS
  const runPhysics = useCallback(() => {
    const player = playerRef.current;
    const opponent = opponentRef.current;
    const ball = ballRef.current;
    const entities = [player, opponent, ball];

    for (let step = 0; step < PHYSICS_STEPS; step++) {
        entities.forEach(c => {
            c.x += c.vx / PHYSICS_STEPS;
            c.y += c.vy / PHYSICS_STEPS;
        });

        const checkCollision = (c1: PhysicsCircle, c2: PhysicsCircle) => {
            const dx = c2.x - c1.x; const dy = c2.y - c1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < c1.radius + c2.radius) {
                if (step === 0) playSound(c1 === ball || c2 === ball ? 'kick' : 'collision');
                const angle = Math.atan2(dy, dx);
                const sin = Math.sin(angle), cos = Math.cos(angle);
                
                const overlap = (c1.radius + c2.radius - dist) + 0.5;
                c1.x -= overlap * cos * 0.5; c1.y -= overlap * sin * 0.5;
                c2.x += overlap * cos * 0.5; c2.y += overlap * sin * 0.5;

                // CRITICAL FIX: Player Physics Stability
                // If it's Player vs Player
                if (c1 !== ball && c2 !== ball) {
                    let tx = c1.vx; let ty = c1.vy;
                    c1.vx = c2.vx * 0.8; c1.vy = c2.vy * 0.8;
                    c2.vx = tx * 0.8; c2.vy = ty * 0.8;
                } 
                // If it's Player vs Ball
                else {
                    // Identify which is the ball
                    const ballEntity = c1 === ball ? c1 : c2;
                    const playerEntity = c1 === ball ? c2 : c1;
                    
                    // IMPORTANT: Player keeps their own velocity (dampened), DOES NOT inherit ball velocity
                    // This prevents the player from flying backwards when hitting the ball
                    const playerVx = playerEntity.vx;
                    const playerVy = playerEntity.vy;
                    
                    playerEntity.vx = playerVx * 0.95; 
                    playerEntity.vy = playerVy * 0.95;

                    // Ball inherits player velocity plus kick force
                    const isKicking = (playerEntity === player && keysRef.current[' ']) || (playerEntity === opponent && remoteKeysRef.current[' ']);
                    const kickBonus = isKicking ? KICK_STRENGTH : 1.2; 
                    
                    // Transfer momentum from player to ball
                    ballEntity.vx = playerVx * kickBonus + ballEntity.vx * 0.5;
                    ballEntity.vy = playerVy * kickBonus + ballEntity.vy * 0.5;

                    // Hard Cap collision velocity immediately
                    const postColSpeed = Math.sqrt(ballEntity.vx*ballEntity.vx + ballEntity.vy*ballEntity.vy);
                    if (postColSpeed > MAX_BALL_SPEED) {
                        ballEntity.vx = (ballEntity.vx/postColSpeed) * MAX_BALL_SPEED;
                        ballEntity.vy = (ballEntity.vy/postColSpeed) * MAX_BALL_SPEED;
                    }
                }
            }
        };

        checkCollision(player, ball);
        checkCollision(opponent, ball);
        checkCollision(player, opponent);

        const constrain = (c: PhysicsCircle) => {
            const wallRestitution = (c === ball) ? 0.65 : 0.7;
            if (c.y - c.radius < PITCH_MARGIN) { c.y = PITCH_MARGIN + c.radius; c.vy *= -wallRestitution; }
            if (c.y + c.radius > CANVAS_HEIGHT - PITCH_MARGIN) { c.y = CANVAS_HEIGHT - PITCH_MARGIN - c.radius; c.vy *= -wallRestitution; }
            
            const inGoal = c.y > (CANVAS_HEIGHT - GOAL_HEIGHT) / 2 && c.y < (CANVAS_HEIGHT + GOAL_HEIGHT) / 2;
            if (c.x - c.radius < PITCH_MARGIN) {
                if (!inGoal) { c.x = PITCH_MARGIN + c.radius; c.vx *= -wallRestitution; }
                else if (c.x < 5 && c === ball) return 'GOAL_B';
            }
            if (c.x + c.radius > CANVAS_WIDTH - PITCH_MARGIN) {
                if (!inGoal) { c.x = CANVAS_WIDTH - PITCH_MARGIN - c.radius; c.vx *= -wallRestitution; }
                else if (c.x > CANVAS_WIDTH - 5 && c === ball) return 'GOAL_A';
            }
            return null;
        };

        const gA = constrain(ball);
        if (gA) return gA;
        constrain(player); constrain(opponent);
    }

    // Safety Cap at end of frame
    const b = ballRef.current;
    const bSpeed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
    if(bSpeed > MAX_BALL_SPEED) {
        b.vx = (b.vx/bSpeed) * MAX_BALL_SPEED;
        b.vy = (b.vy/bSpeed) * MAX_BALL_SPEED;
    }

    entities.forEach(c => { c.vx *= c.damping; c.vy *= c.damping; });
    return null;
  }, [playSound]);

  const update = useCallback(() => {
    if (isPaused) return;

    if (isPenaltyMode) {
        updatePenaltyLogic();
        const res = runPhysics();
        if (res) handleGoal(res === 'GOAL_A' ? 'A' : 'B');
        return;
    }

    const player = playerRef.current;
    const opponent = opponentRef.current;
    const ball = ballRef.current;

    const ACCEL = 0.5;
    const k = keysRef.current;
    const up = k['ArrowUp'] || k['w'] || k['W'];
    const down = k['ArrowDown'] || k['s'] || k['S'];
    const left = k['ArrowLeft'] || k['a'] || k['A'];
    const right = k['ArrowRight'] || k['d'] || k['D'];

    if (up) player.vy -= ACCEL;
    if (down) player.vy += ACCEL;
    if (left) player.vx -= ACCEL;
    if (right) player.vx += ACCEL;

    const pSpeed = Math.sqrt(player.vx*player.vx + player.vy*player.vy);
    if (pSpeed > MAX_SPEED) { player.vx = (player.vx/pSpeed)*MAX_SPEED; player.vy = (player.vy/pSpeed)*MAX_SPEED; }

    if (mode === 'single') {
        let targetX = ball.x;
        let targetY = ball.y;
        
        const trait = teamB.aiTrait || 'balanced';
        
        if (trait === 'defensive') {
             if (ball.x < CANVAS_WIDTH / 2) {
                 targetX = CANVAS_WIDTH - 120;
                 if (ball.x > CANVAS_WIDTH - 250) targetX = ball.x;
             }
        } else if (trait === 'aggressive') {
            targetX = ball.x + ball.vx * 10;
            targetY = ball.y + ball.vy * 10;
        } else {
            if (ball.x < CANVAS_WIDTH / 2) {
               targetX = CANVAS_WIDTH - 150; 
               if (ball.x > CANVAS_WIDTH - 250) targetX = ball.x;
            }
        }
        
        const dx = targetX - opponent.x;
        const dy = targetY - opponent.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0) {
          opponent.vx += (dx / dist) * 0.45;
          opponent.vy += (dy / dist) * 0.45;
        }
        
        let aiMaxSpeed = AI_SPEED;
        if (trait === 'aggressive') aiMaxSpeed *= 1.1;
        
        const currentAiSpeed = Math.sqrt(opponent.vx*opponent.vx + opponent.vy*opponent.vy);
        if (currentAiSpeed > aiMaxSpeed) {
            opponent.vx = (opponent.vx / currentAiSpeed) * aiMaxSpeed;
            opponent.vy = (opponent.vy / currentAiSpeed) * aiMaxSpeed;
        }
    }

    const goalResult = runPhysics();
    if (goalResult) handleGoal(goalResult === 'GOAL_A' ? 'A' : 'B');

  }, [mode, runPhysics, handleGoal, AI_SPEED, isPaused, isPenaltyMode, penaltyPhase, teamB.aiTrait]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#15803d'; ctx.fillRect(PITCH_MARGIN, PITCH_MARGIN, CANVAS_WIDTH - PITCH_MARGIN * 2, CANVAS_HEIGHT - PITCH_MARGIN * 2);
    ctx.save(); ctx.beginPath(); ctx.rect(PITCH_MARGIN, PITCH_MARGIN, CANVAS_WIDTH - PITCH_MARGIN*2, CANVAS_HEIGHT - PITCH_MARGIN*2); ctx.clip();
    for (let i = PITCH_MARGIN; i < CANVAS_WIDTH - PITCH_MARGIN; i += 100) { ctx.fillStyle = '#16a34a'; ctx.fillRect(i, PITCH_MARGIN, 50, CANVAS_HEIGHT - PITCH_MARGIN * 2); }
    ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = '#f8fafc';
    ctx.strokeRect(PITCH_MARGIN, PITCH_MARGIN, CANVAS_WIDTH - PITCH_MARGIN*2, CANVAS_HEIGHT - PITCH_MARGIN*2);
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH/2, PITCH_MARGIN); ctx.lineTo(CANVAS_WIDTH/2, CANVAS_HEIGHT - PITCH_MARGIN); ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(5, (CANVAS_HEIGHT - GOAL_HEIGHT)/2, PITCH_MARGIN - 5, GOAL_HEIGHT);
    ctx.fillRect(CANVAS_WIDTH - PITCH_MARGIN, (CANVAS_HEIGHT - GOAL_HEIGHT)/2, PITCH_MARGIN - 5, GOAL_HEIGHT);

    [playerRef.current, opponentRef.current, ballRef.current].forEach(c => {
      ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = c.color; ctx.fill();
      
      if (c.pattern && c.secondaryColor && c !== ballRef.current) {
          ctx.save();
          ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); ctx.clip();
          ctx.fillStyle = c.secondaryColor;
          if (c.pattern === 'stripes') { for(let i=-c.radius; i<c.radius; i+=8) ctx.fillRect(c.x+i, c.y-c.radius, 4, c.radius*2); } 
          else if (c.pattern === 'half') { ctx.fillRect(c.x, c.y-c.radius, c.radius, c.radius*2); } 
          else if (c.pattern === 'sash') { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(-Math.PI / 4); ctx.fillRect(-c.radius * 2, -4, c.radius * 4, 8); ctx.restore(); }
          ctx.restore();
      }
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      
      if (c !== ballRef.current) {
         ctx.fillStyle = '#fff'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
         ctx.fillText(c === playerRef.current ? "P1" : "CPU", c.x, c.y + 4);
      }
    });

    if (isPenaltyMode && penaltyPhase === 'aiming' && penaltyTurn === 'player') {
         ctx.save();
         ctx.translate(playerRef.current.x, playerRef.current.y);
         ctx.rotate(penaltyAimAngle.current);
         ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
         ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(60, -10); ctx.lineTo(60, 10); ctx.fill();
         ctx.restore();
    }
  }, []);

  const gameLoop = useCallback(() => {
    if (isEndingRef.current) return;
    update();
    const canvas = canvasRef.current;
    if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) draw(ctx); }
    if (!isEndingRef.current) requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
        if (e.key) initAudio();
        if (e.key.toLowerCase() === 'p' || e.key === 'Escape') setIsPaused(prev => !prev);
        keysRef.current[e.key] = true;
    };
    const handleUp = (e: KeyboardEvent) => keysRef.current[e.key] = false;
    window.addEventListener('keydown', handleDown); window.addEventListener('keyup', handleUp);
    if (containerRef.current) containerRef.current.focus();
    return () => { window.removeEventListener('keydown', handleDown); window.removeEventListener('keyup', handleUp); };
  }, []);

  useEffect(() => {
    if (isPaused || isGoldenGoal || isPenaltyMode) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
           // TIME IS UP
           // Check AGGREGATE scores (Current Score + Leg 1 Score)
           const currentAggA = scoreA + leg1ScoreA;
           const currentAggB = scoreB + leg1ScoreB;
           
           if (!allowDraw && currentAggA === currentAggB) {
                // TIE and NO DRAW ALLOWED -> GOLDEN GOAL
                setIsGoldenGoal(true);
                return 0;
           } else {
                // Game Over (Either draw allowed, or result is decisive)
                isEndingRef.current = true;
                onGameOver(scoreA, scoreB);
                return 0;
           }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scoreA, scoreB, allowDraw, isPaused, isGoldenGoal, isPenaltyMode, leg1ScoreA, leg1ScoreB]);

  useEffect(() => { requestRef.current = requestAnimationFrame(gameLoop); return () => cancelAnimationFrame(requestRef.current); }, [gameLoop]);

  return (
    <div ref={containerRef} tabIndex={0} className="relative flex flex-col items-center justify-center bg-slate-900/80 p-4 rounded-xl backdrop-blur-sm border border-slate-700 shadow-2xl outline-none">
      <div className="flex justify-between w-full max-w-[800px] mb-4 text-white font-bold text-xl px-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border border-white" style={{ background: teamA.color }}></div>
          {teamA.name} <span className="text-3xl ml-2 font-mono">{scoreA}</span>
        </div>
        <div className={`px-4 py-1 rounded-full border font-mono ${isPenaltyMode ? 'bg-orange-500 text-white animate-pulse' : isGoldenGoal ? 'bg-yellow-500 text-black animate-pulse' : 'bg-slate-800'}`}>
          {isPenaltyMode ? `PENALES R${penaltyRound}` : isGoldenGoal ? 'GOL DE ORO' : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl mr-2 font-mono">{scoreB}</span> {teamB.name}
          <div className="w-4 h-4 rounded-full border border-white" style={{ background: teamB.color }}></div>
        </div>
      </div>
      
      <div className="relative">
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-lg border-4 border-slate-500 shadow-2xl bg-[#0f172a] cursor-none" />
          {isPaused && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                  <h2 className="text-2xl font-black text-white mb-4">PAUSA</h2>
                  <button onClick={() => setIsPaused(false)} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg mb-2">Reanudar</button>
                  {onExit && <button onClick={onExit} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg">Salir</button>}
              </div>
          )}
          {isPenaltyMode && penaltyPhase === 'aiming' && penaltyTurn === 'player' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded text-yellow-400 font-bold animate-pulse">
                  ESPACIO para Chutar
              </div>
          )}
          {isGoldenGoal && (
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 px-6 py-2 rounded-full text-black font-black text-xl animate-pulse shadow-lg shadow-yellow-500/50">
                   ¡GOL DE ORO!
               </div>
          )}
      </div>
      
      <div className="mt-4 text-slate-400 text-sm flex gap-6">
        <span>WASD: Mover</span> <span>Espacio: Chutar</span> <span>P: Pausa</span>
      </div>
    </div>
  );
};

export default GameCanvas;
