'use strict';

import express from 'express';

export function exampleMiddleware(expressRouter) {
    expressRouter.use(express.json({
        limit: '10b'
    }));

    return expressRouter;
}
