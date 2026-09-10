import { Clothe } from './structure/parts/clothes/Clothe';
import { Hair } from './structure/parts/clothes/parts/Hair';
import { Hat } from './structure/parts/clothes/parts/Hat';
import { Tshirt } from './structure/parts/clothes/parts/Tshirt';
import { Face } from './structure/parts/clothes/parts/Face';
import { Pant } from './structure/parts/clothes/parts/Pant';

export type ClotheConstructor = new (id: string, direction?: number) => Clothe;

class ClotheRegistry {
  private registry: Map<string, ClotheConstructor> = new Map();

  constructor() {
    // Register default clothe types
    this.register('hair', Hair);
    this.register('hat', Hat);
    this.register('tshirt', Tshirt);
    this.register('face', Face);
    this.register('pant', Pant);
  }

  register(category: string, constructor: ClotheConstructor): void {
    this.registry.set(category, constructor);
  }

  create(category: string, id?: string, direction?: number): Clothe | null {
    const constructor = this.registry.get(category);
    if (!constructor) {
      console.warn(`Unknown clothe category: ${category}`);
      return null;
    }
    
    if (!id) return null;
    try {
      return new constructor(id, direction);
    } catch (error) {
      console.error(`Failed to create clothe ${category}:${id}`, error);
      return null;
    }
  }

  has(category: string): boolean {
    return this.registry.has(category);
  }

  getRegisteredCategories(): string[] {
    return Array.from(this.registry.keys());
  }
}

// Singleton instance
const instance = new ClotheRegistry();
export default instance;