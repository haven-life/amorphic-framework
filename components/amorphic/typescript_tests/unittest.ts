import { expect } from 'chai';
import {Amorphic} from '../dist/index.js';
import {Ticket} from "./apps/common/js/ticket";
import {supertypeClass} from "../dist/index";
import { Project } from './apps/common/js/project.js';
import { TicketItem } from './apps/common/js/ticketItem.js';

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

    it('create an object copy and save, _id only saved for new objects', async  () => {
        const testProject = new Project('TestProject', 'This is a test of create copy');
        var tx =  testProject.amorphic.beginTransaction();
        testProject.setDirty(tx);
        await testProject.amorphic.commit({transaction: tx, notifyChanges: true});
        //const project = await Project.persistorFetchByQuery({name: 'TestProject'});
        //console.log('Kam project saved!', project);

        const testTicket = new Ticket('FirstTestTicket', 'First test ticket for Test project');
        const firstTicketItem = new TicketItem(testTicket);
        const secondTicketItem = new TicketItem(testTicket);
        testTicket.ticketItems.push(firstTicketItem);
        testTicket.ticketItems.push(secondTicketItem);
        testProject.tickets.push(testTicket);
        testTicket.project = testProject;

        var tx =  testTicket.amorphic.beginTransaction();
        testTicket.setDirty(tx);
        await testTicket.amorphic.commit({transaction: tx, notifyChanges: true});
        const ticket = await Ticket.persistorFetchByQuery({title: 'FirstTestTicket'});

        const clonedTicket = testTicket.createCopy(function(obj, prop, template){
            switch (template.amorphicClassName) {
                case 'Project':
                    return testProject;
            }
            return null;
        });
        
        expect(clonedTicket._id).to.equal(undefined);
        expect(clonedTicket.ticketItems[0]._id).to.equal(undefined);
        expect(clonedTicket.ticketItems[1]._id).to.equal(undefined);
        expect(clonedTicket.ticketItems[0]._id).to.equal(undefined);
        expect(clonedTicket.ticketItems[1]._id).to.equal(undefined);
        expect(clonedTicket._id).to.not.equal(testTicket._id);

        clonedTicket.title = 'ClonedFirstTestTicket';
        var tx =  clonedTicket.amorphic.beginTransaction();
        clonedTicket.setDirty(tx);
        await clonedTicket.amorphic.commit({transaction: tx});
        const clonedSavedTicket: Ticket[] = await Ticket.persistorFetchByQuery({title: 'ClonedFirstTestTicket'});

        expect(clonedSavedTicket.length).to.equal(1);
        expect(clonedSavedTicket[0].ticketItems[0]._id).to.equal(clonedTicket.ticketItems[0]._id);
        expect(clonedSavedTicket[0].ticketItems[1]._id).to.equal(clonedTicket.ticketItems[1]._id);
        expect(clonedSavedTicket[0].ticketItems[0]._id).to.not.equal(clonedSavedTicket[0].ticketItems[1]._id);
        expect(clonedSavedTicket[0].ticketItems[0]._id).to.not.equal(undefined);
        expect(clonedSavedTicket[0].ticketItems[1]._id).to.not.equal(undefined);

        const project: Project[] = await Project.persistorFetchByQuery({name: 'TestProject'});
        expect(project[0]._id).to.equal(testProject._id);
        expect(project[0].tickets[0]._id).to.equal(testTicket?._id);
        expect(project[0].tickets[1]._id).to.equal(clonedTicket?._id);
    });

    it('create an object copy and save, _id saved for all objects', async  () => {
        var testProject = new Project('TestProject', 'This is a test of create copy');
        var firstTicket = new Ticket('FirstTestTicket', 'First test ticket for Test project');
        var secondTicket = new Ticket('SecondTestTicket', 'Second test ticket for Test project');
        testProject.tickets.push(firstTicket);
        testProject.tickets.push(secondTicket);
        firstTicket.project = testProject;
        secondTicket.project = testProject;

        var tx =  testProject.amorphic.beginTransaction();
        testProject.setDirty(tx);
        await testProject.amorphic.commit({transaction: tx, notifyChanges: true});
        const project = await Project.persistorFetchByQuery({name: 'TestProject'});

        const clonedProject = await testProject.createCopy(function(obj, prop, template){
            switch (template.amorphicClassName) {
                case 'Project':
                    return null;
            }
            return null;
        });
        
        expect(clonedProject._id).to.equal(undefined);
        expect(clonedProject?.tickets[0]?._id).to.equal(undefined);
        expect(clonedProject?.tickets[1]?._id).to.equal(undefined);

        clonedProject.name = 'ClonedTestProject';
        var tx =  clonedProject.amorphic.beginTransaction();
        clonedProject.setDirty(tx);
        await clonedProject.amorphic.commit({transaction: tx});
        const clonedSavedTestProject = await Project.persistorFetchByQuery({name: 'ClonedTestProject'});

        expect(clonedSavedTestProject.length).to.equal(1);
        expect(clonedSavedTestProject[0].tickets[0]._id).to.equal(clonedProject?.tickets[0]._id);
        expect(clonedSavedTestProject[0].tickets[1]._id).to.equal(clonedProject?.tickets[1]._id);
        expect(clonedSavedTestProject[0].tickets[0]._id).to.not.equal(clonedSavedTestProject[0].tickets[1]._id);
        expect(project[0]?._id).to.not.equal(testProject[0]?._id);
        expect(project[0]?.tickets[0]?._id).to.not.equal(clonedSavedTestProject[0]?.tickets[0]?._id);
        expect(project[0]?.tickets[0]?._id).to.not.equal(clonedSavedTestProject[0]?.tickets[1]?._id);
        expect(project[0]?.tickets[1]?._id).to.not.equal(clonedSavedTestProject[0]?.tickets[0]?._id);
        expect(project[0]?.tickets[1]?._id).to.not.equal(clonedSavedTestProject[0]?.tickets[1]?._id);
        expect(clonedSavedTestProject[0]?.tickets[0]?._id).to.not.equal(undefined);
        expect(clonedSavedTestProject[0]?.tickets[1]?._id).to.not.equal(undefined);
    });
});