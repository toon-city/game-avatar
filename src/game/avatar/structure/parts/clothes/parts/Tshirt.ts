import {Clothe} from '../Clothe';

export class Tshirt extends Clothe {
  constructor(identifier: string = 'tshirt_default', direction?: number) {
    super('tshirt', `${identifier}`, direction ?? 1);
    // No manual position: the texture's own trim metadata places it (see Clothe's class doc).
  }

  // Get the URL of the texture based on the identifier and direction
  protected override get textureUrl(): string {
    return `${this.identifier}_bd_${this.direction}.png`;
  }
}
