import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  setDirection,
  spawnFood,
  step,
} from "../src/snakeLogic.js";

test("moves one cell in current direction", () => {
  const state = createInitialState({ width: 10, height: 10, seed: 1 });
  const next = step(state);
  assert.deepEqual(next.snake[0], { x: state.snake[0].x + 1, y: state.snake[0].y });
  assert.equal(next.snake.length, state.snake.length);
});

test("cannot reverse direction instantly", () => {
  const state = createInitialState({ width: 10, height: 10, seed: 1 });
  const changed = setDirection(state, "left");
  assert.equal(changed.nextDirection, "right");
});

test("grows and increments score when eating food", () => {
  const base = createInitialState({ width: 10, height: 10, seed: 1 });
  const state = {
    ...base,
    snake: [
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
    ],
    direction: "right",
    nextDirection: "right",
    food: { x: 5, y: 4 },
  };
  const next = step(state);
  assert.equal(next.score, 1);
  assert.equal(next.snake.length, 4);
  assert.deepEqual(next.snake[0], { x: 5, y: 4 });
});

test("sets game over on wall collision", () => {
  const base = createInitialState({ width: 5, height: 5, seed: 1 });
  const state = {
    ...base,
    snake: [
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 },
    ],
    direction: "right",
    nextDirection: "right",
  };
  const next = step(state);
  assert.equal(next.gameOver, true);
});

test("sets game over on self collision", () => {
  const base = createInitialState({ width: 8, height: 8, seed: 1 });
  const state = {
    ...base,
    snake: [
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
    direction: "up",
    nextDirection: "left",
  };
  const next = step(state);
  assert.equal(next.gameOver, true);
});

test("food never spawns on snake", () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];
  const random = () => 0.9999;
  const food = spawnFood(3, 3, snake, random);
  assert.notEqual(food, null);
  assert.equal(snake.some((seg) => seg.x === food.x && seg.y === food.y), false);
});
