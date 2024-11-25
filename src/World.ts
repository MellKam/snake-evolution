import { PhysicalCircle } from "./PhysicalCircle";

export class World {
	public height: number;
	public width: number;
	public clock: number;

	public maxNibbles = 20;
	public nibbles: PhysicalCircle[] = [];

	public newNibble(n: number) {
		for (let i = 0; i < n; i++) {
			if (this.nibbles.length >= this.maxNibbles) break;

			const nibble = new PhysicalCircle(0, 0, GameLoop.globalCircleRadius);
			nibble.x =
				Math.random() * (this.width - 2 * nibble.radius) + nibble.radius;
			nibble.y =
				Math.random() * (this.height - 2 * nibble.radius) + nibble.radius;

			nibble.velocityX = 2 * (Math.random() - 0.5);
			nibble.velocityY = 2 * (Math.random() - 0.5);
			nibble.t = 0;
			this.nibbles.push(nibble);
		}
	}

	public calcValue(p: PhysicalCircle): number {
		return Math.floor(5 + 8 * Math.min(Math.exp(-(p.t - 800) / 2000), 1));
	}

	public update(w: number, h: number) {
		this.width = w;
		this.height = h;
		for (const nibble of this.nibbles) {
			nibble.updatePosition();
			nibble.collideWall(50, 50, w - 50, h - 50);
		}
		this.clock += GameLoop.UPDATEPERIOD;
	}

	public draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = "red";
		for (const nibble of this.nibbles) {
			ctx.beginPath();
			ctx.arc(nibble.x, nibble.y, nibble.radius, 0, 2 * Math.PI);
			ctx.fill();
		}
	}

	public removeNibbles(rem: PhysicalCircle[]) {
		for (const r of rem) {
			const index = this.nibbles.indexOf(r);
			if (index === -1) continue;
			this.nibbles.splice(index, 1);
		}
	}

	public reset() {
		this.nibbles = [];
		this.clock = 0;
	}
}
