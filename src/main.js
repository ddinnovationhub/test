import {
  createInitialState,
  setDirection,
  step,
  togglePause,
} from "./snakeLogic.js";

const CELL_SIZE = 20;
const BOARD_WIDTH = 16;
const BOARD_HEIGHT = 16;

const boardEl = document.getElementById("board");
const boardCtx = boardEl.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const difficultyEl = document.getElementById("difficulty");
const snakeColorEl = document.getElementById("snake-color");
const restartBtn = document.getElementById("restart");
const pauseBtn = document.getElementById("pause");
const mobileButtons = document.querySelectorAll("[data-dir]");

const DIR_FROM_KEY = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
  W: "up",
  A: "left",
  S: "down",
  D: "right",
};

const DIFFICULTY_TICKS = {
  easy: 180,
  medium: 140,
  hard: 95,
};

const SNAKE_COLORS = {
  current: "#2d7d3e",
  blue: "#1f6ed4",
  violet: "#6a42c2",
};

if (!boardCtx) {
  throw new Error("2D canvas context is required.");
}

function getTickMs() {
  const selected = difficultyEl?.value || "medium";
  return DIFFICULTY_TICKS[selected] ?? DIFFICULTY_TICKS.medium;
}

function getSnakeColor() {
  const selected = snakeColorEl?.value || "current";
  return SNAKE_COLORS[selected] ?? SNAKE_COLORS.current;
}

let audioContext = null;
let state = createInitialState({
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  seed: "snake-default",
  tickMs: getTickMs(),
});
let previousSnake = state.snake.map((segment) => ({ ...segment }));
let timerId = null;
let lastStepAt = performance.now();

boardEl.width = state.width * CELL_SIZE;
boardEl.height = state.height * CELL_SIZE;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone({ frequency, duration, type = "sine", gain = 0.06 }) {
  if (!audioContext) {
    return;
  }
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const amp = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playEatSound() {
  if (!audioContext) {
    return;
  }
  playTone({ frequency: 660, duration: 0.07, type: "triangle", gain: 0.05 });
  playTone({ frequency: 880, duration: 0.09, type: "triangle", gain: 0.04 });
}

function playFailSound() {
  if (!audioContext) {
    return;
  }
  playTone({ frequency: 280, duration: 0.14, type: "sawtooth", gain: 0.06 });
  playTone({ frequency: 160, duration: 0.2, type: "sawtooth", gain: 0.05 });
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  if (state.gameOver) {
    statusEl.textContent = "Game Over";
    pauseBtn.textContent = "Pause";
  } else if (state.paused) {
    statusEl.textContent = "Paused";
    pauseBtn.textContent = "Resume";
  } else {
    statusEl.textContent = "Running";
    pauseBtn.textContent = "Pause";
  }
}

function drawBoard() {
  boardCtx.fillStyle = "#fff";
  boardCtx.fillRect(0, 0, boardEl.width, boardEl.height);

  boardCtx.strokeStyle = "#eeeeee";
  boardCtx.lineWidth = 1;
  for (let x = 1; x < state.width; x += 1) {
    const px = x * CELL_SIZE + 0.5;
    boardCtx.beginPath();
    boardCtx.moveTo(px, 0);
    boardCtx.lineTo(px, boardEl.height);
    boardCtx.stroke();
  }
  for (let y = 1; y < state.height; y += 1) {
    const py = y * CELL_SIZE + 0.5;
    boardCtx.beginPath();
    boardCtx.moveTo(0, py);
    boardCtx.lineTo(boardEl.width, py);
    boardCtx.stroke();
  }
}

function drawCircleAt(position, color, radiusFactor = 0.42) {
  const cx = (position.x + 0.5) * CELL_SIZE;
  const cy = (position.y + 0.5) * CELL_SIZE;
  const r = CELL_SIZE * radiusFactor;
  boardCtx.fillStyle = color;
  boardCtx.beginPath();
  boardCtx.arc(cx, cy, r, 0, Math.PI * 2);
  boardCtx.fill();
}

function snakeSegmentPosition(index, alpha) {
  const current = state.snake[index];
  if (!current) {
    return null;
  }
  const from =
    index === 0
      ? previousSnake[0] || current
      : previousSnake[index - 1] ||
        previousSnake[previousSnake.length - 1] ||
        current;
  return {
    x: from.x + (current.x - from.x) * alpha,
    y: from.y + (current.y - from.y) * alpha,
  };
}

function render(alpha = 1) {
  drawBoard();

  if (state.food) {
    drawCircleAt(state.food, "#c22", 0.34);
  }

  const snakeColor = getSnakeColor();
  for (let i = state.snake.length - 1; i >= 0; i -= 1) {
    const pos = snakeSegmentPosition(i, alpha);
    if (pos) {
      drawCircleAt(pos, snakeColor);
    }
  }
}

function animationFrame(now) {
  const alpha =
    state.paused || state.gameOver
      ? 1
      : Math.min((now - lastStepAt) / state.tickMs, 1);
  render(alpha);
  updateHud();
  window.requestAnimationFrame(animationFrame);
}

function restart() {
  state = createInitialState({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    seed: String(Date.now()),
    tickMs: getTickMs(),
  });
  previousSnake = state.snake.map((segment) => ({ ...segment }));
  lastStepAt = performance.now();
  startLoop();
  render(1);
  updateHud();
}

function applyDirection(direction) {
  state = setDirection(state, direction);
}

function handleKeyboard(event) {
  ensureAudioContext();
  const dir = DIR_FROM_KEY[event.key];
  if (dir) {
    event.preventDefault();
    applyDirection(dir);
    return;
  }
  if (event.key === " " || event.key === "p" || event.key === "P") {
    event.preventDefault();
    state = togglePause(state);
    updateHud();
  }
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    restart();
  }
}

function gameLoop() {
  const prev = state;
  previousSnake = state.snake.map((segment) => ({ ...segment }));
  state = step(state);
  lastStepAt = performance.now();
  if (state.score > prev.score) {
    playEatSound();
  }
  if (!prev.gameOver && state.gameOver) {
    playFailSound();
  }
}

function startLoop() {
  if (timerId !== null) {
    clearInterval(timerId);
  }
  timerId = setInterval(gameLoop, state.tickMs);
}

window.addEventListener("keydown", handleKeyboard);
restartBtn.addEventListener("click", restart);
pauseBtn.addEventListener("click", () => {
  ensureAudioContext();
  state = togglePause(state);
  updateHud();
});
difficultyEl?.addEventListener("change", () => {
  ensureAudioContext();
  restart();
});

mobileButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ensureAudioContext();
    const dir = button.getAttribute("data-dir");
    if (dir) {
      applyDirection(dir);
    }
  });
});

render(1);
updateHud();
startLoop();
window.requestAnimationFrame(animationFrame);
