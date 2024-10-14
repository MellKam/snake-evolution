import { type Direction, type Game, Snake } from "./game.ts";
import type { Vector2 } from "./utils.ts";

interface CanvasRendererSettings {
  canvasWidth: number;
  canvasHeight: number;
  gridWidth: number;
  gridHeight: number;
}

export class CanvasRenderer {
  private readonly cellSize: number;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    public readonly settings: CanvasRendererSettings,
  ) {
    this.cellSize = this.settings.canvasWidth / this.settings.gridWidth;
  }

  drawGrid() {
    this.ctx.strokeStyle = "rgb(0,0,0,0.1)";
    const { canvasHeight, canvasWidth, gridWidth } = this.settings;
    const cellSize = this.cellSize;
    for (let i = 0, l = gridWidth; i <= l; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * cellSize, 0);
      this.ctx.lineTo(i * cellSize, canvasHeight);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * cellSize);
      this.ctx.lineTo(canvasWidth, i * cellSize);
      this.ctx.stroke();
    }
  }

  private drawCell(x: number, y: number, color: string) {
    this.ctx.fillStyle = color;
    const cellSize = this.cellSize;
    this.ctx.fillRect(
      x * cellSize,
      y * cellSize,
      cellSize,
      cellSize,
    );
  }

  // private drawCircle(x: number, y: number, color: string) {
  //   this.ctx.fillStyle = color;
  //   const cellSize = this.settings.cellSize;
  //   const halfCellSize = this.settings.cellSize / 2;
  //   this.ctx.beginPath();
  //   this.ctx.arc(
  //     x * cellSize + halfCellSize,
  //     y * cellSize + halfCellSize,
  //     halfCellSize,
  //     0,
  //     2 * Math.PI,
  //   );
  //   this.ctx.fill();
  //   this.ctx.closePath();
  // }

  private drawSnake(body: Vector2[]) {
    for (const cell of body) {
      this.drawCell(cell.x, cell.y, "#10b981");
    }
  }

  drawSnakePath(startPosition: Vector2, path: Uint8Array) {
    const snake = new Snake([startPosition.clone()]);
    let previousHead = snake.head.clone();
    const cellSize = this.cellSize;
    const halfCellSize = this.cellSize / 2;

    this.ctx.strokeStyle = "#10b981";
    this.ctx.lineWidth = 2;
    for (let i = 0; i < path.length; i++) {
      snake.moveHead(path[i] as Direction);

      const head = snake.head;
      this.ctx.beginPath();
      this.ctx.moveTo(
        previousHead.x * cellSize + halfCellSize,
        previousHead.y * cellSize + halfCellSize,
      );
      this.ctx.lineTo(
        head.x * cellSize + halfCellSize,
        head.y * cellSize + halfCellSize,
      );
      this.ctx.stroke();

      previousHead = head.clone();
    }

    this.ctx.closePath();
  }

  drawGameFrame(game: Game) {
    this.ctx.clearRect(
      0,
      0,
      this.settings.canvasWidth,
      this.settings.canvasHeight,
    );
    this.drawGrid();
    for (let i = 0; i < game.food.length; i++) {
      const food = game.food[i]!;
      const isEaten = game.foodState[i]!;
      this.drawCell(
        food.x,
        food.y,
        isEaten ? "rgb(244,63,94,0.5)" : "rgb(244,63,94)",
      );
    }
    this.drawSnake(game.snake.body);
  }
}
