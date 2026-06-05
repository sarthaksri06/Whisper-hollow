// Whisper Hollow - 2 Player Co-op Horror Extraction Game
// Full Game Logic + Procedural Audio

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ========== AUDIO SYSTEM ==========
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

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
        gain.gain.value = 0.07;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.1);
        osc.stop(now + 0.1);
    } catch(e) {}
}

function playRelicSound() {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.value = 880;
        gain1.gain.value = 0.14;
        osc1.start();
        gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
        osc1.stop(now + 0.3);
        
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.value = 660;
        gain2.gain.value = 0.11;
        osc2.start(now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.38);
        osc2.stop(now + 0.38);
    } catch(e) {}
}

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
        osc.frequency.value = 75;
        filter.type = 'lowpass';
        filter.frequency.value = 380;
        gain.gain.value = 0.18;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.7);
        osc.stop(now + 0.7);
    } catch(e) {}
}

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
        gain.gain.value = 0.18;
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.55);
        osc.stop(now + 0.55);
    } catch(e) {}
}

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
            gain.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.32);
            osc.stop(startTime + 0.32);
        });
    } catch(e) {}
}

let ambientSource = null;
let ambientGain = null;

function startAmbientDrone() {
    if (!soundEnabled) return;
    try {
        initAudio();
        if (ambientSource) return;
        const osc = audioCtx.createOscillator();
        ambientGain = audioCtx.createGain();
        osc.connect(ambientGain);
        ambientGain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = 55;
        ambientGain.gain.value = 0.025;
        osc.start();
        ambientSource = osc;
    } catch(e) {}
}

function stopAmbientDrone() {
    if (!ambientSource) return;
    try {
        if (ambientGain) ambientGain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
        ambientSource.stop(audioCtx.currentTime + 1);
        ambientSource = null;
    } catch(e) {}
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    if (!soundEnabled && ambientSource) stopAmbientDrone();
    else if (soundEnabled && !ambientSource && gameRunning) startAmbientDrone();
    const btn = document.getElementById('soundBtn');
    if (btn) btn.innerHTML = soundEnabled ? '🔊' : '🔇';
    return soundEnabled;
}

// ========== GAME CONFIG ==========
const MAP_W = 1000, MAP_H = 600;
const PLAYER_SIZE = 24, SPIRIT_SIZE = 32, RELIC_SIZE = 20, EXIT_SIZE = 40;
let gameRunning = true, winCondition = false;
let footstepCounter = 0;

const players = {
    p1: { x: 150, y: 300, size: PLAYER_SIZE, color: '#ff4d4d', colorLight: '#ff6b6b', alive: true, lastX: 150, lastY: 300, keys: { w: false, s: false, a: false, d: false } },
    p2: { x: 850, y: 300, size: PLAYER_SIZE, color: '#4d8aff', colorLight: '#6ba0ff', alive: true, lastX: 850, lastY: 300, keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false } }
};

let relics = [];
let collectedRelics = 0;
const TOTAL_RELICS = 3;

let spirit = { x: 500, y: 300, size: SPIRIT_SIZE, active: false, anger: 0 };
let exitGate = { x: 950, y: 50, size: EXIT_SIZE, active: false };
let particles = [];

// ========== INIT ==========
function initGame() {
    gameRunning = true;
    winCondition = false;
    collectedRelics = 0;
    updateRelicDisplay();
    
    players.p1 = { ...players.p1, x: 150, y: 300, alive: true, lastX: 150, lastY: 300 };
    players.p2 = { ...players.p2, x: 850, y: 300, alive: true, lastX: 850, lastY: 300 };
    spirit = { x: 500, y: 300, size: SPIRIT_SIZE, active: false, anger: 0 };
    
    const positions = [[200,200], [500,450], [800,150]];
    relics = positions.map(p => ({ x: p[0], y: p[1], size: RELIC_SIZE, collected: false }));
    
    exitGate.active = false;
    document.getElementById('winModal')?.classList.add('hidden');
    document.getElementById('loseModal')?.classList.add('hidden');
    updateStatusUI();
    startAmbientDrone();
}

function resetGame() {
    stopAmbientDrone();
    initGame();
}
window.resetGame = resetGame;

// ========== INPUT ==========
document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'w') players.p1.keys.w = true;
    if (key === 's') players.p1.keys.s = true;
    if (key === 'a') players.p1.keys.a = true;
    if (key === 'd') players.p1.keys.d = true;
    if (key === 'ArrowUp') players.p2.keys.ArrowUp = true;
    if (key === 'ArrowDown') players.p2.keys.ArrowDown = true;
    if (key === 'ArrowLeft') players.p2.keys.ArrowLeft = true;
    if (key === 'ArrowRight') players.p2.keys.ArrowRight = true;
    if (['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) e.preventDefault();
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

document.getElementById('resetBtn')?.addEventListener('click', () => resetGame());

// ========== MOVEMENT ==========
const SPEED = 3.5;
function movePlayer(p, keys, up, down, left, right) {
    if (!p.alive) return;
    p.lastX = p.x; p.lastY = p.y;
    let nx = p.x, ny = p.y;
    if (keys[up]) ny -= SPEED;
    if (keys[down]) ny += SPEED;
    if (keys[left]) nx -= SPEED;
    if (keys[right]) nx += SPEED;
    p.x = Math.max(PLAYER_SIZE/2, Math.min(MAP_W - PLAYER_SIZE/2, nx));
    p.y = Math.max(PLAYER_SIZE/2, Math.min(MAP_H - PLAYER_SIZE/2, ny));
}

function updateMovement() {
    movePlayer(players.p1, players.p1.keys, 'w', 's', 'a', 'd');
    movePlayer(players.p2, players.p2.keys, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    footstepCounter++;
    if (footstepCounter > 8) {
        footstepCounter = 0;
        if ((players.p1.x !== players.p1.lastX || players.p1.y !== players.p1.lastY) && players.p1.alive && gameRunning) playFootstep();
        if ((players.p2.x !== players.p2.lastX || players.p2.y !== players.p2.lastY) && players.p2.alive && gameRunning) playFootstep();
    }
}

// ========== GAME LOGIC ==========
function checkRelicCollection() {
    for (let r of relics) {
        if (!r.collected && players.p1.alive && players.p2.alive) {
            const d1 = Math.hypot(players.p1.x - r.x, players.p1.y - r.y);
            const d2 = Math.hypot(players.p2.x - r.x, players.p2.y - r.y);
            if (d1 < 25 && d2 < 25) {
                r.collected = true;
                collectedRelics++;
                updateRelicDisplay();
                playRelicSound();
                for (let i = 0; i < 12; i++) particles.push({ x: r.x, y: r.y, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4-2, life: 1, color: '#fbbf24' });
                spirit.anger = Math.min(100, spirit.anger + 33);
                if (spirit.anger >= 33) playSpiritSound();
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
    const bothAtExit = players.p1.alive && players.p2.alive &&
        Math.hypot(players.p1.x - exitGate.x, players.p1.y - exitGate.y) < 35 &&
        Math.hypot(players.p2.x - exitGate.x, players.p2.y - exitGate.y) < 35;
    if (bothAtExit && !winCondition) {
        winCondition = true;
        gameRunning = false;
        playVictorySound();
        stopAmbientDrone();
        document.getElementById('winModal')?.classList.remove('hidden');
    }
}

function updateSpirit() {
    if (!spirit.active) {
        spirit.x += (Math.random() - 0.5) * 1.2;
        spirit.y += (Math.random() - 0.5) * 1.2;
        spirit.x = Math.max(20, Math.min(MAP_W - 20, spirit.x));
        spirit.y = Math.max(20, Math.min(MAP_H - 20, spirit.y));
        return;
    }
    const alive = [];
    if (players.p1.alive) alive.push(players.p1);
    if (players.p2.alive) alive.push(players.p2);
    if (!alive.length) return;
    let target = alive[0];
    let bestDist = Math.hypot(spirit.x - target.x, spirit.y - target.y);
    for (let p of alive) {
        const d = Math.hypot(spirit.x - p.x, spirit.y - p.y);
        if (d < bestDist) { target = p; bestDist = d; }
    }
    const angle = Math.atan2(target.y - spirit.y, target.x - spirit.x);
    const spd = 2.2 + (spirit.anger / 50);
    spirit.x += Math.cos(angle) * spd;
    spirit.y += Math.sin(angle) * spd;
    
    for (let [id, p] of Object.entries(players)) {
        if (p.alive && Math.hypot(spirit.x - p.x, spirit.y - p.y) < 30) {
            p.alive = false;
            playDeathSound();
            updateStatusUI();
            for (let i = 0; i < 20; i++) particles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6-3, life: 1, color: p.color });
            if (!players.p1.alive || !players.p2.alive) {
                gameRunning = false;
                stopAmbientDrone();
                document.getElementById('loseModal')?.classList.remove('hidden');
            }
        }
    }
}

function updateParticles() {
    for (let i = particles.length-1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.02;
        if (p.life <= 0 || p.y > MAP_H) particles.splice(i,1);
    }
}

// ========== UI ==========
function updateRelicDisplay() {
    document.getElementById('relicCount').innerText = collectedRelics;
    document.getElementById('totalRelics').innerText = TOTAL_RELICS;
}

function updateStatusUI() {
    const p1el = document.getElementById('p1Status');
    const p2el = document.getElementById('p2Status');
    if (p1el) {
        p1el.innerText = players.p1.alive ? 'ACTIVE' : 'CONSUMED';
        p1el.className = players.p1.alive ? 'status-badge' : 'status-badge dead';
    }
    if (p2el) {
        p2el.innerText = players.p2.alive ? 'ACTIVE' : 'CONSUMED';
        p2el.className = players.p2.alive ? 'status-badge' : 'status-badge dead';
    }
}

// ========== RENDERING ==========
function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, MAP_H);
    grad.addColorStop(0, '#0a0c14');
    grad.addColorStop(1, '#10121c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    ctx.fillStyle = 'rgba(80,100,140,0.03)';
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.sin(Date.now()*0.0008 + i)*140 + i*45, Math.cos(Date.now()*0.0005 + i)*90 + 300, 100, 50, 0, 0, Math.PI*2);
        ctx.fill();
    }
}

function drawExit() {
    if (!exitGate.active) return;
    const pulse = Math.sin(Date.now() * 0.008) * 0.1 + 0.2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#4ade80';
    ctx.fillStyle = `rgba(74, 222, 128, ${0.2 + pulse})`;
    ctx.beginPath();
    ctx.arc(exitGate.x, exitGate.y, EXIT_SIZE/2, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(exitGate.x, exitGate.y, EXIT_SIZE/2 + 4, 0, Math.PI*2);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◉', exitGate.x, exitGate.y);
    ctx.shadowBlur = 0;
}

function drawRelics() {
    for (let r of relics) {
        if (!r.collected) {
            const glow = Math.sin(Date.now()*0.012)*0.1+0.3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = `rgba(251,191,36,${0.3+glow})`;
            ctx.beginPath();
            ctx.arc(r.x, r.y, RELIC_SIZE/2+3, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(r.x, r.y, RELIC_SIZE/2-2, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '14px monospace';
            ctx.fillText('✦', r.x-4, r.y+5);
            ctx.shadowBlur = 0;
        }
    }
}

function drawPlayers() {
    for (let [id, p] of Object.entries(players)) {
        if (!p.alive) continue;
        ctx.shadowBlur = 14;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.colorLight;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size/2 + 3, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x-5, p.y-3, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x+5, p.y-3, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#0c0c14';
        ctx.beginPath();
        ctx.arc(p.x-5 + Math.sin(Date.now()*0.008)*0.5, p.y-3, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x+5 + Math.sin(Date.now()*0.008)*0.5, p.y-3, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function drawSpirit() {
    if (!spirit.active && spirit.anger < 25) return;
    const intensity = 0.3 + (spirit.anger/100);
    const flicker = Math.sin(Date.now()*0.02)*0.1;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgba(160,80,200,${0.4+intensity+flicker})`;
    ctx.fillStyle = `rgba(100,60,140,${0.5+intensity*0.5})`;
    ctx.beginPath();
    ctx.ellipse(spirit.x, spirit.y, SPIRIT_SIZE/2, SPIRIT_SIZE/1.4, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,80,120,${0.8+flicker})`;
    ctx.beginPath();
    ctx.arc(spirit.x-8, spirit.y-4, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(spirit.x+8, spirit.y-4, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(spirit.x-8, spirit.y-5, 2, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(spirit.x+8, spirit.y-5, 2, 0, Math.PI*2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawParticles() {
    for (let p of particles) {
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x-2, p.y-2, 4, 4);
    }
    ctx.globalAlpha = 1;
}

// ========== LOOP ==========
function update() {
    if (!gameRunning) return;
    updateMovement();
    checkRelicCollection();
    updateSpirit();
    checkExit();
    updateParticles();
}

function draw() {
    drawBackground();
    drawExit();
    drawRelics();
    drawPlayers();
    drawSpirit();
    drawParticles();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ========== START ==========
initGame();
gameLoop();
