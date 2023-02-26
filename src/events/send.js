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
const { time } = require('console');
var conf  = require('/Users/naveenkumar/Documents/GitHub/isv-node-tools-ibm/config.js');
const { NotAllowedOnNonLeafError } = require('ldapjs');
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
  try {
  log.info('start');
  stats.start = new Date();
  let uri = "/v1.0/events";

  // Initialize the request must wait for it! 
  await req.init(config);
  await elkReq.init(config);

  //setting up the filter to process 1k events, getting the tombstone's initial value and then appending it to the filter
  let filter = '?all_events=no&sort_order=asc&size=1000'; 
  let ts = JSON.parse(req.getTombstone(config.tombstone.fileName));  
  
  // --------------------------------------------------------------------

  
  let eventTypes = []
  for (const eventType in config.elk.eventTypes) {
      eventTypes.push(eventType)

      // Creating index pattern and importing dashboard 
      await elkReq.createIndexPattern(eventType)

      if (config.elk.eventTypes[eventType].importDashboard){
        await elkReq.importDashboard(eventType)
      }
  }

  
  // Creating event_type filter
  let events = '"' + eventTypes.join('","') + '"'
  let event_filter = "&event_type=" + events
  filter += event_filter
  
  // // Temp
  // ts.last = "1663701393000";
  
  let filter2 = filter + '&from='+ ts.last; 

  // --------------------------------------------------------------------
  
  let run = true;
  // Enable graceful shutdown
  process.on('SIGINT', function() {
    console.log("Caught interrupt signal - shutting down gracefully");
    run = false;
  });

  let backupTimeStamp = Date.now()
  //entering endless loop
  while (run) {
    
    let list = await req.get(uri+filter2, { "Content-Type": "applications/json", "Accept": "application/json"});
    list = list.response.events;
    // check if the list is empty and sleep if needed
    if (list.events.length == 0) {
      log.trace("Pausing for ", conf.sleep_ms, " seconds. Total ", stats.found, " documents found" )
      await req.sleep(conf.sleep_ms);
    } else {


      backupTimeStamp = Number(list.search_after.time);
      backupTimeStamp++;

      let YYYY_MM = new Date(backupTimeStamp).getFullYear() + "." + (Number(new Date(backupTimeStamp).getMonth()) + 1)

      let payload = '';
      list.events.forEach( function (event, i) {
        payload += '{"create":{"_index": "' + "event-" + event.event_type + "-" + YYYY_MM + '", "_id": "' + event.id + '"}}\r\n';  
        payload += JSON.stringify(event) + '\r\n';
      });

      for (let eventType of eventTypes) {
        await elkReq.createMapping(eventType, YYYY_MM)
      }

      // push the data to es
      let res = await elkReq.postEvents(payload); 
      if (res.status == 200) {
        filter2 = filter + '&from='+ backupTimeStamp;  /*filter + '&after="'+list.search_after.time+'","'+list.search_after.id+'"'*/
        ts.last = (list.search_after.time); 
        req.putTombstone(config.tombstone.fileName, ts); 

        stats.found += list.events.length;
      }

      log.trace("Count: ", stats.found);

      // update the search filter 
      
      log.trace("Pausing for ", conf.sleep_ms / 1000, " seconds");
      await req.sleep(conf.sleep_ms);
    }
  }
   // end of while
  stats.end = new Date();
  console.log('Found ', stats.found, ' taking ', req.duration(stats.end - stats.start));
  process.exit();

} catch(e) {
  log.error("Unexpected error occured: ", e);
} finally {
  log.info("Trying to restart the service.")
  process.exit(1);
}
}

// Main Start
main();
