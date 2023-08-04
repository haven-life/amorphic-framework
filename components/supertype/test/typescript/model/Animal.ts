import { Supertype, supertypeClass, property } from '../../../src/index';
import { Ark } from './Ark';

@supertypeClass({toServer: true, toClient: true})
export class Animal extends Supertype
{
    name: string;
    @property()
    isMammal: boolean = true;
    legs: Number = 2;

    hasDNA () {
        return true;
    }
    
    @property({getType: () => {return Ark}})
    ark:    Ark;
};

@supertypeClass
export class AnimalContainer extends Supertype() {
    @property({getType:() => Animal} )
    containee: Animal;
}