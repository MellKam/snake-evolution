import { Vector2 } from "./utils.ts";

export const enum Direction {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

export const DIRECTIONS = Object.freeze([
  Direction.Up,
  Direction.Right,
  Direction.Down,
  Direction.Left,
]);

export function getRandomDirection(): Direction {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]!;
}

export function getBackwardDirection(direction: Direction): Direction {
  return (direction + 2) % 4;
}

export function createRandomSnakePath(length: number): Uint8Array {
  const path = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    path[i] = getRandomDirection();
  }
  return path;
}

export class Snake {
  constructor(public body: Vector2[]) {}

  get head(): Vector2 {
    return this.body[0]!;
  }

  get tail(): Vector2 {
    return this.body[this.body.length - 1]!;
  }

  moveHead(direction: Direction) {
    const newHead = this.head.clone();
    switch (direction) {
      case Direction.Up:
        newHead.y--;
        break;
      case Direction.Down:
        newHead.y++;
        break;
      case Direction.Left:
        newHead.x--;
        break;
      case Direction.Right:
        newHead.x++;
        break;
    }
    this.body.unshift(newHead);
    this.body.pop();
  }

  clone(): Snake {
    return new Snake(this.body.map((cell) => cell.clone()));
  }
}

export class Game {
  private constructor(
    public readonly gridWidth: number,
    public readonly gridHeight: number,
    public readonly snake: Snake,
    public readonly food: Vector2[],
    public readonly foodState: boolean[],
  ) {}

  static create(
    gridWidth: number,
    gridHeight: number,
    snake: Snake,
    food: Vector2[],
  ) {
    const foodState = new Array(food.length).fill(false);
    return new Game(gridWidth, gridHeight, snake, food, foodState);
  }

  getClosestFood(): [Vector2, number] | null {
    let closestFood: Vector2 | null = null;
    let closestDistance = Infinity;
    const head = this.snake.head;

    for (let i = 0; i < this.food.length; i++) {
      if (this.foodState[i]) continue;
      const foodItem = this.food[i]!;
      const distance = Vector2.distance(head, foodItem);
      if (distance < closestDistance) {
        closestFood = foodItem;
        closestDistance = distance;
      }
    }
    return closestFood ? [closestFood, closestDistance] : null;
  }

  isSnakeHeadOffGrid(): boolean {
    const head = this.snake.head;
    return head.x < 0 || head.x >= this.gridWidth || head.y < 0 ||
      head.y >= this.gridHeight;
  }

  moveSnakeHead(direction: Direction): boolean {
    this.snake.moveHead(direction);
    if (this.isSnakeHeadOffGrid()) return false;

    const head = this.snake.head;
    for (let i = 0; i < this.food.length; i++) {
      if (this.foodState[i]) continue;
      const foodPosition = this.food[i]!;
      if (Vector2.equals(head, foodPosition)) {
        this.foodState[i] = true;
      }
    }

    return true;
  }

  clone(): Game {
    return new Game(
      this.gridWidth,
      this.gridHeight,
      this.snake.clone(),
      this.food.map((food) => food.clone()),
      this.foodState.slice(),
    );
  }

  getScore(): number {
    return this.foodState.reduce((total, eaten) => total + (eaten ? 1 : 0), 0);
  }
}

export function generateRandomFoodCoordinates(
  gridWidth: number,
  gridHeight: number,
  foodCount: number,
): Vector2[] {
  const coordinates: Set<string> = new Set();
  while (coordinates.size < foodCount) {
    const x = Math.floor(Math.random() * gridWidth);
    const y = Math.floor(Math.random() * gridHeight);
    coordinates.add(`${x},${y}`);
  }
  return Array.from(coordinates).map((coordinate) => {
    const [x, y] = coordinate.split(",").map((value) => parseInt(value)) as [
      number,
      number,
    ];
    return new Vector2(x, y);
  });
}

export function getSnakeDeathMoveIndex(
  path: Uint8Array,
  game: Game,
): number | null {
  for (let i = 0; i < path.length; i++) {
    const direction = path[i]! as Direction;
    const isAlive = game.moveSnakeHead(direction);
    if (!isAlive) return i;
  }
  return null;
}
