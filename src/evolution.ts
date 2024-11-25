import type { Direction } from "./game.ts";
import { getRandomDirection } from "./game.ts";
import { getBackwardDirection } from "./game.ts";
import { createRandomSnakePath } from "./game.ts";
import { Game } from "./game.ts";
import { Vector2 } from "./utils.ts";
import { choseRandomIndexByProbability } from "./utils.ts";

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

function insertIntoUint8Array(
	arr: Uint8Array,
	index: number,
	element: number
): Uint8Array {
	if (index < 0 || index > arr.length) {
		throw new RangeError("Index out of bounds");
	}
	const newArr = new Uint8Array(arr.length + 1);

	newArr.set(arr.subarray(0, index), 0);
	newArr[index] = element;
	newArr.set(arr.subarray(index), index + 1);

	return newArr;
}

function insertIntoUint16Array(
	arr: Uint16Array,
	index: number,
	element: number
): Uint16Array {
	if (index < 0 || index > arr.length) {
		throw new RangeError("Index out of bounds");
	}
	const newArr = new Uint16Array(arr.length + 1);

	newArr.set(arr.subarray(0, index), 0);
	newArr[index] = element;
	newArr.set(arr.subarray(index), index + 1);

	return newArr;
}

export class Genome {
	private constructor(public readonly path: Uint8Array) {}

	static createRandom(length: number): Genome {
		return new Genome(createRandomSnakePath(length));
	}

	getFitness(game: Game): number {
		for (let i = 0; i < this.path.length; i++) {
			const direction = this.path[i]! as Direction;
			const prevDirection = i > 0 ? (this.path[i - 1] as Direction) : null;
			if (
				prevDirection !== null &&
				getBackwardDirection(prevDirection) === direction
			) {
				return 0;
			}
			const isAlive = game.moveSnakeHead(direction);
			if (!isAlive) return 0;
		}

		const score = game.getScore();
		if (score === game.food.length) {
			// No food left, the snake has eaten all the food 🚀
			return Infinity;
			// return Math.pow(score, 2.5 + 1 / game.cellsTravelled);
		}

		const [_, distanceToClosestFood] = game.getClosestFood()!;
		const fitness =
			(distanceToClosestFood !== 0 ? 1 / distanceToClosestFood : 0) + score;

		return Math.pow(fitness, 2);
	}

	static mutate(game: Game, genome: Genome): Genome {
		const path = new Uint8Array(genome.path);

		let lastEatenFoodMoveIndex = 0;
		for (let i = 0; i < genome.path.length; i++) {
			const direction = genome.path[i]! as Direction;
			game.moveSnakeHead(direction);
			for (const food of game.food) {
				if (Vector2.equals(game.snake.head, food)) {
					lastEatenFoodMoveIndex = i;
				}
			}
		}

		let pathToMutate = path.slice(lastEatenFoodMoveIndex);
		const totalWeight = pathToMutate.reduce(
			(acc, _direction, index) => acc + index,
			0
		);
		const probabilities = pathToMutate.map((_, index) => index / totalWeight);

		if (Math.random() < 0.3) {
			const index = choseRandomIndexByProbability(pathToMutate, probabilities);
			const newDirection = getRandomDirection();
			pathToMutate[index] = newDirection;
		}
		if (Math.random() < 0.8) {
			const index = choseRandomIndexByProbability(pathToMutate, probabilities);
			const newDirection = getRandomDirection();
			pathToMutate = insertIntoUint8Array(pathToMutate, index, newDirection);
		} else if (pathToMutate.length > 1 && Math.random() < 0.2) {
			const index = choseRandomIndexByProbability(pathToMutate, probabilities);
			pathToMutate.copyWithin(index, index + 1);
			pathToMutate = pathToMutate.slice(0, path.length - 1);
		}

		const result = new Uint8Array(lastEatenFoodMoveIndex + pathToMutate.length);
		result.set(path.slice(0, lastEatenFoodMoveIndex), 0);
		result.set(pathToMutate, lastEatenFoodMoveIndex);
		return new Genome(result);
	}

	static zipCrossover(
		parent1: readonly [Genome, number],
		parent2: readonly [Genome, number]
	): Genome {
		const bestParent = parent1[1] > parent2[1] ? parent1[0] : parent2[0];
		const secondaryParent = parent1[1] > parent2[1] ? parent2[0] : parent1[0];

		const path = new Uint8Array(bestParent.path);
		for (let i = 1; i < path.length; i += 2) {
			path[i] = secondaryParent.path[i]!;
		}

		return new Genome(path);
	}

	static crossover(
		parent1: readonly [Genome, number],
		parent2: readonly [Genome, number]
	): Genome {
		const bestParent = parent1[1] > parent2[1] ? parent1[0] : parent2[0];
		const secondaryParent = parent1[1] > parent2[1] ? parent2[0] : parent1[0];

		const path = new Uint8Array(bestParent.path);
		for (let i = 0; i < path.length; i++) {
			if (Math.random() < 0.3) {
				path[i] = secondaryParent.path[i]!;
			}
		}

		return new Genome(path);
	}
}

export function evolveGeneration(game: Game, generation: Genome[]): Genome[] {
	const fitnesses = generation.map((genome) => genome.getFitness(game.clone()));

	const survivedGenomes = generation.filter(
		(_, index) => fitnesses[index]! > 0
	);
	const positiveFitnesses = fitnesses.filter(
		(_, index) => fitnesses[index]! > 0
	);

	const selectedGenomes = survivedGenomes
		.map((genome, index) => [genome, positiveFitnesses[index]!] as const)
		.sort(([_a, fitnessA], [_b, fitnessB]) => {
			return fitnessB - fitnessA;
		})
		.slice(0, Math.floor(generation.length / 4));

	const totalFitness = selectedGenomes.reduce(
		(total, [_genome, fitness]) => total + fitness,
		0
	);
	const probabilities = selectedGenomes.map(
		(_genome, fitness) => fitness / totalFitness
	);

	const childrends = Array.from({ length: generation.length }, () => {
		const parent1 =
			selectedGenomes[
				choseRandomIndexByProbability(selectedGenomes, probabilities)
			]!;
		const parent2 =
			selectedGenomes[
				choseRandomIndexByProbability(selectedGenomes, probabilities)
			]!;

		return Genome.mutate(game.clone(), Genome.crossover(parent1, parent2));
	});

	return childrends;
}

export interface GenerationStats {
	survivedCount: number;
	maxFitness: number;
}

export function getGenerationStats(
	game: Game,
	generation: Genome[]
): GenerationStats {
	const fitnesses = generation.map((genome) => genome.getFitness(game.clone()));

	const survivedCount = fitnesses.filter((fitness) => fitness > 0).length;
	const maxFitness = Math.max(...fitnesses);

	return { survivedCount, maxFitness };
}
