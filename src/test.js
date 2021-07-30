/*************************************************************************************
* IBM Security Expert Labs
* schmidtm@us.ibm.com
*
* Test script, takes the config input and creates the access token
* Jun 2021
*
*/
'use strict'
const config = require('./../env.js');
const log = require('tracer').colorConsole(config.log);
const ISVRequest = require('./isv/ISVRequest.js');
// log levels are log - trace - debug - info - warn - error

// Variables we need:
var req = new ISVRequest();


// Main Program
async function main() {
   log.info('start test');
    // Initialize the request and wait for it !
    await req.init(config);
    
    if (req.getToken() == "") {
      console.log("Failed TEST");
      process.exit(1);
    }

    console.log('Passed TEST ', req.getToken());
    process.exit(0);
}

// Main Start
main();
