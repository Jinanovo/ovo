const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");

const size = canvas.width;
const keys = new Set();
let player;
let gem;
let hazards = [];
let score = 0;
let best = Number(localStorage.getItem("gemRushBest") || 0);
let running = false;
let paused = false;
let lastTime = 0;
let spawnTimer = 0;

bestText.textContent = best;

function reset() {
  player = { x: size / 2, y: size / 2, r: 16, speed: 270 };
  hazards = [];
  score = 0;
  spawnTimer = 0;
  scoreText.textContent = "0";
  gem = spawnGem();
}

function spawnGem() {
  return {
    x: 40 + Math.random() * (size - 80),
    y: 40 + Math.random() * (size - 80),
    r: 13,
    phase: Math.random() * Math.PI * 2
  };
}

function spawnHazard() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = -30; y = Math.random() * size; }
  if (side === 1) { x = size + 30; y = Math.random() * size; }
  if (side === 2) { x = Math.random() * size; y = -30; }
  if (side === 3) { x = Math.random() * size; y = size + 30; }

  const angle = Math.atan2(player.y - y, player.x - x);
  const speed = 105 + Math.min(score * 4, 180);
  hazards.push({
    x, y, r: 14,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  });
}

function circleHit(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r;
}

function endGame() {
  running = false;
  if (score > best) {
    best = score;
    localStorage.setItem("gemRushBest", String(best));
    bestText.textContent = best;
  }
  document.getElementById("overlayEyebrow").textContent = "Game over";
  document.getElementById("overlayTitle").textContent = `${score} points`;
  document.getElementById("overlayText").textContent =
    score >= best && score > 0 ? "New best score. Ready to go again?" : "A hazard got you. Try for a higher score!";
  startButton.textContent = "Play again";
  overlay.classList.remove("hidden");
  pauseButton.textContent = "Pause";
}

function update(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx--;
  if (keys.has("arrowright") || keys.has("d")) dx++;
  if (keys.has("arrowup") || keys.has("w")) dy--;
  if (keys.has("arrowdown") || keys.has("s")) dy++;
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

  player.x = Math.max(player.r, Math.min(size - player.r, player.x + dx * player.speed * dt));
  player.y = Math.max(player.r, Math.min(size - player.r, player.y + dy * player.speed * dt));

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnHazard();
    spawnTimer = Math.max(0.38, 1.15 - score * 0.025);
  }

  hazards.forEach(hazard => {
    hazard.x += hazard.vx * dt;
    hazard.y += hazard.vy * dt;
  });
  hazards = hazards.filter(h => h.x > -60 && h.x < size + 60 && h.y > -60 && h.y < size + 60);

  if (circleHit(player, gem)) {
    score++;
    scoreText.textContent = score;
    gem = spawnGem();
  }

  if (hazards.some(hazard => circleHit(player, hazard))) endGame();
}

function draw(time) {
  ctx.fillStyle = "#11131b";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,.025)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  const pulse = 1 + Math.sin(time * 0.006 + gem.phase) * 0.12;
  ctx.save();
  ctx.translate(gem.x, gem.y);
  ctx.rotate(time * 0.001);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "#6fffc7";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#63e6bb";
  ctx.beginPath();
  ctx.moveTo(0, -gem.r);
  ctx.lineTo(gem.r * 0.85, 0);
  ctx.lineTo(0, gem.r);
  ctx.lineTo(-gem.r * 0.85, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  hazards.forEach(hazard => {
    ctx.save();
    ctx.shadowColor = "#ff4f67";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff4f67";
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffc3ca";
    ctx.beginPath();
    ctx.arc(hazard.x - 4, hazard.y - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.save();
  ctx.shadowColor = "#766cff";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#766cff";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dcd9ff";
  ctx.beginPath();
  ctx.arc(player.x - 5, player.y - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function frame(time) {
  if (!lastTime) lastTime = time;
  const dt = Math.min((time - lastTime) / 1000, 0.032);
  lastTime = time;
  if (running && !paused) update(dt);
  draw(time);
  requestAnimationFrame(frame);
}

function startGame() {
  reset();
  running = true;
  paused = false;
  lastTime = 0;
  overlay.classList.add("hidden");
  pauseButton.textContent = "Pause";
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? "Resume" : "Pause";
  if (paused) {
    document.getElementById("overlayEyebrow").textContent = "Paused";
    document.getElementById("overlayTitle").textContent = "Take a breath";
    document.getElementById("overlayText").textContent = "The hazards are waiting.";
    startButton.textContent = "Resume";
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", " "].includes(key)) {
    event.preventDefault();
  }
  if (key === " ") togglePause();
  else keys.add(key);
});

window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  if (running && !paused) togglePause();
});

startButton.addEventListener("click", () => {
  if (paused) togglePause();
  else startGame();
});
pauseButton.addEventListener("click", togglePause);

reset();
requestAnimationFrame(frame);
