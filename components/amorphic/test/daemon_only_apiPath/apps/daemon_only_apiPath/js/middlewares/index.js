'use strict';

let express = require('express');

function exampleMiddleware(expressRouter) {
    expressRouter.use(express.json({
        limit: '10b'
    }));

    return expressRouter;
}

module.exports = {
    exampleMiddleware: exampleMiddleware
};