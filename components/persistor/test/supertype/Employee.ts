import {Supertype, supertypeClass, property, Persistable} from '../../dist/index';
import {Responsibility} from './Responsibility';

@supertypeClass
export class Employee extends Persistable(Supertype) {
    constructor(firstName, lastName) {
        super();

        this.firstName = firstName;
        this.lastName = lastName;
    }

    @property()
    firstName: string = '';

    @property()
    lastName: string = '';

    @property({getType: () => Responsibility})
    responsibilities:  Array<Responsibility> = [];
}