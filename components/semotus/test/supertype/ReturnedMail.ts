import {Supertype, supertypeClass, property} from '../../dist/index';
import {Address} from './Address';

@supertypeClass
export class ReturnedMail extends Supertype {

    @property({type: Date})
    date: Date;

    @property({getType: ()=> {return Address}})
    address: Address;

    constructor (address, date)
    {
        super();
        this.address = address;
        this.date = date;
    }
}