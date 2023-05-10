import { supertypeClass, property } from '../../../dist/index.mjs';
import { Animal } from './Animal.mjs';

@supertypeClass
export class Bear extends Animal  {
    @property()
    bearStuff: string = 'maul';
    constructor () {
        super();
        this.name = 'Bear';
    };
    canHug () {
        return true;
    }
}
