import { CanvasRenderer } from "./canvas_renderer.ts";
import type { Genome } from "./evolution.ts";
import { Direction, type Game, getSnakeDeathMoveIndex } from "./game.ts";
import { createEffect, createMemo, createSignal, For, onMount } from "solid-js";

const DirectionName = {
  [Direction.Up]: "Up",
  [Direction.Right]: "Right",
  [Direction.Down]: "Down",
  [Direction.Left]: "Left",
};

const CANVAS_SCALE = 1.5;

export const Playback = (props: {
  genome: Genome;
  initialGame: Game;
  game: Game;
  onGameChange: (game: Game) => void;
  currentMoveIndex: number;
  onCurrentMoveIndexChange: (index: number) => void;
}) => {
  let canvas: HTMLCanvasElement | undefined;
  let renderer: CanvasRenderer | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const [playbackStatus, setIsPlaying] = createSignal<
    "playing" | "paused" | "finished"
  >("paused");
  const deathMoveIndex = createMemo(() =>
    getSnakeDeathMoveIndex(props.genome.path, props.initialGame.clone())
  );

  createEffect(() => {
    const index = props.currentMoveIndex;
    const newGame = props.initialGame.clone();
    for (let i = 0; i <= index; i++) {
      newGame.moveSnakeHead(props.genome.path[i] as Direction);
    }
    renderer?.drawGameFrame(newGame);
    renderer?.drawSnakePath(
      props.initialGame.snake.body[0]!,
      props.genome.path.subarray(0, index + 1),
    );
    props.onGameChange(newGame);
  });

  const handleMoveItemClick = (index: number) => {
    props.onCurrentMoveIndexChange(index);
    const newGame = props.initialGame.clone();
    for (let i = 0; i <= index; i++) {
      newGame.moveSnakeHead(props.genome.path[i] as Direction);
    }
    renderer?.drawGameFrame(newGame);
    renderer?.drawSnakePath(
      props.initialGame.snake.body[0]!,
      props.genome.path.subarray(0, index + 1),
    );
    props.onGameChange(newGame);
  };

  const play = () => {
    const render = () => {
      const index = props.currentMoveIndex;
      const newGame = props.game.clone();
      const isAlive = newGame.moveSnakeHead(
        props.genome.path[index] as Direction,
      );
      renderer?.drawGameFrame(newGame);
      renderer?.drawSnakePath(
        props.initialGame.snake.body[0]!,
        props.genome.path.subarray(0, index + 1),
      );
      props.onGameChange(newGame);
      if (!isAlive) {
        setIsPlaying("finished");
        return;
      }

      if (index < props.genome.path.length) {
        props.onCurrentMoveIndexChange(index + 1);
        timeoutId = setTimeout(render, 100);
      } else {
        setIsPlaying("finished");
      }
    };
    timeoutId = setTimeout(render, 100);
    setIsPlaying("playing");
  };

  const pause = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    setIsPlaying("paused");
  };

  const replay = () => {
    props.onCurrentMoveIndexChange(0);
    renderer?.drawGameFrame(props.initialGame);
    props.onGameChange(props.initialGame.clone());
    play();
  };

  onMount(() => {
    if (!canvas) {
      throw new Error("Canvas not found");
    }
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) {
      throw new Error("Context not found");
    }

    const clientHeight = canvas.clientHeight;
    canvas.height = clientHeight * CANVAS_SCALE;
    canvas.width = clientHeight * CANVAS_SCALE;

    renderer = new CanvasRenderer(ctx, {
      canvasHeight: canvas.height,
      canvasWidth: canvas.width,
      gridHeight: props.initialGame.gridHeight,
      gridWidth: props.initialGame.gridWidth,
    });
    renderer.drawGameFrame(props.game);
  });

  return (
    <div class="flex items-center justify-center">
      <canvas
        style={{
          height: "100vmin",
          width: "100vmin",
        }}
        ref={canvas}
      />

      <div class="h-full flex-col flex">
        <div class="flex p-2 border-b border-stone-200">
          <button
            onClick={() => {
              const status = playbackStatus();
              if (status === "playing") {
                pause();
              } else if (status === "paused") {
                play();
              } else if (status === "finished") {
                replay();
              }
            }}
            data-playing={playbackStatus() ? "" : undefined}
            class="p-2 w-full text-sm cursor-pointer"
          >
            {{
              "playing": "Pause",
              "paused": "Play",
              "finished": "Replay",
            }[playbackStatus()]}
          </button>
        </div>
        <ol class="flex flex-col flex-1 overflow-y-scroll min-w-40 divide-y divide-stone-200 ">
          <For each={Array.from(props.genome.path) as Direction[]}>
            {(direction, index) => (
              <li class="w-full">
                <button
                  data-current-move={props.currentMoveIndex === index()
                    ? ""
                    : undefined}
                  data-death-move={deathMoveIndex() === index()
                    ? ""
                    : undefined}
                  disabled={deathMoveIndex() !== null &&
                    deathMoveIndex()! < index()}
                  class="px-3 py-2 w-full text-sm data-[current-move]:bg-green-200 flex gap-1.5 data-[death-move]:bg-red-200 disabled:opacity-50 cursor-pointer disabled:cursor-default hover:bg-stone-100 disabled:pointer-events-none"
                  onClick={() => handleMoveItemClick(index())}
                >
                  <span class="text-black/50">{index() + 1}</span>
                  {DirectionName[direction]}
                </button>
              </li>
            )}
          </For>
        </ol>
      </div>
    </div>
  );
};
