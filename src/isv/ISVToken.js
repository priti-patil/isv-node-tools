/*************************************************************************************
* IBM Security Expert Labs
* schmidtm@us.ibm.com
*
* A class that gets and manages a CI token for web services
*
* June 2021
*  
*/
// added code for windows to ignore warning may not be needed on ux?
const axios = require('axios');
const https = require('https');
const request = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});
const qs = require('qs');

let log;

module.exports = class ISVToken {
  constructor(logger) {
    this.token = "";
    this.log = logger;
  }

  async init(uri, clientId, clientSecret) {
    this.log.debug();

    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      data: qs.stringify({
        'grant_type': 'client_credentials',
        'client_id': clientId,
        'client_secret': clientSecret
      }),
      url: uri + "/v2.0/endpoint/default/token"
    }

    try {
      let req = await request(options);
      //this.log.trace(req);
      this.token = req.data.access_token;
      this.log.info('token from %s is - [%s]', uri, this.token);
      setTimeout(async () => this.init(uri, clientId, clientSecret), (req.data.expires_in - 5) * 1000);
      //setTimeout(async () => this.init(uri, clientId, clientSecret),  5000);
    } catch (e) {
      this.log.error('ISVToken.init() try catch is ', e);
    }
  }

  get() {
    return this.token;
  }
}
