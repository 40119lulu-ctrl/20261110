const assets = {};
const pressed = {};
const lastTap = {};
const questions = ["+", "-", "×"];

let player;
let fish = [];
let apples = [];
let score = 0;
let cameraX = 0;
let startX = 150;
let nextFishX = 790;
let attackTime = 0;
let attackDirection = 1;
let attackFired = false;
let runDirection = null;
let flying = false;
let quizFish = null;
let quizData = null;
let lastHudUpdate = 0;

function preload() {
  assets.walk = loadImage("kirby/walk/all(walk).png");
  assets.run = loadImage("kirby/run/all(run).png");
  assets.jump = loadImage("kirby/jump/all(jump).png");
  assets.fly = loadImage("kirby/fly/all(fly).png");
  assets.hit = loadImage("kirby/hit/hit(all).png");
  assets.apple = loadImage("apple/apple(all).png");
  assets.fish = loadImage("fih/stop/stop(all).png");
  assets.happy = loadImage("fih/happy/happy(all).png");
  assets.sadge = loadImage("fih/sadge/sadge(all).png");
}

function setup() {
  const stage = document.getElementById("game-stage");
  const canvas = createCanvas(stage.clientWidth, stage.clientHeight);
  canvas.parent(stage);
  canvas.elt.setAttribute("aria-label", "淺藍天空中的 Kirby 數學冒險畫面");
  pixelDensity(1);
  drawingContext.imageSmoothingEnabled = false;
  player = { x: startX, y: 0, vy: 0, facing: 1, walkClock: 0, onGround: true };
  bindControls();
  resizeGame();
}

function draw() {
  const dt = Math.min(deltaTime / 1000, 0.04);
  const groundY = height * 0.75;
  updateGame(dt, groundY);
  drawWorld(groundY);
  drawFish(groundY);
  drawApples(dt, groundY);
  drawPlayer(groundY);
  updateHud();
}

function updateGame(dt, groundY) {
  if (!player || quizFish) return;

  const direction = (pressed.ArrowRight ? 1 : 0) - (pressed.ArrowLeft ? 1 : 0);
  const running = runDirection !== null && direction === runDirection;
  if (direction) {
    player.facing = direction;
    player.x += direction * (running ? 420 : 245) * dt;
    player.walkClock += dt * (running ? 16 : 9);
  }

  if (flying && !player.onGround) {
    if (pressed.ArrowUp) player.vy = Math.max(player.vy - 900 * dt, -245);
    else player.vy = Math.min(player.vy + 230 * dt, 150);
    if (pressed.ArrowDown) player.vy = 265;
  } else {
    player.vy += 1120 * dt;
  }
  player.y += player.vy * dt;
  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
    flying = false;
  } else {
    player.onGround = false;
  }

  if (attackTime > 0) {
    attackTime = Math.max(0, attackTime - dt);
    if (!attackTime && !attackFired) {
      launchApple();
      attackFired = true;
    }
  }

  cameraX = Math.max(0, player.x - width * 0.42);
  while (player.x > nextFishX - width) {
    fish.push({ x: nextFishX, state: "stop", stateTime: 0 });
    nextFishX += 760;
  }

  for (const enemy of fish) {
    if (enemy.state === "happy" || enemy.state === "sadge") {
      enemy.stateTime += dt;
    }
  }
  fish = fish.filter((enemy) => enemy.x > cameraX - width * 0.7);
}

function drawWorld(groundY) {
  background("#a8e1f4");
  noStroke();

  fill(255, 255, 255, 116);
  for (let i = 0; i < 5; i++) {
    const cloudX = ((i * 271 - cameraX * 0.16) % (width + 180) + width + 180) % (width + 180) - 90;
    const cloudY = 62 + (i % 3) * 55;
    ellipse(cloudX, cloudY, 62, 18);
    ellipse(cloudX - 15, cloudY - 5, 28, 23);
    ellipse(cloudX + 8, cloudY - 8, 36, 28);
  }

  fill("#91d5dc");
  beginShape();
  vertex(0, groundY);
  for (let x = -30; x <= width + 50; x += 16) {
    const wave = Math.sin((x + cameraX * 0.22) * 0.009) * 16 + Math.sin((x + cameraX * 0.22) * 0.021) * 7;
    vertex(x, groundY - 21 + wave);
  }
  vertex(width, groundY);
  endShape(CLOSE);

  fill("#74c78f");
  rect(0, groundY, width, height - groundY);
  fill("#59b87c");
  rect(0, groundY, width, 8);
  fill("#83d198");
  for (let i = 0; i < Math.ceil(width / 50) + 2; i++) {
    const speckX = ((i * 53 - cameraX * 0.8) % (width + 50) + width + 50) % (width + 50) - 25;
    rect(speckX, groundY + 25 + (i % 3) * 21, 12, 3);
  }

  for (let i = 0; i < 6; i++) {
    const flowerX = ((i * 219 - cameraX * 0.75) % (width + 160) + width + 160) % (width + 160) - 80;
    const flowerY = groundY + 42 + (i % 3) * 25;
    fill(i % 2 ? "#fff0a6" : "#ffe2e7");
    circle(flowerX, flowerY, 7);
    fill("#f4af53");
    circle(flowerX, flowerY, 3);
  }
}

function drawFish(groundY) {
  for (const enemy of fish) {
    const imageSheet = enemy.state === "happy" ? assets.happy : enemy.state === "sadge" ? assets.sadge : assets.fish;
    const frameCount = enemy.state === "happy" ? 2 : enemy.state === "sadge" ? 4 : 5;
    const frame = enemy.state === "stop"
      ? Math.floor(millis() / 150) % frameCount
      : Math.floor(enemy.stateTime / 0.19) % frameCount;
    const sourceWidth = imageSheet.width / frameCount;
    const sourceHeight = imageSheet.height;
    const scale = playerScale() * 0.78;
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const x = enemy.x - cameraX;
    image(imageSheet, x - drawWidth / 2, groundY - drawHeight, drawWidth, drawHeight,
      frame * sourceWidth, 0, sourceWidth, sourceHeight);
  }
}

function drawApples(dt, groundY) {
  for (const apple of apples) {
    apple.x += apple.vx * dt;
    apple.y += apple.vy * dt;
    apple.vy += 600 * dt;

    const size = appleSize();
    image(assets.apple, apple.x - cameraX - size.width / 2, apple.y - size.height / 2, size.width, size.height);

    for (const enemy of fish) {
      if (enemy.state !== "stop" || Math.abs(apple.x - enemy.x) > size.width * 0.55 + playerSize().width * 0.36) continue;
      if (Math.abs(apple.y - (groundY - playerSize().height * 0.25)) > size.height + playerSize().height * 0.34) continue;
      apple.remove = true;
      openQuiz(enemy);
      break;
    }
    if (apple.y > groundY || apple.x < cameraX - 100 || apple.x > player.x + width) apple.remove = true;
  }
  apples = apples.filter((apple) => !apple.remove);
}

function drawPlayer(groundY) {
  let sheet = assets.walk;
  let frameCount = 4;
  let frame = player.onGround ? Math.floor(player.walkClock) % frameCount : 0;

  if (attackTime > 0) {
    sheet = assets.hit;
    frameCount = 5;
    frame = Math.min(frameCount - 1, Math.floor((0.42 - attackTime) / 0.084));
  } else if (flying && !player.onGround) {
    sheet = assets.fly;
    frameCount = 7;
    frame = Math.floor(millis() / 100) % frameCount;
  } else if (!player.onGround) {
    sheet = assets.jump;
    frameCount = 7;
    frame = Math.min(frameCount - 1, Math.floor((1 - Math.abs(player.vy) / 510) * frameCount));
  } else if (runDirection !== null && pressed[runDirection < 0 ? "ArrowLeft" : "ArrowRight"]) {
    sheet = assets.run;
    frameCount = 8;
    frame = Math.floor(player.walkClock) % frameCount;
  }

  const frameWidth = sheet.width / frameCount;
  const frameHeight = sheet.height;
  const size = playerSize(frameWidth, frameHeight);
  const screenX = player.x - cameraX;
  const screenY = player.y - size.height / 2;
  push();
  translate(screenX, screenY);
  scale(attackTime > 0 ? -player.facing : player.facing, 1);
  image(sheet, -size.width / 2, -size.height / 2, size.width, size.height,
    frame * frameWidth, 0, frameWidth, frameHeight);
  pop();
}

function playerScale() {
  const frameWidth = assets.walk.width / 4;
  const frameHeight = assets.walk.height;
  return Math.sqrt((width * height / 20) / (frameWidth * frameHeight));
}

function playerSize(frameWidth = assets.walk.width / 4, frameHeight = assets.walk.height) {
  const area = width * height / 20;
  const scale = Math.sqrt(area / (frameWidth * frameHeight));
  return { width: frameWidth * scale, height: frameHeight * scale };
}

function appleSize() {
  const scale = playerScale() * 0.66;
  return { width: assets.apple.width * scale, height: assets.apple.height * scale };
}

function launchApple() {
  const size = playerSize();
  apples.push({
    x: player.x + attackDirection * size.width * 0.45,
    y: player.y - size.height * 0.48,
    vx: attackDirection * 570,
    vy: -290,
    remove: false
  });
}

function beginAttack() {
  if (quizFish || attackTime > 0 || !assets.hit || !assets.hit.width) return;
  attackDirection = player.facing;
  attackTime = 0.42;
  attackFired = false;
}

function jumpOrFly() {
  const now = performance.now();
  if (now - (lastTap.ArrowUp || 0) < 330) {
    flying = true;
    if (player.onGround) player.vy = -260;
  } else if (player.onGround) {
    player.vy = -510;
  }
  lastTap.ArrowUp = now;
}

function pressControl(control) {
  if (control === "attack") {
    beginAttack();
    return;
  }
  if (quizFish || pressed[control]) return;

  const now = performance.now();
  if ((control === "ArrowLeft" || control === "ArrowRight") && now - (lastTap[control] || 0) < 330) {
    runDirection = control === "ArrowLeft" ? -1 : 1;
  }
  if (control === "ArrowUp") jumpOrFly();
  pressed[control] = true;
  lastTap[control] = now;
}

function releaseControl(control) {
  pressed[control] = false;
  if ((control === "ArrowLeft" && runDirection === -1) || (control === "ArrowRight" && runDirection === 1)) {
    runDirection = null;
  }
}

function bindControls() {
  window.addEventListener("keydown", (event) => {
    const controls = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (controls.includes(event.key)) {
      event.preventDefault();
      if (!event.repeat) pressControl(event.key);
      return;
    }
    if (quizFish && /^[1-4]$/.test(event.key)) answerQuestion(Number(event.key) - 1);
    if ((event.key === " " || event.key.toLowerCase() === "z") && !event.repeat) beginAttack();
  });

  window.addEventListener("keyup", (event) => {
    if (event.key.startsWith("Arrow")) releaseControl(event.key);
  });
  window.addEventListener("blur", () => {
    Object.keys(pressed).forEach(releaseControl);
    runDirection = null;
  });

  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      button.classList.add("is-active");
      pressControl(control);
    });
    const release = () => {
      button.classList.remove("is-active");
      if (control !== "attack") releaseControl(control);
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  document.getElementById("game-stage").addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button === 0 && !event.target.closest("button")) beginAttack();
  });
}

function openQuiz(enemy) {
  quizFish = enemy;
  quizData = createQuestion();
  document.getElementById("question").textContent = `${quizData.left} ${quizData.operator} ${quizData.right} = ?`;
  document.getElementById("quiz-feedback").textContent = "";
  document.getElementById("quiz-feedback").classList.remove("correct");
  const answers = document.getElementById("answers");
  answers.replaceChildren();
  quizData.choices.forEach((value, index) => {
    const button = document.createElement("button");
    button.className = "answer-btn";
    button.type = "button";
    button.textContent = value;
    button.setAttribute("aria-label", `選項 ${index + 1}：${value}`);
    button.addEventListener("click", () => answerQuestion(index));
    answers.append(button);
  });
  document.getElementById("quiz").hidden = false;
  document.getElementById("status").textContent = "答對數學題，繼續冒險！";
}

function createQuestion() {
  const operator = random(questions);
  let left = Math.floor(random(2, 10));
  let right = Math.floor(random(2, 10));
  if (operator === "-") {
    if (right > left) [left, right] = [right, left];
  }
  const answer = operator === "+" ? left + right : operator === "-" ? left - right : left * right;
  const choices = new Set([answer]);
  while (choices.size < 4) {
    const offset = Math.floor(random(-5, 6)) || 2;
    choices.add(Math.max(0, answer + offset));
  }
  return { left, right, operator, answer, choices: shuffle([...choices]) };
}

function answerQuestion(index) {
  if (!quizData || !quizFish) return;
  const selected = Number(document.querySelectorAll(".answer-btn")[index]?.textContent);
  if (selected === quizData.answer) {
    score += 10;
    quizFish.state = "happy";
    quizFish.stateTime = 0;
    quizFish = null;
    quizData = null;
    document.getElementById("quiz").hidden = true;
    document.getElementById("status").textContent = "答對了！繼續前進";
    return;
  }
  quizFish.state = "sadge";
  quizFish.stateTime = 0;
  quizFish = null;
  quizData = null;
  document.getElementById("quiz").hidden = true;
  document.getElementById("status").textContent = "答錯了！下一隻魚會再出題";
}

function updateHud() {
  if (frameCount - lastHudUpdate < 8) return;
  lastHudUpdate = frameCount;
  document.getElementById("score").textContent = score;
  document.getElementById("distance").textContent = Math.floor(Math.max(0, player.x - startX) / 100);
}

function resizeGame() {
  const stage = document.getElementById("game-stage");
  if (!stage || !stage.clientWidth || !stage.clientHeight) return;
  resizeCanvas(stage.clientWidth, stage.clientHeight);
  drawingContext.imageSmoothingEnabled = false;
  if (player && player.onGround) player.y = height * 0.75;
}

function windowResized() {
  resizeGame();
}
