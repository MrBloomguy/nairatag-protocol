export class SwapKit {
  constructor(options = {}) {
    this.options = options;
  }
}

export function createViemAdapterFromProvider(params) {
  return params?.provider || null;
}

export default {
  SwapKit,
  createViemAdapterFromProvider,
};
