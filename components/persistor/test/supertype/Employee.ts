import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Responsibility} from './Responsibility';

@supertypeClass({})
export class Employee extends Persistable(Supertype) {
    constructor(firstName, lastName) {
        super();

        this.firstName = firstName;
        this.lastName = lastName;
    }

    @property({type: String})
    firstName: string = '';

    @property({type: String})
    lastName: string = '';

    @property({type: Array, getType: () => Responsibility})
    responsibilities:  Array<Responsibility> = [];
}