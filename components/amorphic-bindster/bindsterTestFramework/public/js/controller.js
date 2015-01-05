module.exports.controller = function (objectTemplate, getTemplate) {

    // Include model
    var BaseController = getTemplate('./baseController.js').BaseController;

    var max_count = 5;
    var time_interval = 1000;
    var max_cpu_hog = 500;

    if (typeof(console) == 'undefined') {  // Stupid IE
        consoleLog = [];
        console = {
            log: function (data) {
                consoleLog.push(data);
            }
        };
    }

    if (typeof(__dirname) != 'undefined') {
        var inputFile = __dirname + '/../mocha_input.js';
        var templateFile = __dirname + '/mocha_template.js';
        var outputFile = __dirname + '/../mocha_output.js';
        var testFile = __dirname + '/../mocha_test.js';
    }

    Controller = BaseController.extend("Controller",
        {
            status: {type: String, value: "idle"},
            hasFile: {type: Boolean, value: false},
            output: {type: Array, of: Object, value: []},
            input:  {type: Array, of: Object, value: []},
            uploadedFile: {type: String, value: ""},
            currentIx: {type: Number, value: 0},
            maxIx: {type: Number, value: 0},
            errors: {type: Number, value: 0},

            clientInit: function (sessionExpiration) {
                BaseController.prototype.clientInit.call(this);
                top.bindsterTestFrameworkReady = true;
            },
            play: function () {
                if (this.isPlayable()) {
                    this.clear();
                    this.output = [];
                    this.clear();
                    this.outputSequence = [];
                    with (this) {
                        eval(this.uploadedFile);
                    }
                }
            },
            run: function (input) {
                this.input = input;
                var self = this;
                this.hasFile = false;
                this.currentIx = 0;
                this.maxIx = this.input.length;
                this.errorCount = 0;
                this.errors = 0;
                this.status = 'playing';
                this.interval = setInterval(function () {
                    this.tick();
                }.bind(this), time_interval);
                this.setButtonColor('#3276b1');
                this.deferred = Q.defer();
                return this.deferred.promise;
            },
            tick: function () {
                var startTime = (new Date()).getTime();
                if (this.status == 'playing')
                    for (var ix = this.currentIx; ix < this.maxIx;++ix) {
                        var obj = this.input[ix];

                        // First time round output the command
                        if (this.errorCount == 0) {
                            var msg = obj.type + ": " + obj.key + " " + (obj.value || "") + (obj.sequence || "");
                            if (obj.type == 'get')
                                this.errorMessage = "!!! Timed out !!! " + msg;
                            else {
                                this.write(msg);
                                this.errorMessage = "!!! Timed out !!!"
                            }
                        }

                        // Try and process directive
                        if (!this.processDirective(this.input[ix]))
                        {
                            // Unable to process can we retry?
                            if (this.errorCount++ < max_count)
                                return;    // more retries available repeat
                            else
                            {              // output the error and advance
                                this.write(this.errorMessage);
                                this.currentIx++;
                                this.errors++;
                                this.errorCount = 0;
                                this.refresh();
                                return;
                            }
                        }
                        // Advance
                        this.currentIx++;
                        this.errorCount = 0;
                        if (obj.type != 'get') {
                            this.refresh();
                            return;
                        }
                        if ((new Date()).getTime() > (startTime + max_cpu_hog))
                            return;
                    }
                clearInterval(this.interval);
                this.deferred.resolve(true);
                return this.stop();
            },
            stop: {on: "server", body: function () {
                if (this.status == 'recording' || this.status == 'playing') {
                    fs.writeFileSync(outputFile,"run(\n" + JSON.stringify(this.output).replace(/\},/g, "},\n") + "\n);");
                    this.status = 'idle';
                    this.hasFile = true;
                    this.input = [];
                    return this.setButtonColor('orange');
                }
                return Q(true);
            }},
            record: function () {
                if (this.isRecordable()) {
                    this.status = 'recording';
                    this.output = [];
                    this.clear();
                    this.outputSequence = [];
                    this.hasFile = false;
                    this.setButtonColor('#d2322d');
                }
            },

            isRecording: function () {
                return this.status == 'recording';
            },

            isPlaying: function () {
                return this.status == 'playing';
            },

            isRecordable: function () {
                return this.status == 'idle' || this.status == 'ready';
            },

            isPlayable: function () {
                return this.status == 'ready';
            },

            addOutput: function (type, key, value, sequence)
            {
                if (!this.outputSequence[type + key])
                    this.outputSequence[type + key] = 0;
                sequence = typeof(sequence) != 'undefined' ? sequence : this.outputSequence[type + key]++;

                // eliminate duplicate sets for same sequence
                if (type == 'set') {
                    var jx = this.output.length - 1;
                    while (jx >= 0) {
                        if (this.output[jx].type != 'set')
                            break
                        if (this.output[jx].key == key && this.output[jx].sequence == sequence) {
                            this.output.splice(jx, 1);
                            --jx;
                        }
                        --jx;
                    }
                }

                // eliminate duplicate gets
                if (type == 'get') {
                    if (this.output.length > 0 &&
                        this.output[this.output.length - 1].type == 'set' && this.output[this.output.length - 1].key == key &&
                        this.output[this.output.length - 1].sequence == sequence)
                        return;
                    var jx = this.output.length - 1;
                    while (jx >= 0) {
                        if (this.output[jx].type != 'get')
                            break
                        if (this.output[jx].key == key) {
                            this.output.splice(jx, 1);
                            --jx;
                        }
                        --jx;
                    }
                }
                var obj = {type: type, key: key, value: value, sequence: sequence}

                this.output.push(obj);
                if (this.status == 'recording' && obj.type != 'get')
                    this.write(obj.type + ": " + obj.key + " " + (obj.value || "") + " " + (sequence || ""));
            },

            getData: function (bind, data) {
                if ((this.status == 'recording' || this.status == 'playing') && !bind.match(/^'.*'$/) && bind != '__ver')
                    this.addOutput('get', bind, data);
            },

            setData: function (bind, data) {
                if (this.status == 'recording' || this.status == 'playing')
                    this.addOutput('set', bind, data);
            },
            route: function (route) {
                /*
                 if (this.status == 'recording' || this.status == 'playing')
                 this.addOutput('route', route.__id);
                 */
            },
            event: function (event, data, node) {
                if ((this.status == 'recording' || this.status == 'playing') && event == 'onclick') {
                    this.addOutput('click', data, null, node.bindster.actionSequence);
                }
            },

            render: function () {
            },

            preRender: function () {
                this.outputSequence = [];
            },

            upload: {on: "server", body: function ()
            {
                // Read the file and merge into the template outputting a test file ready for moch

                this.uploadedFile = fs.readFileSync(objectTemplate.reqSession.file).toString();
                this.status = 'ready';
            }},

            onContentRequest: function(request, response, next)
            {
                var file = outputFile;
                try {
                    var stat = fs.statSync(file);
                } catch(e) {
                    response.writeHead(404, {"Content-Type": "text/plain"});
                    response.end(file + " not found");
                    return;
                }
                console.log("streaming " + file + ' length=' + stat.size);
                response.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Content-Length': stat.size});
                var readStream = fs.createReadStream(file);
                readStream.pipe(response);
                readStream.on('end', function () {
                    console.log('done');
                });
            },

            reset: function(){
            },

            processDirective: function (obj)
            {
                switch (obj.type) {
                    case 'get':
                        return this.getValue(obj.key, obj.value, obj.sequence);
                        break;
                    case 'set':
                        return this.setValue(obj.key, obj.value, obj.sequence);
                        break;
                    case 'click':
                        return this.clickValue(obj.key, obj.value, obj.sequence);
                        break;
                    case 'route':
                        return this.routeValue(obj.key, obj.value);
                        break;
                }
            },
            setValue: function (bind, value) {
                if (bind == 'customer.applicationPolicy.insured.person.hasDriversLicense')
                    console.log(bind + " = " + value);
                if (value == 'true' || value == true)
                    value = true;
                else if (value == 'false' || value == false)
                    value = false;
                else
                    value = value + "";
                try {
                    top.bindster.DOMSet({bind: bind, value: value});
                    return true;
                } catch (e) {
                    return false;
                }
            },
            getValue: function (bind, value, sequence) {
                try {
                    //var foundValue = top.bindster.DOMGet({bind: bind, sequence: sequence});
                    for (var ix = this.output.length - 1; ix >= 0; --ix)
                        if (this.output[ix].key == bind && this.output[ix].sequence == sequence)
                            if (this.expect(value, this.output[ix].value))
                                return true;
                            else
                                return false;
                    return this.expect(value, foundValue);
                } catch (e) {
                    return false;
                }
            },
            clickValue: function (value, node, sequence) {
                try {
                    top.bindster.DOMClick({action: value, sequence: sequence});
                    return true;
                } catch (e) {
                    return false;
                }
            },
            routeValue: function (route) {
                top.controller.router.goToById(route);
                top.controller.refresh();
                if (!top.controller.router.currentRoute.__id == route) {
                    this.errorMessage = "Can't route to " + route;
                    return false;
                }
                return true;
            },
            expect: function (value1, value2) {
                if ((value1 || "") != (value2 || "")) {
                    this.errorMessage = "Error: " + (value1 || "") + " != " + (value2 || "");
                    return false;
                }
                return true;
            },
            write: function (str) {
                top.document.getElementById('bindsterTestFramework_output').innerText =
                    top.document.getElementById('bindsterTestFramework_output').innerText + str + "\r\n";
            },
            clear: function (str) {
                top.document.getElementById('bindsterTestFramework_output').innerText = "";
            },
            setButtonColor: {on: "client", body: function (color)
            {
                console.log("setting button color to " + color);
                top.document.getElementById('bindsterTestFramework_off').style.backgroundColor = color;
                top.document.getElementById('bindsterTestFramework_on').style.backgroundColor = color;
            }}
        });

    return {Controller: Controller};
};
