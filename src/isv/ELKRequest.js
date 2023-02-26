/*************************************************************************************
* IBM Security Product Professional Services
* schmidtm@us.ibm.com
* martin.alvarez@ibm.com
*
* March 2021
*
*/
'use strict'
const config = require('../../env.js');
// added code for windows to ignore warning may not be needed on ux?
const axios = require('axios');
const https = require('https');
const fetch =  require('node-fetch');
globalThis.fetch = fetch
const request = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false 
  })
});
const path = require('path');
const log = require('tracer').colorConsole(config.log);
const fs = require('fs');
const { Resolver } = require('dns');
const FormData = require('form-data');
const { debug } = require('console');


module.exports = class ELKRequest {
  constructor() {
  }

  /**
   * Method to create the connection object to be used here.
   * @param {*} conf
   */
  async init(conf) {
    log.debug('ELKRequest.init()');
    this.config = conf;
  }

  async getMethod(url, header = {}) {
    let method = "GET"
    log.debug(method, ' : ', url);
    var options = {
        url: url,
        method: method,
        headers: Object.assign(header),
    }
    return await request(options);
  }

  async postMethod(url, header = {}, body) {
    let method = "POST"
    log.debug(method, ' : ', url);
    var options = {
        url: url,
        method: method,
        headers: Object.assign(header),
        body: body
    }
    return await request(options);
  }


  async call(url, Inbody, header = {}, method = "POST") {
    log.debug(method, ' : ', url);
    // log.trace('(body):', Inbody);

    var options = {
        url: url,
        method: method,
        headers: Object.assign({"Content-Type": "application/json"}, header),
        data: Inbody
    }

    return await request(options);
  }

  // //sendEvents
  // async postEvents(eventList) { 
  //   try {
  //     let res = await this.post('/_bulk', eventList);
  //     return res.data;
  //   } catch (e) {
  //     log.error('try catch is ', e);    
  //     process.exit();
  //     return null;
  //   }
  // }

  // Send Events
  async postEvents(eventList) { 
    try {
      let url = this.config.elk.es + '/_bulk'
      let res = await this.call(url, eventList, {"Content-Type": "application/x-ndjson"});
      return res
    } catch (e) {
      log.error('try catch is ', e);  
    }
  }


  async getMapping(eventType, YYYY_MM) {
    try {
      let url = this.config.elk.es + "/event-" + eventType + '-' + YYYY_MM + '/_mapping';
      await this.getMethod(url, {});
      log.debug("Mapping already exists")
      return true;
    } catch (e) {
      log.error("Mapping does not exists")
      return false
    }
  }


  // Create Mapping
  async createMapping(eventType, YYYY_MM) {
    try {
      let mappingExists = await this.getMapping(eventType, YYYY_MM);
      if (mappingExists) {
        log.debug("Skipping mapping creation")
        return;
      }
      log.debug("Creating mapping")
      const data = fs.readFileSync('./resources/mappings/default-mapping.json', 'utf8');
      let url = this.config.elk.es + "/event-" + eventType + "-" + YYYY_MM;
      let res = await this.call(url, data, {}, "PUT");
      return res.data;
    } catch (e) {
      log.error('try catch is ', e);
    }
  }

  // Create Index Pattern
  async createIndexPattern(eventType) {
    try {
      const data = {
        "override": true,
        "refresh_fields": true,
        "index_pattern": {
           "title": "event-" + eventType + "-*",
           "id": "index-event-" + eventType + "-*",
           "timeFieldName":"time"
        }
      };
      let url = this.config.elk.kibana + "/api/index_patterns/index_pattern";
      let res = await this.call(url, JSON.stringify(data), {"kbn-xsrf": "true"});
      return res.data;
    } catch (e) {
      log.error('try catch is ', e);
    }
  }

  // Import Dashbaord
  async importDashboard(eventType) {
    try {
      var data = new FormData();
      data.append('file', fs.createReadStream('./resources/dashboards/dashboard-' + eventType + '.ndjson'));
      let url = this.config.elk.kibana + "/api/saved_objects/_import?overwrite=true";
      let res = await this.call(url, data, {"kbn-xsrf": "true"});
      return res.data;
    } catch (e) {
      log.error('try catch is ', e);
    }
  }

} // end of class

