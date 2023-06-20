'use strict';

// intake an express router object, mutate it with custom endpoints, send it back to amorphic to register.
export function firstEndpoint(expressRouter) {
    expressRouter.get('/test', testService.bind(this));

    return expressRouter;
}

export function secondEndpoint(expressRouter) {
    expressRouter.get('/test-other-endpoint', testService.bind(this));

    return expressRouter;
}

export function middlewareTestEndpoint(expressRouter) {
    expressRouter.post('/middleware-endpoint', middlewareTestService.bind(this));
}


function testService (_req, res) {
    res.status(200).send('test API endpoint OK');
}

function middlewareTestService (req, res) {
    if (!req.body) {
        res.status(500).send('Error: no body');
    } else {
        res.status(200).send('test API endpoint OK');
    }
}
