import { property } from '../../../../dist/cjs/index.js';
import { Person } from './person';

export type Constructable<BC> = new (...args: any[]) => BC;

export function Created<BC extends Constructable<{}>>(Base: BC) {

     class Mixin extends Base {

        @property()
        created:            Date;

        @property()
        creator:            Person;

    };
    return Mixin;
}
