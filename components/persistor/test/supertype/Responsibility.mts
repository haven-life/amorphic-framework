import { Supertype, supertypeClass, property, Persistable } from '../../dist/esm/index.js';
import { Employee } from './Employee.mjs';

@supertypeClass
export class Responsibility extends Persistable(Supertype()) {
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