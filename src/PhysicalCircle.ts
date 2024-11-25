const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export class PhysicalCircle {
	public velocityX = 0;
	public velocityY = 0;
	public t = 0;

	constructor(public x: number, public y: number, public radius: number) {}

	/**
	 * Calculates physics collision width 4 walls / borders
	 * Speeds are slowed down by 10%
	 *
	 * @param xmin left border
	 * @param ymin top border
	 * @param xmax right border
	 * @param ymax bottom border
	 */
	public collideWall(xmin: number, ymin: number, xmax: number, ymax: number) {
		if (this.x - this.radius < xmin) {
			this.x = xmin + this.radius;
			this.velocityX = -this.velocityX * 0.9;
		}
		if (this.x + this.radius > xmax) {
			this.x = xmax - this.radius;
			this.velocityX = -this.velocityX * 0.9;
		}
		if (this.y - this.radius < ymin) {
			this.y = ymin + this.radius;
			this.velocityY = -this.velocityY * 0.9;
		}
		if (this.y + this.radius > ymax) {
			this.y = ymax - this.radius;
			this.velocityY = -this.velocityY * 0.9;
		}
	}
	/**
	 * Limits the x and y speed components of the ball and slows it down (not the magnitude!)
	 */
	public constrainSpeed(maxSpeed: number, dampingFactor: number) {
		this.velocityX *= dampingFactor;
		if (Math.abs(this.velocityX) < 0.001) {
			this.velocityX = 0;
		} else {
			this.velocityX = clamp(this.velocityY, -maxSpeed, maxSpeed);
		}

		this.velocityY *= dampingFactor;
		if (Math.abs(this.velocityY) < 0.001) {
			this.velocityY = 0;
		} else {
			this.velocityY = clamp(this.velocityY, -maxSpeed, maxSpeed);
		}
	}

	public updatePosition() {
		this.x += this.velocityX;
		this.y += this.velocityY;
	}

	public collideStatic(other: PhysicalCircle) {
		if (this === other) return;

		const combinedRadius = this.radius + other.radius;
		const distance = Math.sqrt(
			(this.x - other.x) ** 2 + (this.y - other.y) ** 2
		);

		if (distance < combinedRadius) {
			const angle = Math.atan2(this.y - other.y, this.x - other.x);
			this.x = other.x + combinedRadius * Math.cos(angle);
			this.y = other.y + combinedRadius * Math.sin(angle);
		}
	}

	/**
	 * calculates collision with another PhysicalCircle
	 * makes them bounce apart
	 *
	 * @param o		other PhysicalCircle
	 * @param speed	value to limit speed due to numerical error
	 */
	public collideBouncy(other: PhysicalCircle, speed: number) {
		if (this == other) return;

		const combinedRadius = this.radius + other.radius;
		const distance = Math.sqrt(
			(this.x - other.x) ** 2 + (this.y - other.y) ** 2
		);

		if (distance < combinedRadius) {
			const angle = Math.atan2(this.y - other.y, this.x - other.x);

			this.x = other.x + combinedRadius * Math.cos(angle);
			this.y = other.y + combinedRadius * Math.sin(angle);
			this.velocityX -= ((((other.x - this.x) * 2) / distance) * speed) / 5;
			this.velocityY -= ((((other.y - this.y) * 2) / distance) * speed) / 5;
		}
	}

	/**
	 * Makes this circle follow another circle but retaining inertia
	 */
	public followBouncy(other: PhysicalCircle) {
		if (this == other) return;

		const radiusSum = this.radius + other.radius;
		const angle = Math.atan2(this.y - other.y, this.x - other.x);
		const targetX = other.x + radiusSum * Math.cos(angle);
		const targetY = other.y + radiusSum * Math.sin(angle);

		this.velocityX += (targetX - this.x) / radiusSum / 32;
		this.velocityY += (targetY - this.y) / radiusSum / 32;
		this.x += ((targetX - this.x) / radiusSum) * 24 + other.velocityX * 0.24;
		this.y += ((targetY - this.y) / radiusSum) * 24 + other.velocityY * 0.24;
	}

	/**
	 * Makes this circle follow another circle so they always contact each other
	 */
	public followStatic(other: PhysicalCircle) {
		if (this == other) return;

		const radiusSum = this.radius + other.radius;
		const angle = Math.atan2(this.y - other.y, this.x - other.x);

		this.x = other.x + radiusSum * Math.cos(angle);
		this.y = other.y + radiusSum * Math.sin(angle);
	}

	/**
	 * checks whether this circle is closer than the threshold to another circle
	 */
	public isColliding(
		other: PhysicalCircle,
		thresholdDistance: number
	): boolean {
		const radiusSum = this.radius + other.radius;
		const distance = Math.sqrt(
			(this.x - other.x) ** 2 + (this.y - other.y) ** 2
		);
		return distance < radiusSum + thresholdDistance;
	}

	public getAbsoluteVelocity(): number {
		return Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
	}

	public getDistanceTo(other: PhysicalCircle): number {
		return (
			Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2) -
			(this.radius - other.radius) / 2
		);
	}

	public getAngleTo(other: PhysicalCircle): number {
		return Math.atan2(other.y - this.y, other.x - this.x);
	}
}
