function getGaussianRandom() {
	let u = 0,
		v = 0;
	while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
	while (v === 0) v = Math.random();

	return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class DNA {
	constructor(public data: Uint8Array) {}

	static createRandom(size: number) {
		const data = new Uint8Array(size);

		for (let i = 0; i < size; i++) {
			data[i] = Math.floor(Math.random() * 256);
		}

		return new DNA(data);
	}

	static createEmpty(size: number) {
		const data = new Uint8Array(size);
		return new DNA(data);
	}

	/**
	 * Crossover function which combines this DNA with another DNA object.
	 * Process is done byte-wise and a gaussian noise is added to each byte-value
	 * Bits flip according to mutation probability
	 */
	public crossoverNoise(other: DNA, mutationProbability: number): DNA {
		const swaps = Array.from(
			{ length: Math.floor(this.data.length / 10) },
			() => {
				return Math.floor(Math.random() * this.data.length);
			}
		);
		swaps.push(this.data.length); // save last
		swaps.sort((a, b) => a - b);

		const newDNA = DNA.createEmpty(this.data.length);
		let swapidx = 0;
		let that = true;
		for (let i = 0; i < this.data.length; i++) {
			if (i >= swaps[swapidx]) {
				swapidx++;
				that = !that;
			}
			let d = that ? this.data[i] : other.data[i];
			d += getGaussianRandom() * mutationProbability * 256;
			newDNA.data[i] = d;
		}
		return newDNA;
	}

	/**
	 * Gaussian mutation function
	 */
	public mutateNoise(probability: number, magnitude: number) {
		for (let i = 0; i < this.data.length; i++) {
			if (Math.random() < probability) {
				this.data[i] += getGaussianRandom() * magnitude * 256;
			}
		}
	}

	/**
	 * Crossover function which combines this DNA with another DNA object.
	 * Process is done bit-wise
	 * Bits flip according to mutation probability
	 */
	public crossoverBytewise(other: DNA, mutationProbability: number): DNA {
		const swaps = Array.from(
			{ length: Math.floor(this.data.length / 8) },
			() => {
				return Math.floor(Math.random() * 8 * this.data.length);
			}
		);
		swaps.push(8 * this.data.length); // save last
		swaps.sort((a, b) => a - b);

		const newDNA = DNA.createEmpty(this.data.length);
		let swapidx = 0;
		let that = true;
		for (let i = 0; i < 8 * this.data.length; i++) {
			if (i >= swaps[swapidx]) {
				swapidx++;
				that = !that;
			}
			let bit = that
				? (this.data[i / 8] >> i % 8) & 1
				: (other.data[i / 8] >> i % 8) & 1;
			if (Math.random() < mutationProbability) bit = 1 - bit;
			newDNA.data[i / 8] |= bit << i % 8;
		}
		return newDNA;
	}
}
