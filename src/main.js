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
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const difficultyEl = document.getElementById("difficulty");
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

let audioContext = null;
let state = createInitialState({
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  seed: "snake-default",
});
let timerId = null;

const DIFFICULTY_TICKS = {
  easy: 180,
  medium: 140,
  hard: 95,
};

function getTickMs() {
  const selected = difficultyEl?.value || "medium";
  return DIFFICULTY_TICKS[selected] ?? DIFFICULTY_TICKS.medium;
}

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

boardEl.style.setProperty("--cols", String(state.width));
boardEl.style.setProperty("--rows", String(state.height));
boardEl.style.setProperty("--cell", `${CELL_SIZE}px`);

function render() {
  const snakeSet = new Set(state.snake.map((part) => `${part.x},${part.y}`));
  boardEl.innerHTML = "";
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const key = `${x},${y}`;
      if (state.food && key === `${state.food.x},${state.food.y}`) {
        cell.classList.add("food");
      }
      if (snakeSet.has(key)) {
        cell.classList.add("snake");
      }
      boardEl.appendChild(cell);
    }
  }

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

function restart() {
  state = createInitialState({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    seed: String(Date.now()),
    tickMs: getTickMs(),
  });
  startLoop();
  render();
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
    render();
  }
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    restart();
  }
}

function gameLoop() {
  const prev = state;
  state = step(state);
  if (state.score > prev.score) {
    playEatSound();
  }
  if (!prev.gameOver && state.gameOver) {
    playFailSound();
  }
  render();
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
  render();
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

render();
startLoop();
