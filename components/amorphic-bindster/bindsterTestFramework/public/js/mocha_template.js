describe("Mochamagix automated testing script", function ()
{
    mocha.setup({ignoreLeaks: true});
    this.timeout(10000);
    var max_count = 3;
    var time_interval = 1000;

        function set(bind, value) {
            it(bind + ' = "' + (value || "") + '" ', function (done) {
                setValue(bind, value, done);
            });
        }
        function get(bind, value) {
            it(bind + ' == "' + (value || "") + '" ', function (done) {
                getValue(bind, value, done);
            });
        }
        function click(event, value) {
            it("Click " + value + " ", function (done) {
                clickValue(value, done);
            });
        }
        function route(route) {
            it("Route " + route + " ", function (done) {
                top.controller.router.goToById(route);
                expect(top.controller.router.currentRoute.__id).to.equal(route);
                done()
            });
        }
        function setValue(bind, value, done, count) {
            if (typeof (count) == 'undefined')
                count = max_count;
            try {
                bindster.DOMSet({bind: bind, value: value});
                done();
            } catch (e) {
                if (count > 0)
                    setTimeout(function () {
                        setValue(bind, value, done, count--);
                    }, time_interval);
                else
                    expect(bind).to.equal('cannot find node with that bind string')
            }
        }
        function getValue(bind, value, done, count) {
            if (typeof (count) == 'undefined')
                count = max_count;
            try {
                expect(bindster.DOMGet({bind: bind}).toString()).to.equal(value || "");
                done();
            } catch (e) {
                if (count > 0)
                    setTimeout(function () {
                        getValue(bind, value, done, count--);
                    }, time_interval);
                else
                    expect(bind).to.equal('cannot find node with that bind string')
            }
        }
console.log("starting mocha script");
        {body}
console.log("ending mocha script");

    });


