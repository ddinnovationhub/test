export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function hashSeed(seed) {
  let h = 2166136261 >>> 0;
  const input = String(seed);
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRandom(seed = Date.now()) {
  let state = hashSeed(seed);
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function keyFor(pos) {
  return `${pos.x},${pos.y}`;
}

export function createInitialState({
  width = 16,
  height = 16,
  seed = Date.now(),
  tickMs = 140,
} = {}) {
  const center = {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
  };

  const snake = [
    center,
    { x: center.x - 1, y: center.y },
    { x: center.x - 2, y: center.y },
  ];

  const random = createRandom(seed);
  const food = spawnFood(width, height, snake, random);

  return {
    width,
    height,
    snake,
    direction: "right",
    nextDirection: "right",
    food,
    score: 0,
    gameOver: false,
    paused: false,
    tickMs,
    random,
  };
}

export function canChangeDirection(current, next) {
  return next !== OPPOSITES[current];
}

export function setDirection(state, direction) {
  if (!DIRECTIONS[direction] || state.gameOver) {
    return state;
  }
  if (!canChangeDirection(state.direction, direction)) {
    return state;
  }
  return { ...state, nextDirection: direction };
}

export function togglePause(state) {
  if (state.gameOver) {
    return state;
  }
  return { ...state, paused: !state.paused };
}

export function spawnFood(width, height, snake, random = Math.random) {
  const occupied = new Set(snake.map(keyFor));
  const open = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        open.push({ x, y });
      }
    }
  }
  if (open.length === 0) {
    return null;
  }
  const index = Math.floor(random() * open.length);
  return open[index];
}

function hitWall(pos, width, height) {
  return pos.x < 0 || pos.y < 0 || pos.x >= width || pos.y >= height;
}

function hitSelf(head, body) {
  return body.some((segment) => segment.x === head.x && segment.y === head.y);
}

export function step(state) {
  if (state.gameOver || state.paused) {
    return state;
  }

  const direction = state.nextDirection;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + delta.x, y: head.y + delta.y };

  if (hitWall(nextHead, state.width, state.height)) {
    return { ...state, gameOver: true, direction };
  }

  const grows =
    state.food &&
    nextHead.x === state.food.x &&
    nextHead.y === state.food.y;

  const bodyForCollision = grows
    ? state.snake
    : state.snake.slice(0, state.snake.length - 1);
  if (hitSelf(nextHead, bodyForCollision)) {
    return { ...state, gameOver: true, direction };
  }

  let nextSnake = [nextHead, ...state.snake];
  let nextFood = state.food;
  let nextScore = state.score;
  if (!grows) {
    nextSnake = nextSnake.slice(0, -1);
  } else {
    nextScore += 1;
    nextFood = spawnFood(state.width, state.height, nextSnake, state.random);
  }

  const complete = nextFood === null;
  return {
    ...state,
    snake: nextSnake,
    direction,
    food: nextFood,
    score: nextScore,
    gameOver: complete,
  };
}
