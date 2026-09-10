import { AvatarBodyPart } from "../AvatarBodyPart";

export class AvatarBody extends AvatarBodyPart {
    constructor(direction: number|null) {
        super('human_bd', direction ?? 1);
    }
}