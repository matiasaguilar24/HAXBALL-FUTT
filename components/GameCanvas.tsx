
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsCircle, Team, GameStatePayload, InputPayload, Difficulty, Pattern, Language, Stadium } from '../types';
import { translations } from '../services/translations';
import { getStadiumById } from '../services/stadiums';
import { Pause, Play, LogOut, Volume2, VolumeX, Target } from 'lucide-react';

interface GameCanvasProps {
  teamA: Team;
  teamB: Team;
  onGameOver: (scoreA: number, scoreB: number, teamA?: Team, teamB?: Team) => void;
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
  language?: Language;
  mobileControls?: boolean;
  stadiumId?: string; // NEW PROP
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const PITCH_MARGIN = 40;
const GOAL_HEIGHT = 140;
const PLAYER_RADIUS = 16;
const BALL_RADIUS = 9;
const MAX_SPEED = 4.5;
const MAX_BALL_SPEED = 8.5; 
const KICK_STRENGTH = 4.0;
const PHYSICS_STEPS = 5;

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  teamA, teamB, onGameOver, onExit, mode = 'single', networkSend, networkDataRef, 
  allowDraw = false, matchDuration = 120, aiDifficulty = 'normal', allowRestart = false,
  leg1ScoreA = 0, leg1ScoreB = 0, language = 'es', mobileControls = false, stadiumId = 'classic'
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
  const t = translations[language];
  
  // Stadium Data
  const stadium = getStadiumById(stadiumId);

  // PENALTY STATE
  const [isPenaltyMode, setIsPenaltyMode] = useState(false);
  const [penaltyPhase, setPenaltyPhase] = useState<'aiming' | 'kicking' | 'result'>('aiming');
  const [penaltyRound, setPenaltyRound] = useState(0);
  const [penaltyTurn, setPenaltyTurn] = useState<'player' | 'cpu'>('player');
  const penaltyAimAngle = useRef(0);
  const penaltyAimDirection = useRef(1);

  // TOUCH CONTROLS REFS
  const joyStartRef = useRef<{x:number, y:number} | null>(null);
  const joyMoveRef = useRef<{x:number, y:number} | null>(null);
  const joyTouchIdRef = useRef<number | null>(null); // Track specific finger ID
  const isKickingRef = useRef(false);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const isEndingRef = useRef(false);
  
  // Game Objects
  // PlayerRef = Left Team (P1 / Host)
  const playerRef = useRef<PhysicsCircle>({ 
      x: 150, y: CANVAS_HEIGHT / 2, radius: PLAYER_RADIUS, vx: 0, vy: 0, mass: 10, damping: stadium.playerDamping, 
      color: teamA.color, secondaryColor: teamA.secondaryColor, pattern: teamA.pattern 
  });
  // OpponentRef = Right Team (CPU / Client / P2)
  const opponentRef = useRef<PhysicsCircle>({ 
      x: CANVAS_WIDTH - 150, y: CANVAS_HEIGHT / 2, radius: PLAYER_RADIUS, vx: 0, vy: 0, mass: 10, damping: stadium.playerDamping, 
      color: teamB.color, secondaryColor: teamB.secondaryColor, pattern: teamB.pattern
  });
  const ballRef = useRef<PhysicsCircle>({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, radius: BALL_RADIUS, vx: 0, vy: 0, mass: 1, damping: stadium.ballDamping, color: '#ffffff' });
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const remoteKeysRef = useRef<{ [key: string]: boolean }>({});

  const getAISpeed = (diff: Difficulty) => {
      switch(diff) {
          case 'easy': return 2.2;
          case 'normal': return 3.0;
          case 'hard': return 4.5;
          case 'legend': return 5.8;
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

          if ((keysRef.current[' '] || isKickingRef.current) && penaltyTurn === 'player') {
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
                   onGameOver(scoreA, scoreB, teamA, teamB);
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
      
      if (isGoldenGoal) {
          isEndingRef.current = true;
          setTimeout(() => onGameOver(scorer==='A'?scoreA+1:scoreA, scorer==='B'?scoreB+1:scoreB, teamA, teamB), 100);
      } else {
          resetPositions('kickoff');
      }
  }, [scoreA, scoreB, isGoldenGoal, onGameOver, resetPositions, playSound, isPenaltyMode, penaltyTurn, teamA, teamB]);

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

                if (c1 !== ball && c2 !== ball) {
                    let tx = c1.vx; let ty = c1.vy;
                    c1.vx = c2.vx * 0.8; c1.vy = c2.vy * 0.8;
                    c2.vx = tx * 0.8; c2.vy = ty * 0.8;
                } 
                else {
                    const ballEntity = c1 === ball ? c1 : c2;
                    const playerEntity = c1 === ball ? c2 : c1;
                    const playerVx = playerEntity.vx;
                    const playerVy = playerEntity.vy;
                    playerEntity.vx = playerVx * 0.95; 
                    playerEntity.vy = playerVy * 0.95;

                    // Remote kick handling
                    const isRemotePlayer = playerEntity === opponent;
                    const isLocalPlayer = playerEntity === player;
                    const isKicking = (isLocalPlayer && (keysRef.current[' '] || isKickingRef.current)) || (isRemotePlayer && remoteKeysRef.current[' ']);
                    
                    const kickBonus = isKicking ? KICK_STRENGTH : 1.2; 
                    ballEntity.vx = playerVx * kickBonus + ballEntity.vx * 0.5;
                    ballEntity.vy = playerVy * kickBonus + ballEntity.vy * 0.5;

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
    
    // Safety
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
    
    // --- MULTIPLAYER CLIENT LOGIC (No Physics, just Sync) ---
    if (mode === 'online_client') {
        // 1. Send Inputs
        if (networkSend) {
            networkSend({ keys: keysRef.current } as InputPayload);
        }
        // 2. Receive State & Update Positions
        if (networkDataRef && networkDataRef.current) {
            const data = networkDataRef.current as GameStatePayload;
            if (data && data.p1) {
                playerRef.current.x = data.p1.x; playerRef.current.y = data.p1.y;
                opponentRef.current.x = data.p2.x; opponentRef.current.y = data.p2.y;
                ballRef.current.x = data.ball.x; ballRef.current.y = data.ball.y;
                // Sync scores/time occasionally
                setScoreA(data.scoreA); 
                setScoreB(data.scoreB);
                setTimeLeft(data.timeLeft);
            }
        }
        return; // Skip physics engine
    }

    // --- HOST & SINGLE PLAYER LOGIC ---
    if (isPenaltyMode) {
        updatePenaltyLogic();
        const res = runPhysics();
        if (res) handleGoal(res === 'GOAL_A' ? 'A' : 'B');
        return;
    }

    // Apply Player Controls (Host/Local)
    const ACCEL = 0.5;
    const k = keysRef.current;
    const player = playerRef.current;
    
    // KEYBOARD INPUTS
    if (k['ArrowUp'] || k['w'] || k['W']) player.vy -= ACCEL;
    if (k['ArrowDown'] || k['s'] || k['S']) player.vy += ACCEL;
    if (k['ArrowLeft'] || k['a'] || k['A']) player.vx -= ACCEL;
    if (k['ArrowRight'] || k['d'] || k['D']) player.vx += ACCEL;

    // TOUCH JOYSTICK INPUTS
    if (joyMoveRef.current && joyStartRef.current) {
        const dx = joyMoveRef.current.x - joyStartRef.current.x;
        const dy = joyMoveRef.current.y - joyStartRef.current.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 40; // Joystick max reach
        
        // Normalize
        if (dist > 5) { // Deadzone
            const force = Math.min(dist, maxDist) / maxDist;
            const angle = Math.atan2(dy, dx);
            player.vx += Math.cos(angle) * ACCEL * force * 1.5; // Slightly more sensitive for touch
            player.vy += Math.sin(angle) * ACCEL * force * 1.5;
        }
    }

    const pSpeed = Math.sqrt(player.vx*player.vx + player.vy*player.vy);
    if (pSpeed > MAX_SPEED) { player.vx = (player.vx/pSpeed)*MAX_SPEED; player.vy = (player.vy/pSpeed)*MAX_SPEED; }

    const opponent = opponentRef.current;

    // Apply Opponent Controls
    if (mode === 'online_host') {
        // Read remote keys from client
        if (networkDataRef && networkDataRef.current) {
             remoteKeysRef.current = networkDataRef.current.keys || {};
        }
        const rk = remoteKeysRef.current;
        if (rk['ArrowUp'] || rk['w'] || rk['W']) opponent.vy -= ACCEL;
        if (rk['ArrowDown'] || rk['s'] || rk['S']) opponent.vy += ACCEL;
        if (rk['ArrowLeft'] || rk['a'] || rk['A']) opponent.vx -= ACCEL;
        if (rk['ArrowRight'] || rk['d'] || rk['D']) opponent.vx += ACCEL;
        
        const oSpeed = Math.sqrt(opponent.vx*opponent.vx + opponent.vy*opponent.vy);
        if (oSpeed > MAX_SPEED) { opponent.vx = (opponent.vx/oSpeed)*MAX_SPEED; opponent.vy = (opponent.vy/oSpeed)*MAX_SPEED; }
    } else {
        // AI Logic (Single Player)
        const ball = ballRef.current;
        let targetX = ball.x;
        let targetY = ball.y;
        const trait = teamB.aiTrait || 'balanced';
        
        if (aiDifficulty === 'legend') {
             // Legend AI: Predictive & Fast Recovery
             targetX = ball.x + ball.vx * 15;
             targetY = ball.y + ball.vy * 15;
             if (ball.x > opponent.x && ball.vx > 0.5) {
                 targetX = CANVAS_WIDTH - 20; 
                 targetY = ball.y;
                 if (targetY < (CANVAS_HEIGHT - GOAL_HEIGHT)/2) targetY = (CANVAS_HEIGHT - GOAL_HEIGHT)/2 + 20;
                 if (targetY > (CANVAS_HEIGHT + GOAL_HEIGHT)/2) targetY = (CANVAS_HEIGHT + GOAL_HEIGHT)/2 - 20;
             }
        } else if (aiDifficulty === 'hard') {
             // Hard AI: Smart Positioning, slightly less predictive than Legend
             targetX = ball.x + ball.vx * 8; 
             targetY = ball.y + ball.vy * 8;
             
             // Defensive positioning if ball is far on player side
             if (ball.x < CANVAS_WIDTH / 2 && opponent.x > CANVAS_WIDTH - 100) {
                 targetX = CANVAS_WIDTH - 200; // Move forward to engage
             }
             // If ball gets behind, try to intercept line to goal
             if (ball.x > opponent.x) {
                 targetX = ball.x + 100; // Chase
             }
        } else if (trait === 'defensive') {
             if (ball.x < CANVAS_WIDTH / 2) {
                 targetX = CANVAS_WIDTH - 120;
                 if (ball.x > CANVAS_WIDTH - 250) targetX = ball.x;
             }
        } else if (trait === 'aggressive') {
            targetX = ball.x + ball.vx * 10;
            targetY = ball.y + ball.vy * 10;
        } else {
            // Normal / Easy
            if (ball.x < CANVAS_WIDTH / 2) {
               targetX = CANVAS_WIDTH - 150; 
               if (ball.x > CANVAS_WIDTH - 250) targetX = ball.x;
            }
        }
        
        const dx = targetX - opponent.x;
        const dy = targetY - opponent.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Acceleration boost for Difficulty
        let aiAccel = 0.45;
        if (aiDifficulty === 'legend') aiAccel = 0.95;
        else if (aiDifficulty === 'hard') aiAccel = 0.65;

        if (dist > 0) {
          opponent.vx += (dx / dist) * aiAccel;
          opponent.vy += (dy / dist) * aiAccel;
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

    // Send State if Host
    if (mode === 'online_host' && networkSend) {
        const payload: GameStatePayload = {
            p1: { x: playerRef.current.x, y: playerRef.current.y, vx: playerRef.current.vx, vy: playerRef.current.vy },
            p2: { x: opponentRef.current.x, y: opponentRef.current.y, vx: opponentRef.current.vx, vy: opponentRef.current.vy },
            ball: { x: ballRef.current.x, y: ballRef.current.y, vx: ballRef.current.vx, vy: ballRef.current.vy },
            scoreA, scoreB, timeLeft
        };
        networkSend(payload);
    }

  }, [mode, runPhysics, handleGoal, AI_SPEED, isPaused, isPenaltyMode, penaltyPhase, teamB.aiTrait, scoreA, scoreB, timeLeft, aiDifficulty]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // 1. Background (Stadium specific)
    ctx.fillStyle = stadium.backgroundColor; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 2. Pitch (Stadium specific)
    ctx.fillStyle = stadium.grassColor; ctx.fillRect(PITCH_MARGIN, PITCH_MARGIN, CANVAS_WIDTH - PITCH_MARGIN * 2, CANVAS_HEIGHT - PITCH_MARGIN * 2);
    
    // 3. Stripes (Stadium specific)
    ctx.save(); ctx.beginPath(); ctx.rect(PITCH_MARGIN, PITCH_MARGIN, CANVAS_WIDTH - PITCH_MARGIN*2, CANVAS_HEIGHT - PITCH_MARGIN*2); ctx.clip();
    for (let i = PITCH_MARGIN; i < CANVAS_WIDTH - PITCH_MARGIN; i += 100) { ctx.fillStyle = stadium.grassStripesColor; ctx.fillRect(i, PITCH_MARGIN, 50, CANVAS_HEIGHT - PITCH_MARGIN * 2); }
    ctx.restore();
    
    // 4. Lines (Stadium specific)
    ctx.lineWidth = 4; ctx.strokeStyle = stadium.linesColor;
    ctx.strokeRect(PITCH_MARGIN, PITCH_MARGIN, CANVAS_WIDTH - PITCH_MARGIN*2, CANVAS_HEIGHT - PITCH_MARGIN*2);
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH/2, PITCH_MARGIN); ctx.lineTo(CANVAS_WIDTH/2, CANVAS_HEIGHT - PITCH_MARGIN); ctx.stroke();
    
    // 5. Goals (Stadium specific)
    ctx.fillStyle = stadium.goalColor;
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
         const label = c === playerRef.current ? "P1" : "P2/CPU";
         ctx.fillText(label, c.x, c.y + 4);
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
  }, [stadium]);

  const gameLoop = useCallback(() => {
    if (isEndingRef.current) return;
    update();
    const canvas = canvasRef.current;
    if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) draw(ctx); }

    // Visual Update for Joystick
    if (mobileControls && joystickKnobRef.current) {
         if (joyStartRef.current && joyMoveRef.current) {
             const dx = joyMoveRef.current.x - joyStartRef.current.x;
             const dy = joyMoveRef.current.y - joyStartRef.current.y;
             const x = Math.max(-40, Math.min(40, dx));
             const y = Math.max(-40, Math.min(40, dy));
             joystickKnobRef.current.style.transform = `translate(${x}px, ${y}px)`;
         } else {
             joystickKnobRef.current.style.transform = `translate(0px, 0px)`;
         }
    }

    if (!isEndingRef.current) requestRef.current = requestAnimationFrame(gameLoop);
  }, [update, draw, mobileControls]);

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

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      Array.from(e.changedTouches).forEach((touch: React.Touch) => {
          // Left side: Joystick (only if not already active)
          if (joyTouchIdRef.current === null && touch.clientX < window.innerWidth / 2) {
              joyTouchIdRef.current = touch.identifier;
              joyStartRef.current = { x: touch.clientX, y: touch.clientY };
              joyMoveRef.current = { x: touch.clientX, y: touch.clientY };
          }
          // Right side: Kick (any touch)
          else if (touch.clientX >= window.innerWidth / 2) {
              isKickingRef.current = true;
          }
      });
      initAudio();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      Array.from(e.changedTouches).forEach((touch: React.Touch) => {
          // Update only the joystick finger
          if (touch.identifier === joyTouchIdRef.current) {
               joyMoveRef.current = { x: touch.clientX, y: touch.clientY };
          }
      });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      Array.from(e.changedTouches).forEach((touch: React.Touch) => {
          // Reset joystick if identifier matches
          if (touch.identifier === joyTouchIdRef.current) {
              joyTouchIdRef.current = null;
              joyStartRef.current = null;
              joyMoveRef.current = null;
          } 
          // Reset kick if touch was on right side
          else if (touch.clientX >= window.innerWidth / 2) {
              isKickingRef.current = false;
          }
      });
  };

  useEffect(() => {
    if (isPaused || isGoldenGoal || isPenaltyMode || mode === 'online_client') return; // Client takes time from Host
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
           const currentAggA = scoreA + leg1ScoreA;
           const currentAggB = scoreB + leg1ScoreB;
           if (!allowDraw && currentAggA === currentAggB) {
                setIsGoldenGoal(true);
                return 0;
           } else {
                isEndingRef.current = true;
                onGameOver(scoreA, scoreB, teamA, teamB);
                return 0;
           }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scoreA, scoreB, allowDraw, isPaused, isGoldenGoal, isPenaltyMode, leg1ScoreA, leg1ScoreB, mode, onGameOver, teamA, teamB]);

  useEffect(() => { requestRef.current = requestAnimationFrame(gameLoop); return () => cancelAnimationFrame(requestRef.current); }, [gameLoop]);

  return (
    <div 
        ref={containerRef} 
        tabIndex={0} 
        className="relative flex flex-col items-center justify-center bg-slate-900/80 p-4 rounded-xl backdrop-blur-sm border border-slate-700 shadow-2xl outline-none"
    >
      <div className="flex justify-between w-full max-w-[800px] mb-4 text-white font-bold text-xl px-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border border-white" style={{ background: teamA.color }}></div>
          {teamA.name} <span className="text-3xl ml-2 font-mono">{scoreA}</span>
        </div>
        <div className={`px-4 py-1 rounded-full border font-mono ${isPenaltyMode ? 'bg-orange-500 text-white animate-pulse' : isGoldenGoal ? 'bg-yellow-500 text-black animate-pulse' : 'bg-slate-800'}`}>
          {isPenaltyMode ? `${t.penalties} R${penaltyRound}` : isGoldenGoal ? t.goldenGoal : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl mr-2 font-mono">{scoreB}</span> {teamB.name}
          <div className="w-4 h-4 rounded-full border border-white" style={{ background: teamB.color }}></div>
        </div>
      </div>
      
      <div className="relative">
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="rounded-lg border-4 border-slate-500 shadow-2xl bg-[#0f172a] cursor-none" />
          
          {/* TOUCH CONTROLS OVERLAY */}
          {mobileControls && !isPaused && (
             <>
                <div 
                    className="absolute inset-0 z-20 touch-none select-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Visual Indicators */}
                    <div className="absolute bottom-8 left-8 w-32 h-32 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center pointer-events-none">
                        <div 
                            ref={joystickKnobRef}
                            className="w-12 h-12 rounded-full bg-white/30"
                            style={{ transition: 'none' }} 
                        ></div>
                    </div>
                    <div className="absolute bottom-8 right-8 w-24 h-24 rounded-full border-4 border-red-500/50 bg-red-500/20 flex items-center justify-center active:bg-red-500/40 pointer-events-none">
                        <span className="font-bold text-white/50">KICK</span>
                    </div>
                </div>

                {/* PAUSE BUTTON (Touch Mode) */}
                <button
                   className="absolute top-4 right-4 z-40 p-3 bg-slate-800/60 backdrop-blur rounded-full text-white border border-white/20 active:bg-slate-700 shadow-lg"
                   onClick={(e) => {
                       e.stopPropagation();
                       setIsPaused(true);
                   }}
                   onTouchStart={(e) => e.stopPropagation()}
                >
                    <Pause size={20} fill="currentColor" />
                </button>
             </>
          )}

          {isPaused && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 pointer-events-auto">
                  <h2 className="text-2xl font-black text-white mb-4">{t.paused}</h2>
                  <button onClick={() => setIsPaused(false)} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg mb-2">{t.resume}</button>
                  {onExit && <button onClick={onExit} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg">{t.exit}</button>}
              </div>
          )}
          {isGoldenGoal && (
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 px-6 py-2 rounded-full text-black font-black text-xl animate-pulse shadow-lg shadow-yellow-500/50">
                   {t.goldenGoal}!
               </div>
          )}
      </div>
    </div>
  );
};

export default GameCanvas;
