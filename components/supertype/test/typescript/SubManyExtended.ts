import {supertypeClass} from "../../dist";
import {SubMany} from "./SubMany";

@supertypeClass
export class SubManyExtended extends SubMany {
    constructor (name) {
        super(name);
    }
};