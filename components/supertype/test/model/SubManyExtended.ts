import {supertypeClass} from '../../src';
import {SubMany} from './SubMany';

@supertypeClass
export class SubManyExtended  extends SubMany {
    constructor (name) {
        super(name);
    }
};
