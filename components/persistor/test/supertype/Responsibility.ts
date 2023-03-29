import {Supertype, supertypeClass, property, Persistable} from '../../dist/index.js';
import {Employee} from './Employee.js';

@supertypeClass
export class Responsibility extends Persistable(Supertype) {
    constructor(type, details) {
        super();
        this.type = type;
        this.details = details;
        this.setDirty();
    }

    @property()
    type: string = '';

    @property()
    details: string = '';

    @property({getType: () => {return Employee}})
    employee: Employee;
}