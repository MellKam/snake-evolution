import { Snake } from "./Snake";
import { World } from "./World";
import { DNA } from "./DNA"

export class GameLoop {
	public static UPDATEPERIOD = 8;
	public per = GameLoop.UPDATEPERIOD;

	// constants:
	public static globalCircleRadius = 20;
	public static numSnakes = 8;
	public static numNibbles = 4;

	// Genetics parameter initialization:
	public mutationrate = 0.02;
	public currentGeneration = 0;

	// world and snakes initialization:
	public world = new World();
	public snakes: Snake[] = [];
	public backupSnakes: Snake[] = []; 

	// Best:
	public bestDna: DNA | null = null;
	public bestscore = 0;

	// Statistics:
	public fitnessTimeline: number[] = [];
	public currentMaxFitness = 0;

	// Mode control:
	public singleSnakeModeActive = false;
	public displayStatisticsActive = false;
	public simulationPaused = false;

	/**
	 * Component with the main loop This should be separated from the graphics,
	 * but I was to lazy.
	 */
	// public GameLoop(KeyboardListener keyb) {
	// 	world.height = 200;
	// 	world.width = 300;
	// 	new Thread(new Runnable() {
	// 		private long simulationLastMillis;
	// 		private long statisticsLastMillis;

	// 		public void run() {
	// 			simulationLastMillis = System.currentTimeMillis() + 100; // initial
	// 																		// wait
	// 																		// for
	// 																		// graphics
	// 																		// to
	// 																		// settle
	// 			statisticsLastMillis = 0;
	// 			while (true) {
	// 				if (System.currentTimeMillis() - simulationLastMillis > UPDATEPERIOD) {
	// 					synchronized (snakes) { // protect read
	// 						long currentTime = System.currentTimeMillis();
	// 						// Controls
	// 						char keyCode = (char) keyb.getKey();
	// 						switch (keyCode) {
	// 						case ' ': // space
	// 							if (!singleSnakeModeActive) {
	// 								singleSnakeModeActive = true;
	// 								displayStatisticsActive = false;
	// 								backupSnakes.clear();
	// 								backupSnakes.addAll(snakes);
	// 								snakes.clear();
	// 								snakes.add(new Snake(bestDna, world));
	// 							}
	// 							break;
	// 						case 'A': // a = pause
	// 							simulationPaused = true;
	// 							break;
	// 						case 'B': // b = resume
	// 							simulationPaused = false;
	// 							break;
	// 						case 'C': // c = show stats
	// 							displayStatisticsActive = true;
	// 							break;
	// 						case 'D': // d = hide stats
	// 							displayStatisticsActive = false;
	// 							break;
	// 						}
	// 						// initilize first generation:
	// 						if (snakes.isEmpty()) {
	// 							firstGeneration(numSnakes);
	// 							world.newNibble(numNibbles);
	// 						}
	// 						// computation:
	// 						if (!simulationPaused) {
	// 							int deadCount = 0;
	// 							world.update(getWidth(), getHeight());
	// 							synchronized (fitnessTimeline) {
	// 								if (world.clock - statisticsLastMillis > 1000 && !singleSnakeModeActive) {
	// 									fitnessTimeline.addLast(currentMaxFitness);
	// 									currentMaxFitness = 0;
	// 									if (fitnessTimeline.size() >= world.width / 2) {
	// 										fitnessTimeline.removeFirst();
	// 									}
	// 									statisticsLastMillis = world.clock;
	// 								}
	// 							}
	// 							for (Snake s : snakes) {
	// 								if (!s.update(world)) {
	// 									deadCount++;
	// 								}
	// 								if (s.getFitness() > currentMaxFitness)
	// 									currentMaxFitness = s.getFitness();
	// 								if (s.getFitness() > bestscore) {
	// 									bestscore = s.getFitness();
	// 									bestDna = s.dna;
	// 								}
	// 							}
	// 							if (deadCount > 0 && singleSnakeModeActive) {
	// 								singleSnakeModeActive = false;
	// 								snakes.clear();
	// 								snakes.addAll(backupSnakes);

	// 							} else {
	// 								// new snakes
	// 								for (int i = 0; i < deadCount; i++) {
	// 									newSnake();
	// 									currentGeneration += 1 / (double) numSnakes;
	// 								}
	// 							}
	// 							Iterator<Snake> it = snakes.iterator();
	// 							while (it.hasNext()) {
	// 								Snake s = it.next();
	// 								if (s.deathFade <= 0) {
	// 									it.remove();
	// 								}
	// 							}
	// 						} else {
	// 							// print status:
	// 							snakes.get(0).brain(world);
	// 						}

	// 						repaint();
	// 						per = System.currentTimeMillis() - currentTime;
	// 						simulationLastMillis += UPDATEPERIOD;
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}).start();
	// }

	/**
	 * initializes snake array with n fresh snakes
	 * 
	 * @param n
	 *            amount of snakes
	 */
	public firstGeneration(n: number) {
		snakes.clear();
		for (int i = 0; i < n; i++) {
			snakes.add(new Snake(null, world));
		}
		world.reset();
	}

	public createMatingPool(): Snake[] {
		let maxFitness = 0;
		for (const snake of this.snakes) {
      const fitness = snake.getFitness();
			if (fitness > maxFitness) {
				maxFitness = fitness;
			}
		}

    const matingpool: Snake[] = [];
		for (const snake of this.snakes) {
			const amount = snake.getFitness() * 100 / maxFitness;
			for (let i = 0; i < amount; i++) {
				matingpool.push(snake);
			}
		}
		return matingpool;
	}

	/**
	 * Creates a new snake using the genetic algorithm and adds it to the
	 * snake-list
	 */
	public newSnake() {
		this.mutationrate = 10 / this.currentMaxFitness;
		const matingpool = this.createMatingPool();
		const idx1 = (Math.random() * matingpool.length);
		const idx2 = (Math.random() * matingpool.length);

		const parentA = matingpool[idx1];
		const parentB = matingpool[idx2];

    const child = new Snake(
      parentA.dna.crossoverBytewise(parentB.dna, this.mutationrate)
    );

		this.snakes.push();
	}

	/**
	 * Show graphics
	 */
	protected void paintComponent(Graphics g) {
		super.paintComponent(g);
		// Background:
		g.setColor(Color.black);
		g.fillRect(0, 0, getWidth(), getHeight());

		// Stats:
		if (displayStatisticsActive) {
			g.setColor(Color.DARK_GRAY);
			g.setFont(new Font("Arial", 0, 64));
			g.drawString("t = " + Long.toString(world.clock / 1000), 20, 105);

			g.drawString("g = " + Integer.toString((int) currentGeneration), 20, 205);
			g.setFont(new Font("Arial", 0, 32));
			g.drawString("Mut. Prob.: " + String.format("%1$,.3f", mutationrate), 20, 305);
			g.drawString("Max fitness: " + Integer.toString((int) currentMaxFitness), 20, 355);

			// print timeline:
			synchronized (fitnessTimeline) {
				if (!fitnessTimeline.isEmpty()) {
					double last = fitnessTimeline.getFirst();
					int x = 0;
					double limit = getHeight();
					if (limit < bestscore)
						limit = bestscore;
					for (Double d : fitnessTimeline) {
						g.setColor(new Color(0, 1, 0, .5f));
						g.drawLine(x, (int) (getHeight() - getHeight() * last / limit), x + 2, (int) (getHeight() - getHeight() * d / limit));
						last = d;
						x += 2;
					}
				}
			}
		}
		// neural net:
		if (singleSnakeModeActive) {
			snakes.getFirst().brainNet.display(g, 0, world.width, world.height);
		}
		// snakes:
		synchronized (snakes) {
			for (Snake s : snakes)
				s.draw(g);
			world.draw(g);
		}
	}

}