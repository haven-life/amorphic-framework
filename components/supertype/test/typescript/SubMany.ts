import {property, Supertype, supertypeClass} from "../../dist";
import { Main } from './Main';

@supertypeClass
export class SubMany extends Supertype {
    @property({getType: () => {return Main}})
    main: Main;
    @property()
    name: String = '';
    constructor (name) {
        super();
        this.name = name;
    }
};