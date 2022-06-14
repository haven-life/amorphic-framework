import {Supertype, supertypeClass, property} from '../../../dist/index';
import { Animal } from './Animal';

@supertypeClass
export class Ark extends Supertype {
    @property({type: Array, getType: () => Animal})
    animals: Array<Animal> = [];

    @property({values: ['s', 'l'], descriptions: {'s': 'small', 'l': 'large'}, type: String})
    size: string = 's'

    board (animal) {
        animal.ark = this;
        this.animals.push(animal);
    }
};
