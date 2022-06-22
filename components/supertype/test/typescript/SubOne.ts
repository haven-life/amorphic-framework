import { property, Supertype, supertypeClass } from "../../dist";

@supertypeClass
export class SubOne extends Supertype {
    @property()
    name: String = '';
    constructor (name) {
        super();
        this.name = name;
    }
};