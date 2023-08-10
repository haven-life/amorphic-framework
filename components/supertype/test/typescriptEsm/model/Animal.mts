import { Supertype, supertypeClass, property } from '../../../dist/esm/index.js';
import { Ark } from './Ark.mjs';

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
export class AnimalContainer extends Supertype {
    @property({getType:() => Animal} )
    containee: Animal;
}