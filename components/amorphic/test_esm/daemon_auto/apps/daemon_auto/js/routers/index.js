'use strict';

// intake an express router object, mutate it with custom endpoints, send it back to amorphic to register.
export function firstEndpoint(expressRouter) {
    expressRouter.get('/test', testService.bind(this));

    return expressRouter;
}

export function secondEndpoint(expressRouter) {
    expressRouter.get('/test_other_endpoint', testService.bind(this));

    return expressRouter;
}


function testService (_req, res) {
    res.status(200).send('test API endpoint OK');
}