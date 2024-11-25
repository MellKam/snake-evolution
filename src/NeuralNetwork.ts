class Uint8Matrix2 {
	private constructor(
		public rows: number,
		public columns: number,
		public data: Uint8Array
	) {}

	public static create(rows: number, columns: number) {
		const data = new Uint8Array(rows * columns);
		return new Uint8Matrix2(rows, columns, data);
	}
}

class Layer {
	static SIGNAL_MULTIPLIER = 0.1;

	private constructor(public weights: Uint8Matrix2) {}

	static createRandom(inputSize: number, outputSize: number): Layer {
		const weights = Uint8Matrix2.create(outputSize, inputSize);
		for (let i = 0; i < weights.data.length; i++) {
			weights.data[i] = Math.random();
		}
		return new Layer(weights);
	}

	get outputSize(): number {
		return this.weights.rows;
	}

	get inputSize(): number {
		return this.weights.columns;
	}

	/**
	 * @returns a value between 0 and SIGNAL_MULTIPLIER
	 */
	private static sigmoid(x: number): number {
		return Layer.SIGNAL_MULTIPLIER / (1 + Math.exp(-x / 2));
	}

	/**
	 * Calculates the outputs based on the input values
	 */
	public forward(input: Uint8Array): Uint8Array {
		const output = new Uint8Array(this.outputSize);

		for (let outputIndex = 0; outputIndex < this.weights.rows; outputIndex++) {
			let sum = 0;
			for (
				let inputIndex = 0;
				inputIndex < this.weights.columns - 1;
				inputIndex++
			) {
				sum += this.weights[outputIndex][inputIndex] * input[inputIndex];
			}
			sum +=
				this.weights[outputIndex][this.weights.rows - 1] *
				Layer.SIGNAL_MULTIPLIER;

			output[outputIndex] = Layer.sigmoid(sum);
		}

		return output;
	}
}

export class NeuralNetwork {
	// 48,16,16,2
	constructor(public layers: Layer[]) {}

	static create(layerSizes: number[]) {
		const layers = Array.from({ length: layerSizes.length - 1 }, (_, i) => {
			return Layer.createRandom(layerSizes[i], layerSizes[i + 1]);
		});
		return new NeuralNetwork(layers);
	}

	public forward(input: Uint8Array): Uint8Array {
		return this.layers.reduce((input, layer) => layer.forward(input), input);
	}

	public getTotalWeights(): number {
		return this.layers.reduce(
			(sum, layer) => sum + layer.weights.data.length,
			0
		);
	}
}
