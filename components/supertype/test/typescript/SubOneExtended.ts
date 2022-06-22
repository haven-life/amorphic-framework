import { supertypeClass } from '../../dist';
import { SubOne } from './SubOne';

@supertypeClass
export class SubOneExtended extends SubOne {
    constructor (name) {
        super(name);
    }
};