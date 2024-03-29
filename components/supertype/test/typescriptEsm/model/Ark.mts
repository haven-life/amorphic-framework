import { Supertype, supertypeClass, property } from '../../../dist/esm/index.js';
import { Animal } from './Animal.mjs';

@supertypeClass
export class Ark extends Supertype
{
    @property({getType: () => Animal})
    animals: Array<Animal> = [];

    @property({values: ['s', 'l'], descriptions: {'s': 'small', 'l': 'large'}})
    size: string = 's'

    board (animal) {
        animal.ark = this;
        this.animals.push(animal);
    }
};