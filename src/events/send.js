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
const log = require('tracer').colorConsole(config.log);
const ISVRequest = require('../isv/ISVRequest.js');
const ELKRequest = require('../isv/ELKRequest.js');
const CheckConnection = require('./healthcheck');

// Stats
let stats = {
  found: 0,
  start: 0,
  end: 0
}

// Variables we need:
var req = new ISVRequest();
var elkReq = new ELKRequest();
var checks = new CheckConnection();

// Main Program
async function main() {
  log.info("start");

  // Heathcheck
  await checks.healthcheck();

  stats.start = new Date();


  // Initialize the request must wait for it!
  await req.init(config);
  await elkReq.init(config);

  // Setting up the filter to process 1k events
  ;

  // Creating event_type filter
  for (const event_type of config.event_types) {

    // Creating index pattern and importing dashboard
    await elkReq.createIndexPattern(event_type);

    // Import dashboards
    await elkReq.importDashboard(event_type);
  }
  let events = '"' + config.event_types.join('","') + '"';
  let event_filter = "&event_type=" + events;

  let uri = "/v1.0/events";
  let filter_config = "?all_events=no&sort_order=asc&size=1000"
  let ts = JSON.parse(req.getTombstone(config.tombstone.fileName));

  filter_config += event_filter;
  let filter = filter_config + "&from=" + ts.last;


  let run = true;

  // Enable graceful shutdown
  process.on("SIGINT", function () {
    console.log("Caught interrupt signal - shutting down gracefully");
    terminate(0)
  });

  let backupTimeStamp = Date.now();

  //entering endless loop
  try {
    while (run) {

      let list = await req.get(uri + filter, {
        "Content-Type": "applications/json",
        Accept: "application/json",
      });
      list = list.response.events;

      // check if the list is empty and sleep if needed
      if (list.events.length == 0) {
        log.trace("Pausing for ", config.sleep_ms / 1000, " seconds. Total ", stats.found, " documents found");
        await req.sleep(ts.sleep_ms);
      } else {
        backupTimeStamp = Number(list.search_after.time);
        backupTimeStamp++;

        let YYYY_MM = new Date(backupTimeStamp).getFullYear() + "." + (Number(new Date(backupTimeStamp).getMonth()) + 1);

        // Generate payload for elasticsearch
        let payload = "";
        list.events.forEach(function (event, i) {
          payload += '{"create":{"_index": "' + "event-" + event.event_type + "-" + YYYY_MM + '", "_id": "' + event.id + '"}}\r\n';
          payload += JSON.stringify(event) + "\r\n";
        });

        for (let event_type of config.event_types) {
          await elkReq.createMapping(event_type, YYYY_MM);
        }

        // push the data to es
        let res = await elkReq.postEvents(payload);
        if (res.status == 200) {
          // update the search filter
          filter = filter_config + "&from=" + backupTimeStamp; /*filter + '&after="'+list.search_after.time+'","'+list.search_after.id+'"'*/

          // upate the timestamp
          ts.last = list.search_after.time;
          req.putTombstone(config.tombstone.fileName, ts);

          stats.found += list.events.length;
        }

        log.info("Pausing for ", config.sleep_ms / 1000, " seconds. Total ", stats.found, " documents found - last", ts.last);
        await req.sleep(config.sleep_ms);
      }
    }
    // end of while
  } catch (e) {
    log.error(e);
  } finally {
    terminate(1)
  }
}


// Main Start
main();


function terminate(error_code) {
  stats.end = new Date();
  log.info("Found ", stats.found, " taking ", req.duration(stats.end - stats.start));
  process.exit(error_code);
}