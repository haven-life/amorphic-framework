import {Supertype, supertypeClass, property} from '../../../index';
import {Animal} from './Animal';

@supertypeClass
export class Ark extends Supertype
{
    @property({type: Animal})
    animals: Array<Animal> = [];

    @property({values: ['s', 'l'], descriptions: {'s': 'small', 'l': 'large'}})
    size: string = 's'

    board (animal) {
        animal.ark = this;
        this.animals.push(animal);
    }
};
