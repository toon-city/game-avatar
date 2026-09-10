import { AvatarBodyPart } from "../AvatarBodyPart";

export class AvatarHead extends AvatarBodyPart {
    constructor(direction: number|null) {
        super('human_hd', direction ?? 1);
    }
}