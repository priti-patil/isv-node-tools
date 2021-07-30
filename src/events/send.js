/*************************************************************************************
* IBM Security Expert Labs
* schmidtm@us.ibm.com
* martin.alvarez@ibm.com
* Get events
*
* April 2021
*
* https://github.com/IBM-Security/isam-support/blob/master/ci/Events/event.sh
*/
'use strict'
const config = require('../../env.js');
const fs = require('fs');
const log = require('tracer').colorConsole(config.log);
const ISVRequest = require('../isv/ISVRequest.js');
const ELKRequest = require('../isv/ELKRequest.js');
const { elk } = require('../../env.js');
//
let stats = {
  found: 0,
  got: 0,
  start: 0,
  end: 0
}

// Variables we need:
var req = new ISVRequest();
var elkReq = new ELKRequest();

// Display a help message
function help() {
  console.log('usage: ', process.argv[0], ' ', process.argv[1]);
  console.log('       A tool to send events to an ELK stack');
}

// Main Program
async function main() {
  log.info('start');
  stats.start = new Date();
  let uri = "/v1.0/events";

  // Initialize the request must wait for it! 
  await req.init(config);
  await elkReq.init(config);

  //setting up the filter to process 1k events, getting the tombstone's initial value and then appending it to the filter
  let filter = "?all_events=yes&sort_order=asc&size=1000"; 
  let ts = JSON.parse(req.getTombstone(config.tombstone.fileName));  
  let filter2 = filter + '&from='+ ts.last; 
  
  let run = true;
  // Enable graceful shutdown
  process.on('SIGINT', function() {
    console.log("Caught interrupt signal - shutting down gracefully");
    run = false;
  });
  //entering endless loop
  while (run) {
    let list = await req.get(uri+filter2, { "Content-Type": "applications/json", "Accept": "application/json"});
    list = list.response.events;
    // check if the list is empty and sleep if needed
    if (list.events.length == 0) {
      log.debug("Pausing - ", stats.found);
      await req.sleep(5000);
      
    } else {
        stats.found += list.events.length;
        log.trace("Count: ", stats.found);
        let payload = '';
        list.events.forEach( function (event, i) {
            payload += '{"create":{"_index": "' + elk.index + '", "_id": "' + event.id + '"}}\r\n';  
            payload += JSON.stringify(event) + '\r\n';
      });
      
      await elkReq.postEvents(payload); 
      let backupTimeStamp = Number(list.search_after.time);
      backupTimeStamp++;

      // update the search filter 
      filter2 = filter + '&from='+ backupTimeStamp  /*filter + '&after="'+list.search_after.time+'","'+list.search_after.id+'"'*/;
      ts.last = (list.search_after.time); 
      req.putTombstone(config.tombstone.fileName, ts); 
    }
  } // end of while
  
  
  stats.end = new Date();
  console.log('Found ', stats.found, ' taking ', req.duration(stats.end - stats.start));
  process.exit();
}

// Main Start
main();
