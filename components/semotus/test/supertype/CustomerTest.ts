import {supertypeClass, property} from '../../dist/index';
import { Supertype } from '@haventech/supertype';

@supertypeClass
export class CustomerTest extends Supertype{

    public addAddress (lines, city, state, zip) {
        console.log('Test');
    }

    constructor (first, middle, last) {
        super();
        console.log('printing data', first, middle, last);
    }
    @property()
    email: string = '';

    public someMethod() {
        console.log('came here')
    }
}