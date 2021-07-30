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
const request = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false 
  })
});
const path = require('path');
const log = require('tracer').colorConsole(config.log);
const fs = require('fs');
const { Resolver } = require('dns');


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


  async post(url = '/', Inbody, header = {}) {
    log.debug('(url): ', url);
    log.trace('(body):', Inbody)

    var options = {
        url: this.config.elk.ui + url, 
        method: "POST",
        headers: Object.assign({"Content-Type": "application/json"}, header),
        data: Inbody
    }

    return await request(options);
  }

  //sendEvents
  async postEvents(eventList) { 
    try {
      let res = await this.post('/_bulk', eventList);
      return res.data;
    } catch (e) {
      log.error('try catch is ', e);    
      process.exit();
      return null;
    }
  }

} // end of class

