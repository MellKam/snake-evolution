import { Game, generateRandomFoodCoordinates, Snake } from "./game.ts";
import { render } from "solid-js/web";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Vector2 } from "./utils.ts";
import "./main.css";
import {
  evolveGeneration,
  GenerationStats,
  Genome,
  getGenerationStats,
} from "./evolution.ts";
import { Playback } from "./Playback.tsx";

const GRID_WIDTH = 24;
const GRID_HEIGHT = 24;

const App = () => {
  const [stats, setStats] = createSignal<GenerationStats[]>([]);
  const [generationIndex, setGenerationIndex] = createSignal(0);
  const [generation, setGeneration] = createSignal(
    Array.from({ length: 500 }, () => Genome.createRandom(2)),
  );

  const initialGame = Game.create(
    GRID_WIDTH,
    GRID_HEIGHT,
    new Snake([new Vector2(0, 0)]),
    generateRandomFoodCoordinates(
      GRID_WIDTH,
      GRID_HEIGHT,
      12,
    ),
  );
  const [game, setGame] = createSignal(initialGame.clone());

  const fitnesses = createMemo(() => {
    return generation().map((genome) => {
      const game = initialGame.clone();
      const fitness = genome.getFitness(game);
      return [fitness, game.cellsTravelled] as const;
    });
  });

  const sortedGenomeIndexes = createMemo(() => {
    const sortedGeneration = generation()
      .map((_, index) => [index, fitnesses()[index]![0]] as const)
      .sort(([_a, genomeAFitness], [_b, genomeBFitness]) => {
        if (genomeAFitness === genomeBFitness) return 0;
        return genomeAFitness > genomeBFitness ? -1 : 1;
      });

    return sortedGeneration.map(([index]) => index);
  });
  const [visibleGenomIndex, setVisibleGenomIndex] = createSignal(
    sortedGenomeIndexes()[0] || 0,
  );

  const bestGenomeFitness = createMemo(() => {
    return generation()[sortedGenomeIndexes()[0]!]!.getFitness(
      initialGame.clone(),
    );
  });

  const [currentMoveIndex, setCurrentMoveIndex] = createSignal(0);
  const [isAutoEvolutionEnabled, setAutoEvolution] = createSignal(false);
  let intervalId: number | undefined;

  createEffect(() => {
    if (isAutoEvolutionEnabled()) {
      intervalId = setInterval(() => {
        handleEvolve();
      }, 64);
    } else {
      clearInterval(intervalId);
    }
  });

  const handleEvolve = () => {
    setGenerationIndex((index) => index + 1);
    const newGeneration = evolveGeneration(initialGame, generation());
    setGeneration(newGeneration);
    const bestGenomeIndex = sortedGenomeIndexes()[0]!;
    setVisibleGenomIndex(bestGenomeIndex);
    const bestGenome = generation()[bestGenomeIndex]!;
    setCurrentMoveIndex(bestGenome.path.length - 1);

    setStats((
      stats,
    ) => [...stats, getGenerationStats(initialGame.clone(), newGeneration)]);
    if (bestGenome.getFitness(initialGame.clone()) === Infinity) {
      clearInterval(intervalId);
      setAutoEvolution(false);
    }
  };

  return (
    <div class="flex h-svh">
      <div class="flex flex-col w-full">
        <div class="flex justify-between p-3 border-b border-stone-200">
          <h1 class="text-lg font-semibold">Generation {generationIndex()}</h1>
          <div class="flex gap-2">
            <Show when={bestGenomeFitness() === Infinity}>
              <button
                class="bg-green-600 cursor-pointer rounded-md py-1 px-3 text-white active:bg-green-700"
                onClick={() => {
                  const csv = [
                    "Generation,MaxFitness,SurvivedCount",
                    ...stats().slice(0, stats().length - 1).map((stat, index) =>
                      `${index},${stat.maxFitness.toFixed(5)},${
                        stat.survivedCount.toFixed(5)
                      }`
                    ),
                  ].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "generation_stats.csv";
                  a.click();
                }}
              >
                Download stats
              </button>
            </Show>
            <button
              onClick={handleEvolve}
              disabled={isAutoEvolutionEnabled() ||
                bestGenomeFitness() === Infinity}
              class="bg-green-600 cursor-pointer rounded-md py-1 px-3 text-white active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Evolve
            </button>
            <button
              class="text-sm bg-stone-200 px-3 rounded-md py-1 cursor-pointer hover:bg-stone-300 font-medium"
              onClick={() => setAutoEvolution((v) => !v)}
            >
              {isAutoEvolutionEnabled() ? "Stop" : "Start"} Auto Evolution
            </button>
          </div>
        </div>

        <ol class="flex flex-col divide-y divide-stone-200 h-full overflow-y-scroll">
          <For each={sortedGenomeIndexes()}>
            {(index) => (
              <li>
                <button
                  onClick={() => setVisibleGenomIndex(index)}
                  class="flex flex-col px-3 py-1.5 hover:bg-stone-100 cursor-pointer w-full data-[active]:bg-green-200"
                  data-active={index === visibleGenomIndex() ? "" : undefined}
                >
                  <span class="text-sm font-medium">Genome {index + 1}</span>
                  <span class="text-sm">
                    Fitness: {fitnesses()[index]![0].toFixed(8)}
                  </span>
                  <span class="text-sm">Moves: {fitnesses()[index]![1]}</span>
                </button>
              </li>
            )}
          </For>
        </ol>
      </div>
      <Playback
        genome={generation()[visibleGenomIndex()]!}
        game={game()}
        onGameChange={setGame}
        initialGame={initialGame}
        currentMoveIndex={currentMoveIndex()}
        onCurrentMoveIndexChange={setCurrentMoveIndex}
      />
    </div>
  );
};

render(
  App,
  document.getElementById("root")!,
);
