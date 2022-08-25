'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var ObjectTemplate = require('@haventech/supertype').default;
var PersistObjectTemplate = require('@haventech/persistor')(ObjectTemplate, null, ObjectTemplate);
var amorphic = require('../../dist/index.js');
var logMessage = require('../../dist/lib/utils/logger').logMessage;
var nconf = require('nconf');

var collections = JSON.parse(fs.readFileSync(__dirname + '/model/schema.json'));
PersistObjectTemplate.setSchema(collections);
PersistObjectTemplate.setDB({}, PersistObjectTemplate.DB_Mongo);

var requires = amorphic.getTemplates(PersistObjectTemplate, __dirname + '/model/',
	['ticket.js', 'person.js', 'person.js', 'project.js'], {appConfig: {}}, null);

var TicketItemComment =  requires.ticket.TicketItemComment;
var TicketItemApproval =  requires.ticket.TicketItemApproval;

var projectSemotus;
var Person = requires.person.Person;
var Project = requires.project.Project;

var db, client;

Person.inject(function personInject() {
    Person.sendEmail = function sendEmail(email, subject) {
        const functionName = sendEmail.name;
        logMessage(2, {
            module: 'ticket',
            function: functionName,
            category: 'request',
            message: email + ' ' + subject
        });
    };
});

var securityPrincipal;

// Utility function to clear a collection via mongo native
function clearCollection(collectionName) {
    var collection = db.collection(collectionName);
    return collection.remove({}, {w:1}).then(function countCollection() {
        return collection.count();
    });
}

var cfg = new nconf.Provider();
cfg.argv().env();
var mongoHost=cfg.get('mongoHost') ? cfg.get('mongoHost') : 'localhost';

describe('Ticket System Test Suite', function () {
    const moduleName = this.title;

    it ('can perform injections', function () {
        PersistObjectTemplate.globalInject(function (obj) {
            obj.getSecurityContext = function () {
                return {principal: securityPrincipal};
            };
        });
    });

    it ('opens the database', function (done) {
        var MongoClient = require('mongodb');
        MongoClient.connect('mongodb://'+mongoHost+':27017/testamorphic').then(function (clientParam) {
            client = clientParam;
            db = client.db();
            PersistObjectTemplate.setDB(db);
            done();
        });
    });
    // Variables global to test
    var semotusId;

    it ('clears the ticket system', function (done) {
        const functionName = this.test.title;
        logMessage(2, {
            module: moduleName,
            function: functionName,
            category: 'request',
            message: 1
        });
        clearCollection('ticket').then(function (count) {
            expect(count).to.equal(0);
            return clearCollection('ticketItem');
        }).then(function (count) {
            expect(count).to.equal(0);
            return clearCollection('attachment');
        }).then(function (count) {
            expect(count).to.equal(0);
            return clearCollection('person');
        }).then(function (count) {
            expect(count).to.equal(0);
            return clearCollection('project');
        }).then(function (count) {
            expect(count).to.equal(0);
            done();
        });
    });

    // Persist them (everything hangs off people so the whole graph gets added

    it('can create stuff', function (done) {
        // People
        var sam = new Person('sam@elsamman.com', 'Sam', 'M', 'Elsamman');
        var karen = new Person('karen@elsamman.com', 'Karen', 'M', 'Burke');

        // Projects
        projectSemotus = new Project('Semotus');
        var projectTravel = new Project('Travel Bears');
        projectSemotus.addRelease('0.1', (new Date('1/1/14')));
        projectSemotus.addRelease('0.2', (new Date('3/1/14')));
        projectSemotus.addRole('manager', karen);
        projectSemotus.addRole('developer', sam);
        projectTravel.addRole('manager', sam);
        projectTravel.addRole('developer', sam);
        projectTravel.addRelease('0.1', (new Date('1/1/14')));

        // Tickets
        securityPrincipal = sam;
        var ticket1 = projectSemotus.addTicket('semotus ticket1', 'Ticket 1');
        var ticket2 = projectSemotus.addTicket(sam, 'semotus ticket2', 'Ticket 2');
        projectTravel.addTicket('travel ticket1', 'Ticket 1');

        securityPrincipal = karen;
        var item = ticket1.addComment('ticket1 item1');
        item.addAttachment('attachment1', 'data1');
        item.addAttachment('attachment2', 'data2');
        ticket1.addApproval();

        // Some negative tests
        var exception = null;
        securityPrincipal = sam;
        try {
            ticket2.addApproval();
        }
        catch (e) {
            exception = e.toString();
        }
        expect (exception).to.equal('only the project manager role can approve a ticket');

        // Save stuff and make sure keys are good

        sam.saveModel().then(function () {
            expect(sam._id.length).to.equal(24);
            return karen.persistSave();
        }.bind(this)).then(function () {
            expect(karen._id.length).to.equal(24);
            return projectSemotus.saveModel();
        }.bind(this)).then(function() {
            expect(projectSemotus._id.length).to.equal(24);
            semotusId = projectSemotus._id;
            return projectTravel.saveModel();
        }.bind(this)).then(function () {
            expect(projectTravel._id.length).to.equal(24);
            done();
        }.bind(this)).catch(function(e) {
            done(e);
        });
    });

    it('can read stuff back', function (done) {
        Project.getFromPersistWithId(semotusId, {
            creator: {
                fetch: true
            },
            tickets: {
                fetch: {
                    ticketItems: {
                        fetch: {
                            attachments: true
                        }
                    }
                },
                roles: {
                    fetch: {
                        person: true
                    }
                }
            }
        }).then(function (project) {
            expect(project.name).to.equal('Semotus');
            expect(project.roles.length).to.equal(2);
            project.roles.sort(function(a, b) {
                a.created - b.created;
            });
            expect(project.roles[0].person.firstName).to.equal('Karen');
            expect(project.roles[1].person.firstName).to.equal('Sam');
            expect(project.creator.firstName).to.equal('Sam');
            project.tickets.sort(function(a, b) {
                a.created - b.created;
            });
            expect(project.tickets[0].title).to.equal('semotus ticket1');
            project.tickets[0].ticketItems.sort(function(a, b) {
                a.created - b.created;
            });
            expect(project.tickets[0].ticketItems[0] instanceof TicketItemComment).to.equal(true);
            expect(project.tickets[0].ticketItems[1] instanceof TicketItemApproval).to.equal(true);
            project.tickets[0].ticketItems[0].attachments.sort(function(a, b) {
                a.created - b.created;
            });
            expect(project.tickets[0].ticketItems[0].attachments[0].name).to.equal('attachment1');
            expect(project.tickets[0].ticketItems[0].attachments[1].name).to.equal('attachment2');
            done();
        }).catch(function(e) {
            done(e);
        });
    });

    var count = 10;
    var batchSize = 5;
    var start = 0;

    it('can add ' + count + ' tickets', function (done) {
        for (var ix = 0; ix < projectSemotus.tickets.length; ++ix) {
            projectSemotus.tickets[ix].remove();
        }
        for (var iy = 0; iy < count; ++iy) {
            projectSemotus.addTicket('Ticket', iy + 1);
        }
        projectSemotus.saveModel().then(function() {
            done();
        });
    });

    it ('can read back ' + batchSize + ' tickets at a time', function (done) {
        this.timeout(50000);
        Project.getFromPersistWithId(semotusId, {
            tickets: {
                limit: batchSize
            }
        }).then(function(project) {
            var processTickets = function (project) {

                for (var ix = 0; ix < project.tickets.length; ++ix) {
                    expect(ix + start + 1).to.equal(project.tickets[ix].description);
                }

                start += batchSize;
                if (start < count) {
                    return project.fetch({
                        tickets: {
                            skip: start,
                            limit: batchSize,
                            fetch: {
                                creator: true
                            }
                        }
                    }).then(function (project) {
                        return processTickets(project);
                    });
                }
                else {
                    done();
                }
            };
            return processTickets(project);
        }).catch(function(e) {
            done(e);
        });
    });

    it ('closes the database', function (done) {
        this.timeout(10000);
        const functionName = this.test.title;
        client.close().then(function () {
            logMessage(2, {
                module: moduleName,
                function: functionName,
                category: 'request',
                message: 'ending ticket test'
            });
            done();
        });
    });
});
