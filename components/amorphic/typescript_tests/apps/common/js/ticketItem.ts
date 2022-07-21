import {Supertype, supertypeClass, property, Remoteable, Persistable, Bindable}  from '../../../../dist/index.js';
import {Person} from './person';
import {Ticket} from './ticket';
console.log("Compiling TicketItem");

@supertypeClass
export class TicketItem extends Persistable(Remoteable(Bindable((Supertype)))) {

    // Secure properties can only be set on the server
    @property({getType: ()=>{return Person}})
    creator:            Person; 		//{toServer: false, type: Person, fetch: true},

    @property()
    created:            Date;			//{toServer: false, type: Date},

    @property({getType: ()=>{return Ticket}})
    ticket:             Ticket;			//{toServer: false, type: Ticket},

    // Only called on the server
    constructor (ticket: Ticket, creator? : Person) {
        super()
        this.ticket = ticket;
        this.creator = creator;
        this.created = new Date();
    }

      remove () {
        return this.persistDelete();
    }
};
