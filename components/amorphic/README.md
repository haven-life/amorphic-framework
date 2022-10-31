# Amorphic

## Description

Front-to-back isomorphic framework for developing applications with Node.js

## Installation

To install using npm:

    $ npm install amorphic

To get started with a more complex app see the [Amorphic Ticket Demo](https://github.com/selsamman/amorphic-ticket-demo/)

## Usage

Create an `app.js` entry point as follows:

    require('amorphic').listen(__dirname);

Version 11.0.0 introduces a breaking change to the `listen` and `startPersistorMode` signatures. In the past, clients passed
`sendToLog` function to these functions. They also optionally injected their own logger within the `sendToLog` function. 

**Old listen and startPersistorMode signature:**

```
 listen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLog, statsdClient, configStore = null)
 
 startPersistorMode(appDirectory, sendToLog, statsdClient, configStore = null)

```

With this change client would need to pass a `logger` object instead of `sendToLog` function. We require that the new logger object must atleast have basic bunyan log functions such as 'debug', 'error', 'info', 'warn' and also a child logger create function of 'child'. The `sendToLog` function should no longer be used to inject the logger like in the pastas it is being deprecated for external use and is only used internally. 

**New listen and startPersistorMode signature:**

```
 listen(appDirectory, sessionStore, preSessionInject, postSessionInject, logger, statsdClient, configStore = null)
 
 startPersistorMode(appDirectory, logger, statsdClient, configStore = null)

```

If a client chooses to pass an `undefined` instead of `logger` object, then amoprhic would use the built in SuperType Logger to log.

Create a `config.json` file top level at least the following options set:

    {
        "application": "name-of-your-application",
        "applications": {
            "name-of-your-application": "directory-of-your-application"
        }
    }

The directory structure for an amorphic application must be the following:

    /apps - directory of all amorphic applications (can have multiple applications under this directory)
        /your-application - where all your app code lives
        /common - where all the code that is common across your applications lives

Create a `schema.json` file in your application directory which will contain your data schema information for persistor to persist your data to the database.

Note: The `schema.json` file needs at least an opening and a closing curly brace.

Start the application:

    $ node app.js --port <available port>

See this [blog post](http://elsamman.com/?p=117) for more info on Amorphic and this
[video ](http://www.screencast.com/t/Z5Y2jMTmJ) that demos the drpatient sample

## Validation 

The Amorphic server has validation middleware that will validate requests coming into the server based on fields specified in a config.

There are four fields to put in the config.json for the amorphic app. These fields are:

```
    validatorAllowList: characters that are allowed in the request
    validatorDenyList: characters that are not allowed in the request
    validatorLog: boolean for logging whenever a request is denylisted, allowlisted, or has HTML values escaped
    validatorEscapeHTML: boolean for allowing HTML characters to be escaped
```

The allowlist and denylist fields follow the format here: https://www.npmjs.com/package/validator

The allowlist field is especially dangerous to use as it will only allow characters that match the format to pass the validator.

The denylist field also has certain characters that should not be blocked, such as '-', as that will most likely corrupt the amorphic message and cause problems.

The order that this validation is performed is denylist, escape, allowlist.

The config.json found for the amorphic postgres unit test found here: components/amorphic/test/postgres/apps/test/config.json, contains examples of how these fields should be used.

There is also a counter under statsd for 'amorphic.server.validator.allowlist.counter', 'amorphic.server.validator.denylist.counter', and 'amorphic.server.validator.escape.counter' that will count the times requests are denylisted, allowlisted, or escaped.

## Testing

Run all the tests:

    $ npm test

Run a specific test (in this case, daemon test):

    $ npm run test:daemon

## License

Amorphic is licensed under the MIT license

