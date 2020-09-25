'use strict';

let express = require('express');
let Bluebird = require('bluebird');


function exampleMiddleware(expressRouter) {
    return Bluebird.delay(500).then(function () {
        expressRouter.use(express.json({
            limit: '10b'
        }));
        return expressRouter;
    })
}

module.exports = {
    exampleMiddleware: exampleMiddleware
};