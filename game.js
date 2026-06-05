// Whisper Hollow - 2 Player Co-op Horror Extraction Game
// Playable offline on YouTube Playables
// Full audio integration - no external files

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ========== AUDIO SYSTEM (Procedural Sound Effects) ==========
// No external files — all sounds generated via Web Audio API

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

// Initialize audio on first user interaction (required by browsers)
function initAudio() {
    if (audioCtx) return;
    audioCtx = new AudioContext();
    
    // Resume if suspended (browsers auto-suspend until user interaction)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Generate a "footstep" sound
function playFootstep() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = 120;
        gain.gain.value = 0.08;
        
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.1);
        osc.stop(now + 0.1);
    } catch(e) { console.log('Audio error:', e); }
}

// Generate "relic collected" chime
function playRelicSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        
        // First note (higher)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.value = 880;
        gain1.gain.value = 0.15;
        osc1.start();
        gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
        osc1.stop(now + 0.3);
        
        // Second note (lower, slight delay)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.value = 660;
        gain2.gain.value = 0.12;
        osc2.start(now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.38);
        osc2.stop(now + 0.38);
    } catch(e) {}
}

// Generate "spirit growl" (low, distorted rumble)
function playSpiritSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.value = 80;
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        gain.gain.value = 0.2;
        
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.6);
        osc.stop(now + 0.6);
    } catch(e) {}
}

// Generate "death" sound (falling tone)
function playDeathSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.value = 440;
        gain.gain.value = 0.2;
        
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.5);
        osc.stop(now + 0.5);
    } catch(e) {}
}

// Generate "victory" fanfare
function playVictorySound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.12;
            const startTime = now + (i * 0.12);
            osc.start(startTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.3);
            osc.stop(startTime + 0.3);
        });
    } catch(e) {}
}

// Generate "ambient drone" (looping background)
let ambientSource = null;
let ambientGain = null;

function startAmbientDrone() {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (ambientSource) return;
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        ambientGain = audioCtx.createGain();
        
        osc.connect(ambientGain);
        ambientGain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = 55;
        ambientGain.gain.value = 0.03;
        
        osc.start();
        ambientSource = osc;
    } catch(e) {}
}

function stopAmbientDrone() {
    if (!ambientSource) return;
    try {
        if (ambientGain) {
            ambientGain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
        }
        ambientSource.stop(audioCtx.currentTime + 1);
        ambientSource = null;
    } catch(e) {}
}

// Toggle sound on/off
function toggleSound() {
    soundEnabled = !soundEnabled;
    if (!soundEnabled && ambientSource) {
        stopAmbientDrone();
    } else if (soundEnabled && !ambientSource && gameRunning) {
        startAmbientDrone();
    }
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
        soundBtn.style.opacity = soundEnabled ? '1' : '0.5';
    }
    return soundEnabled;
}

// ========== GAME CONFIGURATION ==========
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 24;
const SPIRIT_SIZE = 32;
const RELIC_SIZE = 20;
const EXIT_SIZE = 40;

// ========== GAME STATE ==========
let gameRunning = true;
let winCondition = false;
let footstepCounter = 0;

// Players
const players = {
    p1: { x: 150, y: 300, size: PLAYER_SIZE, color: '#ff4d4d', colorLight: '#ff6b6b', alive: true, lastX: 150, lastY: 300, keys: { w: false, s: false, a: false, d: false } },
    p2: { x: 850, y: 300, size: PLAYER_SIZE, color: '#4d8aff', colorLight: '#6ba0ff', alive: true, lastX: 850, lastY: 300, keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false } }
};

// Relics
let relics = [];
let collectedRelics = 0;
const TOTAL_RELICS = 3;

// Spirit
let spirit = { x: 500, y: 300, size: SPIRIT_SIZE, active: false, anger: 0, targetPlayer: null };

// Exit
let exitGate = { x: 950, y: 50, size: EXIT_SIZE, active: false };

// Effects
let particles = [];

// ========== INITIALIZATION ==========
function initGame() {
    gameRunning = true;
    winCondition = false;
    collectedRelics = 0;
    updateRelicDisplay();
    
    // Reset players
    players.p1 = { ...players.p1, x: 150, y: 300, alive: true, lastX: 150, lastY: 300 };
    players.p2 = { ...players.p2, x: 850, y: 300, alive: true, lastX: 850, lastY: 300 };
    
    // Reset spirit
    spirit = { x: 500, y: 300, size: SPIRIT_SIZE, active: false, anger: 0, targetPlayer: null };
    
    // Generate relics at random positions
    relics = [];
    const relicPositions = [
        { x: 200, y: 200 }, { x: 500, y: 450 }, { x: 800, y: 150 },
        { x: 300, y: 500 }, { x: 700, y: 400 }, { x: 100, y: 100 }
    ];
    for (let i = 0; i < TOTAL_RELICS; i++) {
        relics.push({ ...relicPositions[i], size: RELIC_SIZE, collected: false });
    }
    
    // Reset exit gate
    exitGate.active = false;
    
    // Hide messages
    document.getElementById('winOverlay').classList.add('hidden');
    document.getElementById('loseOverlay').classList.add('hidden');
    
    updateStatusDisplay();
    
    // Start ambient drone
    startAmbientDrone();
}

// ========== INPUT HANDLING ==========
document.addEventListener('keydown', (e) => {
    const key = e.key;
    
    // Player 1 (WASD)
    if (key === 'w') players.p1.keys.w = true;
    if (key === 's') players.p1.keys.s = true;
    if (key === 'a') players.p1.keys.a = true;
    if (key === 'd') players.p1.keys.d = true;
    
    // Player 2 (Arrow keys)
    if (key === 'ArrowUp') players.p2.keys.ArrowUp = true;
    if (key === 'ArrowDown') players.p2.keys.ArrowDown = true;
    if (key === 'ArrowLeft') players.p2.keys.ArrowLeft = true;
    if (key === 'ArrowRight') players.p2.keys.ArrowRight = true;
    
    // Prevent scrolling
    if (['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key;
    if (key === 'w') players.p1.keys.w = false;
    if (key === 's') players.p1.keys.s = false;
    if (key === 'a') players.p1.keys.a = false;
    if (key === 'd') players.p1.keys.d = false;
    
    if (key === 'ArrowUp') players.p2.keys.ArrowUp = false;
    if (key === 'ArrowDown') players.p2.keys.ArrowDown = false;
    if (key === 'ArrowLeft') players.p2.keys.ArrowLeft = false;
    if (key === 'ArrowRight') players.p2.keys.ArrowRight = false;
});

// Reset button
document.getElementById('resetBtn').addEventListener('click', () => resetGame());

function resetGame() {
    stopAmbientDrone();
    initGame();
}

window.resetGame = resetGame;

// ========== PLAYER MOVEMENT ==========
const SPEED = 3.5;

function movePlayer(player, keys, up, down, left, right) {
    if (!player.alive) return;
    
    player.lastX = player.x;
    player.lastY = player.y;
    
    let newX = player.x;
    let newY = player.y;
    
    if (keys[up]) newY -= SPEED;
    if (keys[down]) newY += SPEED;
    if (keys[left]) newX -= SPEED;
    if (keys[right]) newX += SPEED;
    
    // Boundaries
    newX = Math.max(PLAYER_SIZE/2, Math.min(MAP_WIDTH - PLAYER_SIZE/2, newX));
    newY = Math.max(PLAYER_SIZE/2, Math.min(MAP_HEIGHT - PLAYER_SIZE/2, newY));
    
    player.x = newX;
    player.y = newY;
}

function updateMovement() {
    movePlayer(players.p1, players.p1.keys, 'w', 's', 'a', 'd');
    movePlayer(players.p2, players.p2.keys, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    
    // Footstep sounds (throttled to avoid spam)
    footstepCounter++;
    if (footstepCounter > 8) {
        footstepCounter = 0;
        if ((players.p1.x !== players.p1.lastX || players.p1.y !== players.p1.lastY) && players.p1.alive && gameRunning) {
            playFootstep();
        }
        if ((players.p2.x !== players.p2.lastX || players.p2.y !== players.p2.lastY) && players.p2.alive && gameRunning) {
            playFootstep();
        }
    }
}

// ========== COLLISION & GAME LOGIC ==========
function checkRelicCollection() {
    for (let relic of relics) {
        if (!relic.collected && players.p1.alive && players.p2.alive) {
            // Check both players near relic (co-op collection)
            const dist1 = Math.hypot(players.p1.x - relic.x, players.p1.y - relic.y);
            const dist2 = Math.hypot(players.p2.x - relic.x, players.p2.y - relic.y);
            
            if (dist1 < 25 && dist2 < 25) {
                relic.collected = true;
                collectedRelics++;
                updateRelicDisplay();
                playRelicSound();
                
                // Add particle effect
                for (let i = 0; i < 15; i++) {
                    particles.push({
                        x: relic.x, y: relic.y, 
                        vx: (Math.random() - 0.5) * 4, 
                        vy: (Math.random() - 0.5) * 4 - 2,
                        life: 1, color: '#fbbf24'
                    });
                }
                
                // Increase spirit anger
                spirit.anger = Math.min(100, spirit.anger + 33);
                
                // Play spirit growl when anger increases
                if (spirit.anger >= 33) {
                    playSpiritSound();
                }
                
                // Activate exit when all relics collected
                if (collectedRelics >= TOTAL_RELICS) {
                    exitGate.active = true;
                    spirit.active = true;
                    playSpiritSound();
                }
            }
        }
    }
}

function checkExit() {
    if (!exitGate.active) return;
    
    const bothAtExit = (players.p1.alive && players.p2.alive &&
        Math.hypot(players.p1.x - exitGate.x, players.p1.y - exitGate.y) < 35 &&
        Math.hypot(players.p2.x - exitGate.x, players.p2.y - exitGate.y) < 35);
    
    if (bothAtExit && !winCondition) {
        winCondition = true;
        gameRunning = false;
        playVictorySound();
        stopAmbientDrone();
        document.getElementById('winOverlay').classList.remove('hidden');
    }
}

function updateSpirit() {
    if (!spirit.active) {
        // Spirit wanders slowly
        spirit.x += (Math.random() - 0.5) * 1.2;
        spirit.y += (Math.random() - 0.5) * 1.2;
        spirit.x = Math.max(20, Math.min(MAP_WIDTH - 20, spirit.x));
        spirit.y = Math.max(20, Math.min(MAP_HEIGHT - 20, spirit.y));
        return;
    }
    
    // Choose target (closest living player)
    const alivePlayers = [];
    if (players.p1.alive) alivePlayers.push(players.p1);
    if (players.p2.alive) alivePlayers.push(players.p2);
    
    if (alivePlayers.length === 0) return;
    
    let closest = alivePlayers[0];
    let closestDist = Math.hypot(spirit.x - closest.x, spirit.y - closest.y);
    for (let p of alivePlayers) {
        const dist = Math.hypot(spirit.x - p.x, spirit.y - p.y);
        if (dist < closestDist) {
            closest = p;
            closestDist = dist;
        }
    }
    
    // Move toward target
    const angle = Math.atan2(closest.y - spirit.y, closest.x - spirit.x);
    const spiritSpeed = 2.2 + (spirit.anger / 50);
    spirit.x += Math.cos(angle) * spiritSpeed;
    spirit.y += Math.sin(angle) * spiritSpeed;
    
    // Check collision with players
    for (let [id, player] of Object.entries(players)) {
        if (player.alive && Math.hypot(spirit.x - player.x, spirit.y - player.y) < 30) {
            player.alive = false;
            playDeathSound();
            updateStatusDisplay();
            
            // Death particles
            for (let i = 0; i < 25; i++) {
                particles.push({
                    x: player.x, y: player.y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6 - 3,
                    life: 1, color: player.color
                });
            }
            
            if (!players.p1.alive || !players.p2.alive) {
                gameRunning = false;
                stopAmbientDrone();
                document.getElementById('loseOverlay').classList.remove('hidden');
            }
        }
    }
}

function updateParticles() {
    for (let i = particles.length-1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.02;
        if (p.life <= 0 || p.y > MAP_HEIGHT) {
            particles.splice(i,1);
        }
    }
}

// ========== UI UPDATES ==========
function updateRelicDisplay() {
    document.getElementById('relicCount').innerText = collectedRelics;
    document.getElementById('totalRelics').innerText = TOTAL_RELICS;
    const progressPercent = (collectedRelics / TOTAL_RELICS) * 100;
    const progressBar = document.getElementById('relicProgress');
    if (progressBar) {
        progressBar.style.width = progressPercent + '%';
    }
}

function updateStatusDisplay() {
    const p1Status = document.getElementById('p1Status');
    const p2Status = document.getElementById('p2Status');
    const p1Dot = p1Status?.querySelector('.status-dot');
    const p2Dot = p2Status?.querySelector('.status-dot');
    
    if (players.p1.alive) {
        if (p1Status) p1Status.innerHTML = '<span class="status-dot active"></span> ACTIVE';
        if (p1Dot) p1Dot.classList.remove('inactive');
    } else {
        if (p1Status) p1Status.innerHTML = '<span class="status-dot inactive"></span> CONSUMED';
        if (p1Dot) p1Dot.classList.add('inactive');
    }
    
    if (players.p2.alive) {
        if (p2Status) p2Status.innerHTML = '<span class="status-dot active"></span> ACTIVE';
        if (p2Dot) p2Dot.classList.remove('inactive');
    } else {
        if (p2Status) p2Status.innerHTML = '<span class="status-dot inactive"></span> CONSUMED';
        if (p2Dot) p2Dot.classList.add('inactive');
    }
}

// ========== RENDERING ==========
function drawBackground() {
    // Gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    grad.addColorStop(0, '#0a0c14');
    grad.addColorStop(1, '#12141c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Fog/mist effect
    ctx.fillStyle = 'rgba(80, 100, 130, 0.03)';
    for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.ellipse(
            Math.sin(Date.now() * 0.0008 + i) * 150 + i * 50,
            Math.cos(Date.now() * 0.0005 + i) * 100 + 300,
            120, 60, 0, 0, Math.PI * 2
        );
        ctx.fill();
    }
    
    // Grid pattern
    ctx.strokeStyle = 'rgba(100, 120, 150, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < MAP_WIDTH; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, MAP_HEIGHT);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(MAP_WIDTH, i);
        ctx.stroke();
    }
}

function drawExit() {
    if (!exitGate.active) return;
    
    // Animated portal
    const pulse = Math.sin(Date.now() * 0.008) * 0.1 + 0.2;
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#4ade80';
    ctx.fillStyle = `rgba(74, 222, 128, ${0.2 + pulse})`;
    ctx.beginPath();
    ctx.arc(exitGate.x, exitGate.y, EXIT_SIZE/2, 0, Math.PI*2);
    ctx.fill();
    
    // Outer ring
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(exitGate.x, exitGate.y, EXIT_SIZE/2 + 4, 0, Math.PI*2);
    ctx.stroke();
    
    // Portal symbol
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 28px "Inter", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◉', exitGate.x, exitGate.y);
    ctx.shadowBlur = 0;
}

function drawRelics() {
    for (let relic of relics) {
        if (!relic.collected) {
            const glow = Math.sin(Date.now() * 0.01) * 0.1 + 0.3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = `rgba(251, 191, 36, ${0.4 + glow})`;
            ctx.beginPath();
            ctx.arc(relic.x, relic.y, RELIC_SIZE/2 + 3, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(relic.x, relic.y, RELIC_SIZE/2 - 2, 0, Math.PI*2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px "Inter", monospace';
            ctx.fillText('✦', relic.x - 4, relic.y + 5);
            ctx.shadowBlur = 0;
        }
    }
}

function drawPlayers() {
    for (let [id, p] of Object.entries(players)) {
        if (!p.alive) continue;
        
        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        
        // Outer ring
        ctx.fillStyle = p.colorLight;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size/2 + 3, 0, Math.PI*2);
        ctx.fill();
        
        // Body
        ctx.fillStyle = p.color;
        
