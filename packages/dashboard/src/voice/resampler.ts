// Turns the microphone's sound (usually 48,000 or 44,100 samples a second)
// into the 16,000 the speech model listens at, in frames of a fixed size.
// Plain code with nothing outside it: the microphone also copies it into its
// audio worklet as text, where nothing can be imported (so no class fields,
// which a build may rewrite with a helper).

export class Resampler {
  frameSize: number;
  // How many input samples make one output sample.
  step: number;
  // Where the next output sample falls, counted from the start of the next
  // block (between -1 and 0: between the last block's end and the next start).
  position: number;
  last: number;
  frame: Float32Array;
  filled: number;

  constructor(inputRate: number, outputRate: number, frameSize: number) {
    this.step = inputRate / outputRate;
    this.frameSize = frameSize;
    this.position = 0;
    this.last = 0;
    this.frame = new Float32Array(frameSize);
    this.filled = 0;
  }

  // Takes one block of the microphone's sound; gives back the finished frames.
  feed(block: Float32Array): Float32Array[] {
    const frames: Float32Array[] = [];
    if (block.length === 0) return frames;
    for (; this.position <= block.length - 1; this.position += this.step) {
      const index = Math.floor(this.position);
      const part = this.position - index;
      const before = index < 0 ? this.last : (block[index] as number);
      const after =
        index + 1 < block.length ? (block[index + 1] as number) : before;
      this.frame[this.filled] = before + (after - before) * part;
      this.filled += 1;
      if (this.filled === this.frameSize) {
        frames.push(this.frame);
        this.frame = new Float32Array(this.frameSize);
        this.filled = 0;
      }
    }
    this.last = block[block.length - 1] as number;
    this.position -= block.length;
    return frames;
  }
}
