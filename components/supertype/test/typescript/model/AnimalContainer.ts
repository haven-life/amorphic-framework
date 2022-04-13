import {property, Supertype, supertypeClass} from "../../../dist";
import {Animal} from "./Animal";

@supertypeClass
export class AnimalContainer extends Supertype {
    @property({getType:() => Animal})
    containee: Animal;
}