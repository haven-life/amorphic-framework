import { supertypeClass, property } from '../../../src/index';
import { Animal, AnimalContainer } from './Animal';

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

@supertypeClass
export class LionContainer extends AnimalContainer {
    @property({getType:() => Lion})
    containee: Lion;
}