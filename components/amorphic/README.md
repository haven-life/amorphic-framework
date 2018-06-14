[![CircleCI](https://circleci.com/gh/haven-life/amorphic.svg?style=shield)](https://circleci.com/gh/haven-life/amorphic)
[![npm version](https://badge.fury.io/js/amorphic.svg)](https://badge.fury.io/js/amorphic)

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

Start the application:

    $ node app.js --port <available port>

See this [blog post](http://elsamman.com/?p=117) for more info on Amorphic and this
[video ](http://www.screencast.com/t/Z5Y2jMTmJ) that demos the drpatient sample

## Testing

Run all the tests:

    $ npm test

Run a specific test (in this case, config test):

    $ npm run test:config

## License

Amorphic is licensed under the MIT license

