import { supertypeClass, property }  from '../../../../dist/esm/index.js';
import { Ticket } from './ticket.js';
import { TicketItem } from './ticketItem.js';

console.log('Compiling TicketItemComment');

@supertypeClass
export class TicketItemComment extends TicketItem { //  extends TicketItem

    @property({rule: ['required']})
    text:               string;

     // Only called on the server
    constructor (ticket: Ticket, text, creator?) {
        super(ticket, creator);
        this.text = text;
    };


     remove () {
         this.persistDelete();
     };
};