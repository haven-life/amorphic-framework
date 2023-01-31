import { expect } from 'chai';
import {Amorphic} from '../dist/index.js';
import {Ticket} from "./apps/common/js/ticket";
import {supertypeClass} from "../dist/index";

@supertypeClass({toClient: false, toServer: true})
class Dummy {};

var amorphic = Amorphic.create();
amorphic.connect(__dirname, __dirname);

describe('Banking from pgsql Example', () => {

    it ('passes through @supertypeClass parameters', () => {
        expect(Dummy['__toClient__']).to.equal(false);
        expect(Dummy['__toServer__']).to.equal(true);
    });

    it ('sets it all up', async () => {
        await amorphic.connect(__dirname, __dirname);
        await amorphic.dropAllTables();
        await amorphic.syncAllTables();
    });

    it ('can create a ticket', async () => {
        var ticket = new Ticket("My First Ticket", "This is the beginning of  something good", "Project One");
        ticket.amorphic.beginDefaultTransaction();
        ticket.persistorSave();
        ticket.amorphic.logger.info({className: ticket.amorphic.getClasses().Ticket.amorphicClassName}, 'getting ready to commit');
        await ticket.amorphic.commit();
        expect(ticket.amorphicGetPropertyValues('type')[0]).to.equal('N');
        expect(ticket.amorphicGetPropertyDescriptions('type').P).to.equal('Priority');

    });

    it('can read back the ticket', async () => {
        var tickets : Array<Ticket> = await Ticket.persistorFetchByQuery({}, {fetch: {project: true}})
        expect(tickets.length).to.equal(1);
        expect(tickets[0].project.name).to.equal("Project One");
    });
});