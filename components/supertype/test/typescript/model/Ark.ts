import {Supertype, supertypeClass, property} from '../../../dist/index';
import {Animal} from './Animal';
import {Lion} from "./Lion";

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
console.log("Foo");
@supertypeClass
export class AnimalContainer extends Supertype {
    @property({getType:() => Animal} )
    containee: Animal;
}

@supertypeClass
export class LionContainer extends AnimalContainer {
    @property({getType:() => Lion})
    containee: Lion;
}
