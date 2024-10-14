import { getRandomDirection } from "./game.ts";
import { createRandomSnakePath } from "./game.ts";
import { Game } from "./game.ts";
import { choseRandomIndexByProbability } from "./utils.ts";

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

function insertIntoUint8Array(
  arr: Uint8Array,
  index: number,
  element: number,
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
  element: number,
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
  private constructor(
    public readonly path: Uint8Array,
    public readonly ages: Uint16Array,
  ) {}

  static createRandom(length: number): Genome {
    return new Genome(
      createRandomSnakePath(length),
      new Uint16Array(length),
    );
  }

  static createAndIncrementAges(path: Uint8Array, ages: Uint16Array): Genome {
    return new Genome(
      path,
      ages.map((age) => age + 1),
    );
  }

  getFitness(game: Game): [number, number] {
    let cellsTravelledUntilDied = 0;

    for (const direction of this.path) {
      cellsTravelledUntilDied++;
      const isSnakeAlive = game.moveSnakeHead(direction);
      if (!isSnakeAlive) return [0, cellsTravelledUntilDied];
    }

    const score = game.getScore();
    if (score === game.food.length) {
      // No food left, the snake has eaten all the food 🚀
      return [Infinity, cellsTravelledUntilDied];
    }

    const [_, distanceToClosestFood] = game.getClosestFood()!;
    const fitness =
      (distanceToClosestFood !== 0 ? 1 / (distanceToClosestFood + 1) : 0) +
      score;

    return [fitness, cellsTravelledUntilDied];
  }

  static mutate(genome: Genome): Genome {
    // there will be 3 types of mutations
    // 1. change a random direction in the path, but consider the ages array. highter age means that the direction is less likely to be changed
    // 2. add a new direction to the path in a random position. The chance of adding a new direction should be higher if the path is shorter. The chance of adding a new direction around the elements with higher age should be lower
    // 3. remove a direction from the path. The chance of removing a direction should be higher if the path is longer. The chance of removing a direction around the elements with higher age should be lower

    let path = new Uint8Array(genome.path);
    let ages = new Uint16Array(genome.ages);

    const getWeightedRandomIndex = () => {
      const totalWeight = ages.reduce(
        (sum, age) => sum + (1 / age),
        0,
      );
      let random = Math.random() * totalWeight;

      for (let i = 0; i < ages.length; i++) {
        random -= 1 / ages[i]!;
        if (random <= 0) {
          return i;
        }
      }
      return ages.length - 1;
    };

    if (Math.random() < 0.3) {
      const index = getWeightedRandomIndex();
      const newDirection = getRandomDirection();
      path[index] = newDirection;
    }

    // const probability = sigmoid(1 / path.length);
    if (Math.random() < 0.8) {
      const index = getWeightedRandomIndex();
      const newDirection = getRandomDirection();
      path = insertIntoUint8Array(path, index, newDirection);
      ages = insertIntoUint16Array(ages, index, 0);
    } else if (path.length > 1 && Math.random() < sigmoid(path.length)) {
      const index = getWeightedRandomIndex();
      path.copyWithin(index, index + 1);
      path = path.slice(0, path.length - 1);

      ages.copyWithin(index, index + 1);
      ages = ages.slice(0, ages.length - 1);
    }

    return new Genome(path, ages);
  }

  static crossover(
    genome1: Genome,
    genome2: Genome,
    genome1Fitness: number,
    genome2Fitness: number,
  ): Genome {
    // crossover should consider the ages array, which means the age of the gene. If the gene is older, it should be less likely to be crossed over.
    // select the gene with the highest fitness to be the base genome
    const [baseGenome, otherGenome] = genome1Fitness > genome2Fitness
      ? [genome1, genome2]
      : [genome2, genome1];

    const path = new Uint8Array(baseGenome.path);

    for (let i = 0; i < path.length; i++) {
      if (Math.random() < 0.3) {
        path[i] = otherGenome.path[i]!;
      }
    }

    return Genome.createAndIncrementAges(
      path,
      new Uint16Array(baseGenome.ages),
    );
  }
}

export function evolveGeneration(
  game: Game,
  generation: Genome[],
): Genome[] {
  const fitnesses = generation
    .map((genome) => genome.getFitness(game.clone()));

  const positiveFitnesses = fitnesses
    .map((fitness, index) => [index, fitness[0]] as const)
    .filter(([_, fitness]) => fitness > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalFitness = positiveFitnesses.reduce(
    (total, [_, fitness]) => total + fitness,
    0,
  );
  const probabilities = positiveFitnesses.map(([_, fitness]) =>
    fitness / totalFitness
  );

  const genomesWithPositiveFitness = positiveFitnesses
    .map(([index, fitness]) => [generation[index]!, fitness] as const);

  const best25 = genomesWithPositiveFitness
    .slice(0, Math.floor(generation.length / 4))
    .map(([genome]) => genome);

  const newGeneration = Array.from(
    { length: generation.length - best25.length },
    () => {
      const [genome1, genome1Fitness] = genomesWithPositiveFitness[
        choseRandomIndexByProbability(genomesWithPositiveFitness, probabilities)
      ]!;
      const [genome2, genome2Fitness] = genomesWithPositiveFitness[
        choseRandomIndexByProbability(genomesWithPositiveFitness, probabilities)
      ]!;
      return Genome.mutate(Genome.crossover(
        genome1,
        genome2,
        genome1Fitness,
        genome2Fitness,
      ));
    },
  );

  return [...best25, ...newGeneration];
}
