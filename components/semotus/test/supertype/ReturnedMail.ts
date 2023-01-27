import {supertypeClass, Supertype, property} from '../../dist/index';
import {Address} from './Address';
//import { Supertype } from '@haventech/supertype';

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