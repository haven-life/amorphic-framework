import {Supertype, supertypeClass, property} from '../../dist';
import {Ark} from './Ark';

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
