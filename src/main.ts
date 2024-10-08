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

class Vector2 {
  constructor(public x: number, public y: number) {}

  static distance(vec1: Vector2, vec2: Vector2): number {
    return Math.abs(vec1.x - vec2.x) + Math.abs(vec1.y - vec2.y);
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
}

function drawFood(food: Vector2) {
  drawCell(food.x, food.y, "#f43f5e");
}

function generateRandomCoords(count: number): Vector2[] {
  const coordinates: Set<string> = new Set();
  while (coordinates.size < count) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    coordinates.add(`${x},${y}`);
  }
  return Array.from(coordinates).map((coordinate) => {
    const [x, y] = coordinate.split(",").map((value) => parseInt(value));
    return new Vector2(x, y);
  });
}

const SNAKE_MOVES = ["UP", "DOWN", "LEFT", "RIGHT"] as const;
type SnakeMove = typeof SNAKE_MOVES[number];

function getRandomMove(): SnakeMove {
  const index = chooseWeightedRandomIndex(SNAKE_MOVES, [
    0.25,
    0.25,
    0.25,
    0.25,
  ]);
  return SNAKE_MOVES[index];
}

function createRandomPath(length: number): SnakeMove[] {
  return Array.from({ length }, () => getRandomMove());
}

class Snake {
  constructor(public body: Vector2[]) {}

  get head(): Vector2 {
    return this.body[0];
  }

  get tail(): Vector2 {
    return this.body[this.body.length - 1];
  }

  move(direction: SnakeMove) {
    const newHead = this.head.clone();
    switch (direction) {
      case "UP":
        newHead.y--;
        break;
      case "DOWN":
        newHead.y++;
        break;
      case "LEFT":
        newHead.x--;
        break;
      case "RIGHT":
        newHead.x++;
        break;
    }
    this.body.unshift(newHead);
    this.body.pop();
  }

  isOutOfBounds(): boolean {
    const head = this.head;
    return head.x < 0 || head.x >= GRID_SIZE || head.y < 0 ||
      head.y >= GRID_SIZE;
  }

  getEatenFoodIndex(food: Vector2[]) {
    return food.findIndex((food) => Vector2.distance(this.head, food) === 0);
  }
}

function drawSnakeTraceUpTo(path: SnakeMove[], endIndex: number) {
  const snake = new Snake([new Vector2(0, 0)]);
  let previousCell = snake.head.clone();

  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 2;
  for (let i = 0; i < endIndex; i++) {
    snake.move(path[i]);

    const head = snake.head;
    ctx.beginPath();
    ctx.moveTo(
      previousCell.x * CELL_SIZE + CELL_SIZE / 2,
      previousCell.y * CELL_SIZE + CELL_SIZE / 2,
    );
    ctx.lineTo(
      head.x * CELL_SIZE + CELL_SIZE / 2,
      head.y * CELL_SIZE + CELL_SIZE / 2,
    );
    ctx.stroke();

    previousCell = head.clone();
  }

  ctx.closePath();
}

async function playSnakePath(
  snake: Snake,
  path: SnakeMove[],
  food: Vector2[],
  delay: number = 50,
) {
  const foodState = Array(food.length).fill(false);

  for (let i = 0; i < path.length; i++) {
    const direction = path[i];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLineGrid();
    for (let i = 0; i < food.length; i++) {
      if (!foodState[i]) {
        drawFood(food[i]);
      }
    }
    drawSnakeTraceUpTo(path, i);
    drawSnake(snake);

    snake.move(direction);
    if (snake.isOutOfBounds()) return;

    const eatenFoodIndex = snake.getEatenFoodIndex(food);
    if (eatenFoodIndex !== -1) {
      foodState[eatenFoodIndex] = true;
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

function drawSnake(snake: Snake) {
  for (const cell of snake.body) {
    drawCell(cell.x, cell.y, "#10b981");
  }
}

function chooseWeightedRandomIndex<T>(
  values: Array<T> | ReadonlyArray<T>,
  probabilities: number[],
): number {
  const randomValue = Math.random();
  let cumulative = 0;
  for (let i = 0; i < values.length; i++) {
    cumulative += probabilities[i];
    if (randomValue < cumulative) {
      return i;
    }
  }
  return values.length - 1;
}

function getClosestFood(
  snake: Snake,
  food: Vector2[],
  foodState: boolean[],
): Vector2 {
  let closestFood = food[0];
  let closestDistance = Vector2.distance(snake.head, closestFood);
  const head = snake.head;
  for (let i = 0; i < food.length; i++) {
    if (foodState[i]) continue;
    const foodItem = food[i];
    const distance = Vector2.distance(head, foodItem);
    if (distance < closestDistance) {
      closestFood = foodItem;
      closestDistance = distance;
    }
  }
  return closestFood;
}

function getPathFitness(path: SnakeMove[], food: Vector2[]): number {
  const snake = new Snake([new Vector2(0, 0)]);
  const foodState = Array<boolean>(food.length).fill(false);
  let cellsTravelledUntilDied = 0;

  for (const direction of path) {
    cellsTravelledUntilDied++;
    snake.move(direction);
    const eatenFoodIndex = snake.getEatenFoodIndex(food);
    if (eatenFoodIndex !== -1) {
      foodState[eatenFoodIndex] = true;
    }
    if (snake.isOutOfBounds()) {
      break;
    }
  }

  if (cellsTravelledUntilDied === 0) {
    return 0;
  }

  const distanceToClosestFood = Vector2.distance(
    snake.head,
    getClosestFood(snake, food, foodState),
  );
  const score = foodState.reduce((total, eaten) => total + (eaten ? 1 : 0), 0);
  // console.log(
  //   distanceToClosestFood !== 0 ? 1 / distanceToClosestFood : 1,
  //   score * 5 / (cellsTravelledUntilDied * 0.2),
  // );
  const fitness =
    (distanceToClosestFood !== 0 ? 1 / (distanceToClosestFood + 1) : 0) +
    score;
  // console.info(cellsTravelledUntilDied);

  // console.log(distanceToClosestFood !== 0 ? 1 / distanceToClosestFood : 0);

  if (snake.isOutOfBounds()) {
    return fitness / 2;
  }

  return Math.pow(fitness - (fitness / 1000 * cellsTravelledUntilDied) + 1, 3);
}

function mutate(path: SnakeMove[], probability = 0.01): SnakeMove[] {
  const moves = path.map((move, i) => {
    const dynamicProbability = probability * (i / path.length);
    return Math.random() < dynamicProbability ? getRandomMove() : move;
  });

  const y = Math.random();
  if (y > 0.9) {
    const num = Math.floor(Math.random() * path.length) / 16;
    for (let i = 0; i < num; i++) {
      moves.pop();
    }
  }

  const x = Math.random();
  if (x > 0.9) {
    const num = Math.floor(Math.random() * path.length) / 16;
    for (let i = 0; i < num; i++) {
      moves.push(getRandomMove());
    }
    return moves;
  }

  return moves;
}

function crossover(path1: SnakeMove[], path2: SnakeMove[]): SnakeMove[] {
  const crossoverPoint = Math.floor(Math.random() * path1.length);
  return [...path1.slice(0, crossoverPoint), ...path2.slice(crossoverPoint)];
}

function getSavedFood(): Vector2[] | null {
  const value = localStorage.getItem("food");
  if (!value) {
    return null;
  }
  const foodCoords = JSON.parse(value) as [number, number][];
  return foodCoords.map(([x, y]) => new Vector2(x, y));
}

function saveFood(food: Vector2[]) {
  localStorage.setItem("food", JSON.stringify(food.map((f) => f.toArray())));
}

function getSavedOrGenerateFood(count: number): Vector2[] {
  const savedFood = getSavedFood();
  if (savedFood && savedFood.length === count) {
    return savedFood;
  }
  const food = generateRandomCoords(count);
  saveFood(food);
  return food;
}

function getLastAliveMoveIndex(path: SnakeMove[]): number {
  const snake = new Snake([new Vector2(0, 0)]);
  let moveIndex = 0;
  for (const direction of path) {
    snake.move(direction);
    if (snake.isOutOfBounds()) {
      break;
    }
    moveIndex++;
  }
  return moveIndex;
}

function evolveGeneration(
  paths: SnakeMove[][],
  food: Vector2[],
): SnakeMove[][] {
  const viablePaths = paths.map((path) => {
    return path.slice(0, getLastAliveMoveIndex(path));
  });

  const fitnesses = viablePaths
    .map((path) => getPathFitness(path, food));
  const totalFitness = fitnesses.reduce((total, fitness) => total + fitness, 0);
  const probabilities = fitnesses.map((fitness) => fitness / totalFitness);

  const best25 = paths
    .map((path, index) => [path, index] as const)
    .filter(([path]) => path.length > 0)
    .sort(
      (a, b) => {
        return fitnesses[a[1]] - fitnesses[b[1]];
      },
    )
    .slice(0, Math.floor(paths.length * 0.25))
    .map(([path]) => path);

  const newGeneration = Array.from(
    { length: paths.length - best25.length },
    () => {
      // const path1 = ;
      // const path2 = paths[chooseWeightedRandomIndex(paths, probabilities)];
      return mutate(
        mutate(paths[chooseWeightedRandomIndex(paths, probabilities)]),
      );
    },
  );

  return [...best25, ...newGeneration];
}

function getBestPath(paths: SnakeMove[][]): SnakeMove[] {
  const fitnesses = paths.map((path) => getPathFitness(path, food));
  const bestIndex = fitnesses.reduce((bestIndex, fitness, index) => {
    if (fitness > fitnesses[bestIndex]) {
      return index;
    }
    return bestIndex;
  }, 0);
  return paths[bestIndex];
}

const food = getSavedOrGenerateFood(50);
let snake = new Snake([new Vector2(0, 0)]);
let generation = Array.from(
  { length: 500 },
  () => createRandomPath(25),
);

let i = 0;
while (true) {
  i++;
  generation = evolveGeneration(generation, food);
  const bestPath = getBestPath(generation);

  console.log(getPathFitness(bestPath, food), bestPath.length);
  if (i % 200 === 0) {
    await playSnakePath(snake, bestPath, food, 20);
    snake = new Snake([new Vector2(0, 0)]);
  }
}
