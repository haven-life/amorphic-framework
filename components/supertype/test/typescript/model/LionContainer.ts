import { property, supertypeClass } from '../../../dist';
import { Lion } from './Lion';
import { AnimalContainer } from "./AnimalContainer";

@supertypeClass
export class LionContainer extends AnimalContainer {

    @property({getType:() => Lion})
    containee: Lion;
}