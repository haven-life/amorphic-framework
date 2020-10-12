import {property, Supertype, supertypeClass} from '../../src';
import {SubOne} from './SubOne';
import {SubMany} from './SubMany';

@supertypeClass
export class Main extends Supertype {

    @property()
    name: String = '';
    constructor (name) {
        super();
        this.name = name;
    }
    @property({getType: () => {return SubOne}})
    subA: SubOne;
    @property({getType: () => {return SubOne}})
    subB: SubOne;
    @property({getType: () => {return SubMany}})
    subsA: Array<SubMany> = [];
    @property({getType: () => {return SubMany}})
    subsB: Array<SubMany> = [];
    addSubManyA (subMany) {
        subMany.main = this;
        this.subsA.push(subMany);
    }
    addSubManyB (subMany) {
        subMany.main = this;
        this.subsB.push(subMany);
    }
};

