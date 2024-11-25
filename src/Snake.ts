import { PhysicalCircle } from "./PhysicalCircle";
import {DNA} from "./DNA"
import {NeuralNetwork} from "./NeuralNetwork"
import { World } from "./World";
import { GameLoop } from "./GameLoop";

enum VisibleObjectType {
  Wall = 0,
  Snake = 1,
  Nibble = 2
}

interface VisibleObject {
  type: VisibleObjectType;
  distance: number;
}

export class Snake {
	// Movement constants:
	public static maximumForwardSpeed = 5;
	public static maximumAngularSpeed = Math.PI / 32;
	public static wallCollisionThreshold = 4;
	// view constants:
	public static maximumSightDistance = 600;
	public static fieldOfView = Math.PI * 2 / 3;
	// neural net constants:
	public static FOVDIVISIONS = 8;
	public static FIRSTSTAGESIZE = Snake.FOVDIVISIONS * 2 * 3;
	public static stageSizes = [Snake.FIRSTSTAGESIZE, 16, 16, 2];
	public static isNNSymmetric = false;

	// scoring constants:
	public static nibblebonus = 20;
	public static healthbonus = 10; // Added each time snake eats
	public static healthdecrement = .02; // decremented each loop

	// misc:
	public displayCuteEyes = false; // try it out yourself :)
	public snakeInertia = false;

	// basic snake attributes:
	public snakeSegments: PhysicalCircle[] = Array<PhysicalCircle>(100);

	public dna: DNA;
	public brainNet: NeuralNetwork;
	public age = 0;
	public angle: number;
	public score: number;
	public  isDead: boolean;
	public hue: number;
	public deathFade = 180;
	public health: number;

	/**
	 * Initializes a new snake with given DNA
	 * 
	 * @param dna
	 *            if null, it generates a random new DNA
	 * @param world
	 *            reference to the world for spawn point
	 */
	private constructor(dna: DNA, world: World) {
		const x = Math.random() * (world.width - 2 * Snake.wallCollisionThreshold - 2 * GameLoop.globalCircleRadius) + Snake.wallCollisionThreshold
				+ GameLoop.globalCircleRadius;

		const y = Math.random() * (world.height - 2 * Snake.wallCollisionThreshold - 2 * GameLoop.globalCircleRadius) + Snake.wallCollisionThreshold
				+ GameLoop.globalCircleRadius;

    const nn = NeuralNetwork.create(Snake.stageSizes);
		const dnalength = nn.getTotalWeights() + 1;
		if (dna == null) {
			this.dna = new DNA;
		} else {
			this.dna = dna;
		}
		this.snakeSegments = [];
		this.snakeSegments.push(new PhysicalCircle(x, y, GameLoop.globalCircleRadius));

		this.angle = Math.atan2(world.height / 2 - y, world.width / 2 - x);
		// setup brain:
		reloadFromDNA();
		score = 0;
		deathFade = 180;
		isDead = false;
		health = healthbonus * 3 / 2;
		age = 0;
	}

  static create(world: World) {

  }

  static createWithDNA(dna: DNA, world: World) {

  }

	/**
	 * reloads the network and the color from DNA
	 */
	public void reloadFromDNA() {
		if (isNNSymmetric)
			brainNet.loadCoeffsSymmetrical(this.dna.data);
		else
			brainNet.loadCoeffs(this.dna.data);
		this.hue = (float) this.dna.data[this.dna.data.length - 1] / 256f;
	}

	/**
	 * Movement, aging and collisions
	 * 
	 * @param world
	 *            reference to the world
	 * @return true when snake died that round.
	 */
	public boolean update(World world) {
		if (isDead) {
			deathFade -= .6;
			return true;
		}
		age += .1;
		double slowdown = 49d / (48d + snakeSegments.size());
		PhysicalCircle head = snakeSegments.get(0);
		// calculate neural net
		double angleIncrement = brain(world);

		angle += slowdown * angleIncrement;
		angle = DoubleMath.doubleModulo(angle, Math.PI * 2);

		// collision with wall:
		if (head.x - head.rad < wallCollisionThreshold) {
			score /= 2;
			isDead = true;
		}
		if (head.x + head.rad > world.width - wallCollisionThreshold) {
			score /= 2;
			isDead = true;
		}
		if (head.y - head.rad < wallCollisionThreshold) {
			score /= 2;
			isDead = true;
		}
		if (head.y + head.rad > world.height - wallCollisionThreshold) {
			score /= 2;
			isDead = true;
		}
		// Main movement:
		head.vx = maximumForwardSpeed * slowdown * Math.cos(angle);
		head.vy = maximumForwardSpeed * slowdown * Math.sin(angle);

		PhysicalCircle previous = head;
		for (int i = 0; i < snakeSegments.size(); i++) {
			PhysicalCircle c = snakeSegments.get(i);
			if (snakeInertia){
				c.followBouncy(previous);
			} else {
				c.followStatic(previous);
			}
			
			c.updatePosition();
			for (int j = 0; j < i; j++) {
				c.collideStatic(snakeSegments.get(j));
			}
			previous = c;
			if (i > 1 && head.isColliding(c, 0)) {
				isDead = true;
				score /= 2;
				break;
			}
		}
		// Check eaten nibbles:
		LinkedList<PhysicalCircle> nibblesToRemove = new LinkedList<PhysicalCircle>();
		int nibbleEatCount = 0;
		for (PhysicalCircle nibble : world.getNibbles()) {
			if (head.isColliding(nibble, -10)) {
				score += world.calcValue(nibble);
				snakeSegments.add(new PhysicalCircle(snakeSegments.get(snakeSegments.size() - 1).x, snakeSegments.get(snakeSegments.size() - 1).y, nibble.rad));
				nibblesToRemove.add(nibble);
				nibbleEatCount++;
			}
		}
		score += nibbleEatCount * nibblebonus;
		world.newNibble(nibbleEatCount);
		world.removeNibbles(nibblesToRemove);

		// health / hunger:
		health += nibbleEatCount * healthbonus;
		if (health > 3 * healthbonus) // saturate
			health = 3 * healthbonus;
		health -= healthdecrement;
		if (health <= 0) {
			isDead = true;
			score /= 2;
		}
		return !isDead;
	}

	public getFitness(): number {
		return this.score + this.health / 4;
	}

	/**
	 * Main calculation
	 * 
	 * @param world
	 *            reference to the world for environment information
	 * @return angle increment to move
	 */
	public double brain(World world) {
		// init input vector:
		Thing input[] = new Thing[FOVDIVISIONS * 2];
		for (int i = 0; i < FOVDIVISIONS * 2; i++)
			input[i] = new Thing();
		// nibbles:
		input = updateVisualInput(input, world.getNibbles(), 2);
		// snake:
		input = updateVisualInput(input, snakeSegments, 1);
		// walls:
		/*
		 * (This should be replaced by a better algorithm) It is basically a
		 * brute force attempt converting the continuous border lines into many
		 * PhysicalCirle objects to apply the same algorithm When someone comes
		 * up with a better algorithm, please let me know :)
		 */
		int step = (int) (maximumSightDistance * Math.sin(fieldOfView / (FOVDIVISIONS * 1d))) / 20;
		LinkedList<PhysicalCircle> walls = new LinkedList<PhysicalCircle>();
		for (int x = 0; x < world.width; x += step) {
			walls.add(new PhysicalCircle(x, 0, 1));
			walls.add(new PhysicalCircle(x, world.height, 1));
		}
		for (int y = 0; y < world.height; y += step) {
			walls.add(new PhysicalCircle(0, y, 1));
			walls.add(new PhysicalCircle(world.width, y, 1));
		}
		input = updateVisualInput(input, walls, 0);

		// convert to input vector for neural net
		double stageA[] = new double[FIRSTSTAGESIZE]; // zeros initialized ;)
		if (isNNSymmetric) {
			for (int i = 0; i < FOVDIVISIONS; i++) {
				stageA[input[i].type * FOVDIVISIONS + i] = Stage.signalMultiplier * (maximumSightDistance - input[i].distance) / maximumSightDistance;
				stageA[FIRSTSTAGESIZE - 1 - (input[i + FOVDIVISIONS].type * FOVDIVISIONS + i)] = Stage.signalMultiplier
						* (maximumSightDistance - input[i + FOVDIVISIONS].distance) / maximumSightDistance;
			}
		} else {
			for (int i = 0; i < FOVDIVISIONS; i++) {
				stageA[input[i].type * FOVDIVISIONS * 2 + i] = Stage.signalMultiplier * (maximumSightDistance - input[i].distance) / maximumSightDistance;
				stageA[input[i + FOVDIVISIONS].type * FOVDIVISIONS * 2 + FOVDIVISIONS * 2 - 1 - i] = Stage.signalMultiplier
						* (maximumSightDistance - input[i + FOVDIVISIONS].distance) / maximumSightDistance;
			}
		}
		double output[] = brainNet.calc(stageA);
		double delta = output[0] - output[1];
		double angleIncrement = 10 * maximumAngularSpeed / Stage.signalMultiplier * delta;
		if (angleIncrement > maximumAngularSpeed)
			angleIncrement = maximumAngularSpeed;
		if (angleIncrement < -maximumAngularSpeed)
			angleIncrement = -maximumAngularSpeed;
		return angleIncrement;
	}

	/**
	 * Function to update input vector Input Vector contains distance and type
	 * of closest objects seen by each visual cell This function replaces those
	 * by "Things" closer to the head of the snake Objects further away or
	 * outside the FOV are ignored
	 * 
	 * @param input
	 *            Array of the current things seen by the snake
	 * @param objects
	 *            List of objects to be checked
	 * @param type
	 *            Thing-Type: 0: Wall, 1: Snake, 2: Nibble
	 * @return Updated input array
	 */
	private Thing[] updateVisualInput(Thing input[], List<PhysicalCircle> objects, int type) {
		PhysicalCircle head = snakeSegments.get(0);
		for (PhysicalCircle n : objects) {
			if (head == n)
				continue;
			double a = DoubleMath.signedDoubleModulo(head.getAngleTo(n) - angle, Math.PI * 2);
			double d = head.getDistanceTo(n);
			if (a >= 0 && a < fieldOfView) {
				if (d < input[(int) (a * FOVDIVISIONS / fieldOfView)].distance) {
					input[(int) (a * FOVDIVISIONS / fieldOfView)].distance = d;
					input[(int) (a * FOVDIVISIONS / fieldOfView)].type = type;
				}
			} else if (a <= 0 && -a < fieldOfView) {
				if (d < input[(int) (-a * FOVDIVISIONS / fieldOfView) + FOVDIVISIONS].distance) {
					input[(int) (-a * FOVDIVISIONS / fieldOfView) + FOVDIVISIONS].distance = d;
					input[(int) (-a * FOVDIVISIONS / fieldOfView) + FOVDIVISIONS].type = type;
				}
			}
		}
		return input;
	}

	/**
	 * Draws the snake to Graphics
	 * 
	 * @param g
	 *            Graphics object to draw to
	 */
	public void draw(Graphics g) {
		// Snake body
		int alpha = (int) deathFade;
		for (int i = 0; i < snakeSegments.size(); i++) {
			Color c = new Color(Color.HSBtoRGB(hue, 1 - (float) i / ((float) snakeSegments.size() + 1f), 1));
			g.setColor(new Color(c.getRed(), c.getGreen(), c.getBlue(), alpha));
			PhysicalCircle p = snakeSegments.get(i);
			g.fillOval((int) (p.x - p.rad), (int) (p.y - p.rad), (int) (2 * p.rad + 1), (int) (2 * p.rad + 1));
		}
		// Cute Eyes. A bit computationally expensive, so can be turned of
		if (displayCuteEyes) {

			PhysicalCircle p = snakeSegments.get(0); // get head
			double dist = p.rad / 2.3;
			double size = p.rad / 3.5;
			g.setColor(new Color(255, 255, 255, alpha));
			g.fillOval((int) (p.x + p.vy * dist / p.getAbsoluteVelocity() - size), (int) (p.y - p.vx * dist / p.getAbsoluteVelocity() - size),
					(int) (size * 2 + 1), (int) (size * 2 + 1));
			g.fillOval((int) (p.x - p.vy * dist / p.getAbsoluteVelocity() - size), (int) (p.y + p.vx * dist / p.getAbsoluteVelocity() - size),
					(int) (size * 2 + 1), (int) (size * 2 + 1));
			size = p.rad / 6;
			g.setColor(new Color(0, 0, 0, alpha));
			g.fillOval((int) (p.x + p.vy * dist / p.getAbsoluteVelocity() - size), (int) (p.y - p.vx * dist / p.getAbsoluteVelocity() - size),
					(int) (size * 2 + 1), (int) (size * 2 + 1));
			g.fillOval((int) (p.x - p.vy * dist / p.getAbsoluteVelocity() - size), (int) (p.y + p.vx * dist / p.getAbsoluteVelocity() - size),
					(int) (size * 2 + 1), (int) (size * 2 + 1));
		}
	}
}