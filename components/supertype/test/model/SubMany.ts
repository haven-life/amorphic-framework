import {property, Supertype, supertypeClass} from '../../src';
import {Main} from './Main';

@supertypeClass
export class SubMany extends Supertype {
    @property()
    main: Main;
    @property()
    name: String = '';
    constructor (name) {
        super();
        this.name = name;
    }
};