'use strict';
let Bluebird = require('bluebird');


// intake an express router object, mutate it with custom endpoints, send it back to amorphic to register.
function firstEndpoint(expressRouter) {
    expressRouter.get('/test', testService.bind(this));

    return expressRouter;
}

function secondEndpoint(expressRouter) {
    expressRouter.get('/test-other-endpoint', testService.bind(this));

    return expressRouter;
}

function asyncEndpoint(expressRouter) {
    return Bluebird.delay(500).then(function () {
        expressRouter.get('/async', testService.bind(this))
        return expressRouter;
    });
}

function middlewareTestEndpoint(expressRouter) {
    expressRouter.post('/middleware-endpoint', middlewareTestService.bind(this));
}


function testService(_req, res) {
    res.status(200).send('test API endpoint OK');
}

function middlewareTestService (req, res) {
    if (!req.body) {
        res.status(500).send('Error: no body');
    } else {
        res.status(200).send('test API endpoint OK');
    }
}

module.exports = {
    firstEndpoint: firstEndpoint,
    secondEndpoint: secondEndpoint,
    middlewareTestEndpoint: middlewareTestEndpoint
};