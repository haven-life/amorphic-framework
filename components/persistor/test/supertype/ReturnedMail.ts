import {Supertype, supertypeClass, property, Persistable} from '../../dist/index.js';
import {Address} from './Address.js';

@supertypeClass
export class ReturnedMail extends Persistable(Supertype) {

    @property()
    date: Date;

    @property({getType: ()=> {return Address}})
    address: Address;

    constructor (address, date)
    {
        super();
        this.address = address;
        this.date = date;
        this.setDirty();
    }
}