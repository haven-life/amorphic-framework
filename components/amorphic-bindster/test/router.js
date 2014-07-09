var expect = require('chai').expect;
var Q = require("q");
var router = require('../router.js');
var controller = {
    values: {},
    bindGet: function (bind) {
        return this.values[bind];
    },
    bindSet: function (bind, value) {
        this.values[bind] = value;
    },
    arrive: function () {},
    refresh: function () {}
}

var main = router.route(controller,
{
    enter: function (route) {
        if (route.file) {
            this.page = route.getId();
            this.className = route.className;
        }
    },
    parameters: {                   // how to parse and optionally compose  the search part of the url
        utm_campaign: {bind: "utm_campaign", encode: false},
        utm_keywords: {bind: "utm_keywords", encode: false},
        utm_media:    {bind: "utm_media", encode: false}
    },
    file: 'home.html',
    routes: {
        user: {                         // my default this would be a spec for /user
            file: 'home.html',
            path: '',                  // but we override it to be /
            className: "userStyle",     // an extra property we can just reference it is pushed to child nodes
            enter: function () {this.enteredUser = true;}, // when this route is navigated to
            routes: {  // sub-routes by default each property is a url fragment eg /tickets
                tickets: {file: 'tickets.html'},
                ticket: {
                    file: 'ticket.html',
                    parameters: {ticket: {bind: "ticketId"}}
                },
                profile: {
                    routes: {
                        main: {path: '', file: 'profile.html'},    // /profile/
                        password: {file: 'password.html'},          // /profile/password
                        email: {file: 'email.html'}                 // /profile/email
                    }
                },
                dialog: {
                     exit:  function() {
                         this.popup=null
                     },
                    routes: {
                        login: {
                            nested: true,
                            file: null,
                            enter: function (route, p) {
                                this.popup = 'login.html'
                                expect(p).to.equal(600);
                                expect(route).to.equal(main.user.dialog.login);
                            }
                        },
                        change_password: {file: 'change_password.html'}
                    }
                }
            }
        }
    }
});

describe("Routes", function () {

	it ("Has creates the structure correctly", function (done) {
		expect(main).to.have.property('user');
        expect(main.user).to.have.property('ticket');
        expect(main.user).to.have.property('tickets');
        expect(main.user).to.have.property('profile');
        expect(main.user.profile).to.have.property('main');
        expect(main.user.profile).to.have.property('password');
        expect(main.user.profile).to.have.property('email');
        expect(main.user).to.have.property('dialog');
        expect(main.user.dialog).to.have.property('login');
        expect(main.user.dialog).to.have.property('change_password');
		done();
	});
    it ("Has correct paths", function (done) {
        expect(main.__path).to.equal('/');
        expect(main.user.ticket.__path).to.equal('/ticket');
        expect(main.user.tickets.__path).to.equal('/tickets');
        expect(main.user.profile.main.__path).to.equal('/profile');
        expect(main.user.profile.password.__path).to.equal('/profile/password');
        expect(main.user.profile.email.__path).to.equal('/profile/email');
        expect(main.user.dialog.login.__path).to.equal('/dialog/login');
        expect(main.user.dialog.change_password.__path).to.equal('/dialog/change_password');
        done();
    });
    it ("Has correct functions", function (done) {
        main();
        expect(controller.page).to.equal('user');
        main.user();
        expect(controller.page).to.equal('user');
        main.user.ticket();
        expect(controller.page).to.equal('user.ticket');
        main.user.tickets();
        expect(controller.page).to.equal('user.tickets');
        main.user.profile.main();
        expect(controller.page).to.equal('user.profile.main');
        main.user.profile.password();
        expect(controller.page).to.equal('user.profile.password');
        main.user.profile.email();
        expect(controller.page).to.equal('user.profile.email');
        main.user.dialog.login(600);
        expect(controller.page).to.equal('user.profile.email');
        expect(controller.popup).to.equal('login.html');
        router.popRoute();
        expect(controller.popup).to.equal(null);
        expect(controller.page).to.equal('user.profile.email');
        main.user.dialog.change_password();
        expect(controller.page).to.equal('user.dialog.change_password');
        done();
    });
    it ("Can navigate by path", function (done) {
        router.goTo('/');
        expect(controller.page).to.equal('user');
        router.goTo('/ticket');
        expect(controller.page).to.equal('user.ticket');
        router.goTo('/profile/password');
        expect(controller.page).to.equal('user.profile.password');
        done();
    });
    it ("Can navigate by id", function (done) {
        router.goToById('');
        expect(controller.page).to.equal('user');
        router.goToById('user.ticket');
        expect(controller.page).to.equal('user.ticket');
        router.goToById('user.profile.password');
        expect(controller.page).to.equal('user.profile.password');
        done();
    });
    it("Decodes parameters from search correctly", function (done) {
        router.location.search = "utm_campaign=campaign&utm_keywords=keywords&utm_media=media";
        router.location.pathname = "/";
        router.location.hash = "";
        router._checkURL();
        expect(controller.values.utm_campaign).to.equal('campaign');
        expect(controller.values.utm_media).to.equal('media');
        expect(controller.values.utm_keywords).to.equal('keywords');
        done();
    })
    it("Encodes & decodes parameters properly", function (done) {
        controller.values.ticketId = '123';
        main.user.ticket();
        var pathname = router.location.pathname;
        var hash = router.location.hash;
        main.user.tickets();
        controller.values.ticketId = 'xxx';
        router.location.pathname = pathname;
        router.location.hash = hash;
        router._checkURL();
        expect(controller.values.ticketId).to.equal('123');
        done();
    })
});