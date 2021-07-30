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
  console.log('usage: ', process.argv[0], ' ', process.argv[1], '[time offset]');
  console.log('       A tail based events listener');
  console.log('       time offset: A number of minutes to go back');
  console.log('       The attribute supports the following format:');
  console.log('       <days>:<hours>:<min>');
  console.log('       Examples:');
  console.log('       30              - 30 minutes');
  console.log('       2:              - 2 hours');
  console.log('       3::             - 3 days');
  console.log('       2:6:30          - 2 days 6 hours 30 minutes');
}

// Main Program
async function main() {
  log.info('start');
  stats.start = new Date();
  let uri = "/v1.0/events";

  // Initialize the request must wait for it!
  await req.init(config);

  let run = true;
  // Enable grace full shutdown
  process.on('SIGINT', function() {
    console.log("Caught interrupt signal - shutting down gracefully");
    run = false;
  });

 
  let filter = "?all_events=yes&sort_order=asc&size=1000";
  let filter2 = filter;

  if (process.argv.length == 3) {
    filter2 += '&from='+req.getOffsetTime(process.argv[2]);
  }
 
  while (run) {
    let list = await req.get(uri+filter2, { "Content-Type": "applications/json", "Accept": "application/json"});
  
    //log.trace(list);
    list = list.response.events;

    // check if the list is empty and sleep if needed
    if (list.events.length == 0) {
      log.debug("Pausing - ", stats.found);
      await req.sleep(5000);
    } else {
      stats.found += list.events.length;
      log.trace("Count: ", stats.found);
      // print the event:
      list.events.forEach( function (event, i) {
        var myDate = new Date(event.time);
        console.log("--->>>", event.time, " - ", myDate.toLocaleString());
        console.log(event);
      });
      // update the search filter 
      let t = Number(list.search_after.time);
      t++;
      filter2 = filter + '&from='+t;
    }
  } // end of while
  
  
  stats.end = new Date();
  console.log('Found ', stats.found, ' taking ', req.duration(stats.end - stats.start));
  process.exit();
}

// Main Start
main();
