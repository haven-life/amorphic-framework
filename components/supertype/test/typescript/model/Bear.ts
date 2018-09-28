import {Supertype, supertypeClass, property} from '../../../dist/index';
import {Animal} from './Animal';

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
