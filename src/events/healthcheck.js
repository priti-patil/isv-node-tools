"use strict";
const config = require("../../env.js");
// added code for windows to ignore warning may not be needed on ux?
const axios = require("axios");
const https = require("https");
const fetch = require("node-fetch");
const ISVRequest = require("../isv/ISVRequest.js");

globalThis.fetch = fetch;
const request = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

const log = require("tracer").colorConsole(config.log);
var req = new ISVRequest();

module.exports = class Healthcheck {
  async getMethod(url, header = {}) {
    let method = "GET";
    log.debug(method, " : ", url);
    var options = {
      url: url,
      method: method,
      headers: Object.assign(header),
    };
    return await request(options);
  }

  async kibanaConnection() {
    try {
      let url = config.elk.kibana;
      await this.getMethod(url, { "kbn-xsrf": "true" });
      log.info("Connected to Kibana")
    } catch (e) {
      log.error("Unable to make connection to the Kibana, terminating the process")
      process.exit()
    }
  }

  async elastcisearchConnection() {
    try {
      let url = config.elk.es;
      await this.getMethod(url);
      log.info("Connected to Elasticsearch")
    } catch (e) {
      log.error("Unable to make connection to the Elasticsearch, terminating the process")
      process.exit()
    }
  }

  async getToken() {
    try {
      await req.init(config);
      if (req.getToken() == "") {
        log.error("Unable to get the access token, terminating the process")
        process.exit()
      }
      log.info("Able to get access token")
    } catch (e) {
      log.error("Unable to get the access token, terminating the process")
      process.exit()
    }
  }

  async healthcheck() {
    try {
      await this.elastcisearchConnection();
      await this.kibanaConnection();
      await this.getToken();
    } catch (e) {
      log.error(e)
    }
  }
};
