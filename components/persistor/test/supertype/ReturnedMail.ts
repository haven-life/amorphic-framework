import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Address} from './Address';

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