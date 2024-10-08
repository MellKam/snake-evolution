const canvas = document.getElementById("game") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas not found");
}

const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
if (!ctx) {
  throw new Error("Context not found");
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
const CANVAS_SCALE = 1.5;

canvas.style.width = `${CANVAS_WIDTH}px`;
canvas.style.height = `${CANVAS_HEIGHT}px`;

canvas.width = CANVAS_WIDTH * CANVAS_SCALE;
canvas.height = CANVAS_HEIGHT * CANVAS_SCALE;
canvas.style.border = "1px solid black";

const CELL_SIZE = 20;
const GRID_SIZE = canvas.width / CELL_SIZE;

function drawCell(x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

drawCell(0, 0, "black");

function drawLineGrid() {
  ctx.strokeStyle = "rgb(0, 0, 0, 0.1)";
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(canvas.width, i * CELL_SIZE);
    ctx.stroke();
  }
}

drawLineGrid();

class Food {
  eaten = false;
  constructor(public readonly x: number, public readonly y: number) {}

  draw() {
    drawCell(this.x, this.y, "#f43f5e");
  }

  eat() {
    this.eaten = true;
  }
}

function generateFood(count: number): Food[] {
  const coordinates: Set<string> = new Set();
  while (coordinates.size < count) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    coordinates.add(`${x},${y}`);
  }
  return Array.from(coordinates).map((coordinate) => {
    const [x, y] = coordinate.split(",").map(Number);
    return new Food(x, y);
  });
}

type SnakeMoveDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";

function getRandomMove(): SnakeMoveDirection {
  return chooseByProbability(["UP", "DOWN", "LEFT", "RIGHT"], [
    0.25,
    0.25,
    0.25,
    0.25,
  ]);
}

class Snake {
  private readonly body: [number, number][] = [[0, 0]];

  draw() {
    for (const [x, y] of this.body) {
      drawCell(x, y, "#10b981");
    }
  }

  move(direction: SnakeMoveDirection) {
    const [headX, headY] = this.body[0];
    let newHeadX = headX;
    let newHeadY = headY;
    switch (direction) {
      case "UP":
        newHeadY--;
        break;
      case "DOWN":
        newHeadY++;
        break;
      case "LEFT":
        newHeadX--;
        break;
      case "RIGHT":
        newHeadX++;
        break;
    }
    this.body.unshift([newHeadX, newHeadY]);
    this.body.pop();
  }

  isOutOfBounds(): boolean {
    const [headX, headY] = this.body[0];
    if (headX < 0 || headX >= GRID_SIZE || headY < 0 || headY >= GRID_SIZE) {
      return true;
    }
    return false;
  }

  markEatenFood(food: Food[]) {
    const [headX, headY] = this.body[0];
    for (const f of food) {
      if (f.x === headX && f.y === headY) {
        f.eat();
        // this.body.push([headX, headY]);
      }
    }
  }
}

function chooseByProbability<T>(
  values: T[],
  probabilities: number[],
): T {
  const randomValue = Math.random();
  let cumulative = 0;
  for (let i = 0; i < values.length; i++) {
    cumulative += probabilities[i];
    if (randomValue < cumulative) {
      return values[i];
    }
  }
  return values[values.length - 1];
}

async function playSnakePath(snake: Snake, path: SnakePath) {
  for (const move of path.moves) {
    snake.move(move);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

class SnakePath {
  constructor(
    public readonly moves: SnakeMoveDirection[],
  ) {}

  static createRandom(length: number): SnakePath {
    const moves: SnakeMoveDirection[] = Array.from({ length }, () => {
      return getRandomMove();
    });
    return new SnakePath(moves);
  }
}

function getPathFitness(path: SnakePath, food: Food[]): number {
  const snake = new Snake();
  for (const move of path.moves) {
    snake.move(move);
    snake.markEatenFood(food);
    if (snake.isOutOfBounds()) {
      return 0;
    }
  }
  return Math.pow(food.filter((f) => f.eaten).length / path.moves.length, 3);
}

function mutate(path: SnakePath, probability = 0.01): SnakePath {
  const moves = path.moves.map((move) => {
    if (Math.random() < probability) {
      return getRandomMove();
    }
    return move;
  });
  return new SnakePath(moves);
}

function crossover(path1: SnakePath, path2: SnakePath): [SnakePath, SnakePath] {
  const splitIndex1 = Math.floor(Math.random() * path1.moves.length);
  const splitIndex2 = Math.floor(Math.random() * path2.moves.length);
  const moves1 = [
    ...path1.moves.slice(0, splitIndex1),
    ...path2.moves.slice(splitIndex2),
  ];
  const moves2 = [
    ...path2.moves.slice(0, splitIndex2),
    ...path1.moves.slice(splitIndex1),
  ];
  return [
    new SnakePath(moves1),
    new SnakePath(moves2),
  ];
}

function getSavedFood(): Food[] | null {
  const value = localStorage.getItem("food");
  if (!value) {
    return null;
  }
  const foodCoords = JSON.parse(value) as [number, number][];
  return foodCoords.map(([x, y]) => new Food(x, y));
}

function saveFood(food: Food[]) {
  const foodCoords = food.map((f) => [f.x, f.y]);
  localStorage.setItem("food", JSON.stringify(foodCoords));
}

function getSavedOrGenerateFood(count: number): Food[] {
  const savedFood = getSavedFood();
  if (savedFood && savedFood.length === count) {
    return savedFood;
  }
  const food = generateFood(10);
  saveFood(food);
  return food;
}

function evolveGeneration(paths: SnakePath[]): SnakePath[] {
  const fitnesses = paths.map((path) => getPathFitness(path, food)).filter((
    fitness,
  ) => fitness > 0);
  const totalFitness = fitnesses.reduce((total, fitness) => total + fitness, 0);
  const probabilities = fitnesses.map((fitness) => fitness / totalFitness);

  return Array(Math.floor(paths.length / 2)).fill(0).flatMap(
    () => {
      const parent1 = chooseByProbability(paths, probabilities);
      const parent2 = chooseByProbability(paths, probabilities);
      const [child1, child2] = crossover(parent1, parent2);
      return [mutate(child1), mutate(child2)];
    },
  );
}

const MAX_MOVE_COUNT = 500;
const INITIAL_MOVE_COUNT = 100;

const snake = new Snake();

function getBestPath(paths: SnakePath[]): SnakePath {
  const fitnesses = paths.map((path) => getPathFitness(path, food));
  const bestIndex = fitnesses.reduce((bestIndex, fitness, index) => {
    if (fitness > fitnesses[bestIndex]) {
      return index;
    }
    return bestIndex;
  }, 0);
  return paths[bestIndex];
}

const food = getSavedOrGenerateFood(10);

let generation = Array.from(
  { length: 100 },
  () => SnakePath.createRandom(INITIAL_MOVE_COUNT),
);

for (let i = 0; i < 1000; i++) {
  generation = evolveGeneration(generation);
  const bestPath = getBestPath(generation);
  console.log(getPathFitness(bestPath, food));
}

// function render() {
//   ctx.clearRect(0, 0, canvas.width, canvas.height);
//   drawLineGrid();
//   for (const f of food) {
//     f.draw();
//   }
//   snake.draw();

//   requestAnimationFrame(render);
// }

// requestAnimationFrame(render);
