/*************************************************************************************
* IBM Security Expert Labs
* schmidtm@us.ibm.com
*
* Get events
*
* April 2021
*
* https://github.com/IBM-Security/isam-support/blob/master/ci/Events/event.sh
*/
'use strict'
const config = require('./../../env.js');
const log = require('tracer').colorConsole(config.log);
const ISVRequest = require('./../isv/ISVRequest.js');
//
let stats = {
  found: 0,
  got: 0,
  start: 0,
  end: 0
}

// Variables we need:
var req = new ISVRequest();

// Display a help message
function help() {
  console.log('usage: ', process.argv[0], ' ', process.argv[1], ' [args]');
  console.log('       args based on api description');
}

// Main Program
async function main() {
  log.info('start');
  stats.start = new Date();
  let uri = "/v1.0/events";

  // Initialize the request must wait for it!
  await req.init(config);

  if(process.argv.length == 3) {
    log.debug('args: ', process.argv[2]);
    uri += "?"+process.argv[2];
  }
  
  let list = await req.get(uri, { "Content-Type": "applications/json", "Accept": "application/json"});
  
  // this is weird, events are really nested.
  console.log(list);
  list = list.response.events;

  stats.found = list.events.length
  list.events.forEach( function (event, i) {
    var myDate = new Date(event.time);
    console.log(event.time, " - ", myDate.toLocaleString());
    console.log(JSON.stringify(event));
  })
  stats.end = new Date();
  console.log('Found ', stats.found, ' taking ', req.duration(stats.end - stats.start));
  process.exit();
}

// Main Start
main();
