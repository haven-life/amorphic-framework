import { Supertype, supertypeClass, property, Persistable } from '../../dist/esm/index.js';
import { Address } from './Address.mjs';

@supertypeClass()
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