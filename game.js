// Whisper Hollow - 2 Player Co-op Horror Extraction Game
// Playable offline on YouTube Playables

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

// Players
const players = {
    p1: { x: 150, y: 300, size: PLAYER_SIZE, color: '#ff4444', colorLight: '#ff6666', alive: true, keys: { w: false, s: false, a: false, d: false } },
    p2: { x: 850, y: 300, size: PLAYER_SIZE, color: '#4488ff', colorLight: '#66aaff', alive: true, keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false } }
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
let fogLayers = [];

// ========== INITIALIZATION ==========
function initGame() {
    gameRunning = true;
    winCondition = false;
    collectedRelics = 0;
    updateRelicDisplay();
    
    // Reset players
    players.p1 = { ...players.p1, x: 150, y: 300, alive: true };
    players.p2 = { ...players.p2, x: 850, y: 300, alive: true };
    
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
    document.getElementById('winMessage').classList.add('hidden');
    document.getElementById('loseMessage').classList.add('hidden');
    
    updateStatusDisplay();
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
    initGame();
}

window.resetGame = resetGame;

// ========== PLAYER MOVEMENT ==========
const SPEED = 3.5;

function movePlayer(player, keys, up, down, left, right) {
    if (!player.alive) return;
    
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
                
                // Add particle effect
                for (let i = 0; i < 15; i++) {
                    particles.push({
                        x: relic.x, y: relic.y, 
                        vx: (Math.random() - 0.5) * 4, 
                        vy: (Math.random() - 0.5) * 4 - 2,
                        life: 1, color: '#ffd966'
                    });
                }
                
                // Increase spirit anger
                spirit.anger = Math.min(100, spirit.anger + 33);
                
                // Activate exit when all relics collected
                if (collectedRelics >= TOTAL_RELICS) {
                    exitGate.active = true;
                    spirit.active = true;
                }
            }
        }
    }
}

function checkExit() {
    if (!exitGate.active) return;
    
    const bothAtExit = (players.p1.alive && players.p2.alive &&
        Math.hypot(players.p1.x - exitGate.x, players.p1.y - exitGate.y) < 30 &&
        Math.hypot(players.p2.x - exitGate.x, players.p2.y - exitGate.y) < 30);
    
    if (bothAtExit && !winCondition) {
        winCondition = true;
        gameRunning = false;
        document.getElementById('winMessage').classList.remove('hidden');
    }
}

function updateSpirit() {
    if (!spirit.active) {
        // Spirit wanders slowly
        spirit.x += (Math.random() - 0.5) * 1.5;
        spirit.y += (Math.random() - 0.5) * 1.5;
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
                document.getElementById('loseMessage').classList.remove('hidden');
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
}

function updateStatusDisplay() {
    document.getElementById('p1Status').innerHTML = players.p1.alive ? '🟢 Alive' : '🔴 Consumed';
    document.getElementById('p2Status').innerHTML = players.p2.alive ? '🟢 Alive' : '🔴 Consumed';
    
    if (!players.p1.alive) document.getElementById('p1Status').style.color = '#ff6666';
    if (!players.p2.alive) document.getElementById('p2Status').style.color = '#ff6666';
}

// ========== RENDERING ==========
function drawBackground() {
    // Gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    grad.addColorStop(0, '#0a0e1a');
    grad.addColorStop(1, '#151a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Fog/mist
    ctx.fillStyle = 'rgba(80, 100, 130, 0.05)';
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(Math.sin(Date.now() * 0.001 + i) * 200 + i * 100, 
                Math.cos(Date.now() * 0.0007 + i) * 100 + 300, 80, 0, Math.PI*2);
        ctx.fill();
    }
    
    // Ground texture
    ctx.strokeStyle = 'rgba(100, 120, 150, 0.2)';
    for (let i = 0; i < 200; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 30, MAP_HEIGHT);
        ctx.lineTo(i * 30 + 20, MAP_HEIGHT - 50);
        ctx.stroke();
    }
}

function drawExit() {
    if (!exitGate.active) return;
    
    // Glowing portal
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#44ffaa';
    ctx.fillStyle = 'rgba(68, 255, 170, 0.3)';
    ctx.beginPath();
    ctx.arc(exitGate.x, exitGate.y, exitGate.size/2, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = '#44ffaa';
    ctx.font = '30px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪', exitGate.x, exitGate.y);
    ctx.shadowBlur = 0;
}

function drawRelics() {
    for (let relic of relics) {
        if (!relic.collected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffaa44';
            ctx.fillStyle = '#ffaa44';
            ctx.beginPath();
            ctx.arc(relic.x, relic.y, relic.size/2, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px monospace';
            ctx.fillText('🔮', relic.x-8, relic.y+6);
            ctx.shadowBlur = 0;
        }
    }
}

function drawPlayers() {
    for (let [id, p] of Object.entries(players)) {
        if (!p.alive) continue;
        
        // Glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.colorLight;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size/2 + 2, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - 6, p.y - 4, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + 6, p.y - 4, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(p.x - 6 + (Math.sin(Date.now() * 0.01) * 1), p.y - 4, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x + 6 + (Math.sin(Date.now() * 0.01) * 1), p.y - 4, 2, 0, Math.PI*2);
        ctx.fill();
        
        // Name tag
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 3;
        ctx.fillText(id === 'p1' ? 'P1' : 'P2', p.x-6, p.y-14);
    }
    ctx.shadowBlur = 0;
}

function drawSpirit() {
    if (!spirit.active && spirit.anger < 30) return;
    
    let intensity = 0.3 + (spirit.anger / 150);
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(100, 50, 150, ${intensity})`;
    
    // Wraith body
    ctx.fillStyle = `rgba(80, 50, 120, ${0.6 + intensity})`;
    ctx.beginPath();
    ctx.ellipse(spirit.x, spirit.y, spirit.size/2, spirit.size/1.5, 0, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(160, 80, 200, ${0.5 + intensity})`;
    ctx.beginPath();
    ctx.ellipse(spirit.x-5, spirit.y-5, 8, 10, 0, 0, Math.PI*2);
    ctx.ellipse(spirit.x+5, spirit.y-5, 8, 10, 0, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = '#ff44aa';
    ctx.font = '28px monospace';
    ctx.fillText('👻', spirit.x-12, spirit.y+8);
    ctx.shadowBlur = 0;
}

function drawParticles() {
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x-2, p.y-2, 4, 4);
    }
    ctx.globalAlpha = 1;
}

// ========== GAME LOOP ==========
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

// ========== START GAME ==========
initGame();
gameLoop();
