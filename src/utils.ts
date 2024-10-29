export class Vector2 {
  constructor(public x: number, public y: number) {}

  static distance(vec1: Vector2, vec2: Vector2): number {
    return Math.abs(vec1.x - vec2.x) + Math.abs(vec1.y - vec2.y);
  }

  static equals(vec1: Vector2, vec2: Vector2): boolean {
    return vec1.x === vec2.x && vec1.y === vec2.y;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
}

export function choseRandomIndexByProbability<
  T extends Array<any> | Uint8Array,
>(
  values: T,
  probabilities: Array<number> | Uint8Array,
): number {
  if (values.length !== probabilities.length) {
    throw new Error("Values and probabilities must be of the same length");
  }
  const randomValue = Math.random();
  let cumulative = 0;
  for (let i = 0; i < values.length; i++) {
    cumulative += probabilities[i]!;
    if (randomValue < cumulative) {
      return i;
    }
  }
  return values.length - 1;
}
