import {Supertype, supertypeClass, property} from '../../../dist/index';
import {Animal} from './Animal';

@supertypeClass
export class Lion extends Animal
{
    @property()
    lionStuff: string = 'roar';
    constructor () {
        super();
        this.name = 'Lion';
        this.legs = 4;
    };
    canRoar () {
        return true;
    }
};