import {Supertype, supertypeClass, property} from '../../index';
import {Address} from './Address';

@supertypeClass
export class ReturnedMail extends Supertype {

    @property()
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