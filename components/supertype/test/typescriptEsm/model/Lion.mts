import { supertypeClass, property } from '../../../dist/esm/index.js';
import { Animal, AnimalContainer } from './Animal.mjs';

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