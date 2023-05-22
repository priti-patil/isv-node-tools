/*************************************************************************************
* IBM Security Expert Labs
* schmidtm@us.ibm.com
* martin.alvarez@ibm.com
*
* A class that performs requests to the ISV web services
* and it also includes a bunch of helper functions!
*
* March 2021
*
*/
'use strict'
const config = require('./../../env.js');
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
const ISVToken = require('./ISVToken.js');
const fs = require('fs');
const { Resolver } = require('dns');

let token = new ISVToken(log);

module.exports = class ISVRequest {
  constructor() {
  }

  /**
   * Method to create the connection object to be used here.
   * @param {*} conf
   */
  async init(conf) {
    log.debug('ISVRequest.init()');
    this.config = conf;
    await token.init(conf.tenant.ui, conf.tenant.id, conf.tenant.secret);
  }

  async get(url = '/', header = {}) {
    log.debug('(url): ', url);

    const options = {
      timeout: 30000,
      method: 'GET',
      headers: Object.assign({ "authorization": "Bearer " + token.get() }, header),
      url: this.config.tenant.ui + url
    }
    let res = (await request(options));
    return res.data;
  }

  async put(url = '/', data = {}, header = {}) {
    log.debug('(url): ', url);

    const options = {
      method: 'PUT',
      headers: Object.assign({ "authorization": "Bearer " + token.get(), "content-Type": "application/json" }, header),
      url: this.config.tenant.ui + url,
      data: JSON.stringify(data)
    }

    return (await request(options)).data;
  }

  async putScim(url = '/', data = {}, header = {}) {
    log.debug('(url): ', url);
    const options = {
      method: 'PUT',
      headers: Object.assign({ "authorization": "Bearer " + token.get(), "content-Type": "application/scim+json" }, header),
      url: this.config.tenant.ui + url,
      data: JSON.stringify(data)
    }
    return (await request(options)).data;
  }

  async del(url = '/') {
    log.debug('(url): ', url);

    var options = {
      url: this.config.tenant.ui + url,
      method: "DELETE",
      headers: { "authorization": "Bearer " + token.get() },
    }

    return await request(options);
  }

  async patch(url = '/', Inbody, header = {}) {
    log.debug('(url): ', url);
    log.trace('(body):', Inbody)

    var options = {
      url: this.config.tenant.ui + url,
      method: "PATCH",
      headers: Object.assign({ "authorization": "Bearer " + token.get() }, header),
      data: Inbody
    }
    try {
      return await request(options);
    } catch (e) {
      log.debug(e);
    }
    return null;
  }

  async postScim(url = '/', Inbody, header = {}) {
    log.debug('(url): ', url);
    log.trace('(body):', Inbody)

    var options = {
      url: this.config.tenant.ui + url,
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/scim+json", "Accept": "application/scim+json", "authorization": "Bearer " + token.get() }, header),
      data: Inbody
    }

    return await request(options);
  }

  async post(url = '/', Inbody, header = {}) {
    log.debug('(url): ', url);
    log.trace('(body):', Inbody)

    var options = {
      url: this.config.tenant.ui + url,
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json", "authorization": "Bearer " + token.get() }, header),
      data: Inbody
    }

    return await request(options);
  }

  async postFile(url = '/', Inbody, FileName) {
    log.debug('(url): ', url);
    log.trace('(FileName):', FileName)

    Inbody.file = { value: fs.createReadStream(FileName), options: { filename: path.basename(FileName), contentType: 'application/octet-stream' } }
    log.trace('(Inbody):', Inbody)

    var options = {
      uri: this.config.tenant.ui + url,
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "multipart/form-data", "authorization": "Bearer " + token.get() },
      formData: Inbody
    }

    return await request(options);
  }

  /* Beware from here are dragons, all little hepler functions! */
  // A helper function to turn tiks into hh:mm:ss.ms
  duration(tiks) {
    let ms = tiks % 1000;
    let ts = Math.floor(tiks / 1000);

    let hh = Math.floor(ts / 3600);
    let mm = Math.floor((ts % 3600) / 60);
    let ss = (ts % 3600) % 60;

    return ('' + hh + ':' + ('0' + mm).slice(-2) + ':' + ('0' + ss).slice(-2) + '.' + ('000' + ms).slice(-3));
  }

  // authenticate user
  async authUser(id, pwd) {
    log.debug('authUser(id,pwd) (%s,%s)', id, pwd);
    // create the payload
    let body = {
      userName: id,
      password: pwd,
      schemas: ['urn:ietf:params:scim:schemas:ibm:core:2.0:AuthenticateUser']
    }

    try {
      let res = await this.post('/v2.0/Users/authentication', body);
      return res.data;
    } catch (e) {
      log.error('try catch is ', e);
      return null;
    }
  }

  // Return a date string minus the number of days provided
  // Set time to 00, 
  getTimeStamp(offset = 0) {
    log.trace('offset ', offset);
    let d = (new Date((new Date()).getTime() - (1000 * 60 * 60 * 24 * offset)));
    d = (d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + (d.getDate())).slice(-2) + 'T00:00:00Z');
    return d;
  }

  // Pass the token out
  getToken() {
    return token.get();
  }

  // get a list of identity sources
  // Do we need a filter?
  async getIdentitySources() {
    try {
      let cred = await this.get('/v1.0/identitysources', { "Accept": "application/json" });
      return cred;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  }

  // put an identity source
  async putIdentitySource(id, data) {
    log.debug('id: ', id);
    log.debug('data:', data);

    try {
      let res = await this.put('/v1.0/identitysources/' + id, data);
      return res;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  }


  // get a list of users based on filter, if grps is true also return groups
  async getUserbyFilter(filter, grps = false) {
    log.debug('filter: ', filter);

    if (grps) {
      filter += '&includeGroups=true';
    }

    try {
      let list = await this.get('/v2.0/Users?filter=' + filter);
      return list;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  }

  async grouppage(res, stats) {
    stats.page++;
    log.debug('PAGE: ', stats.page);
    let mf;

    // check if filter is empty
    if (res.filter == '') {
      mf = 'meta.created gt \"' + res.block + '\"&sortBy=meta.created&sortOrder=ascending&count=2000';
    } else {
      mf = '((meta.created gt \"' + res.block + '\") and (' + res.filter + '))&sortBy=meta.created&sortOrder=ascending&count=2000';
    }
    let list = await this.getGroupbyFilter(mf);

    // now also check make sure we have some groups or an error
    if (list == null) {
      console.log('Failure in searching!');
      process.exit();
    }
    if (list.totalResults == 0) {
      console.log('No groups found!');
      process.exit();
    }

    // We now check if the list returned is less then 2000!
    if (list.totalResults < 2000) {
      res.more = false;
    } else {
      // We need to find a new starting point!
      // The algorithm goes something like this,
      // compare the n element with the n-1 element.
      // if they are the same pop it
      // if it is different, pop it, and remember the last element stamp!
      while (list.Resources[list.Resources.length - 1].meta.created == list.Resources[list.Resources.length - 2].meta.created) {
        list.Resources.pop();
      }
      // we need to pop one more
      res.block = list.Resources[list.Resources.length - 1].meta.created;
      list.Resources.pop();
    }
    stats.got += list.Resources.length;
    log.debug('Page Count: ', list.Resources.length);
    // combine with the master list
    res.masterlist = [...res.masterlist, ...list.Resources];
    log.trace('masterlist size: ', res.masterlist.length);
  }

  // get all groups by filter
  async getAllGroupbyFilter(filter, stats) {
    let res = {
      filter: filter,
      more: true,
      masterlist: [],
      block: '2000-01-01T00:00:00Z'
    }

    while (res.more) {
      await this.grouppage(res, stats);
    }

    return res.masterlist;
  }

  async userpage(res, stats, grps = false) {
    stats.page++;
    log.debug('PAGE: ', stats.page);
    console.log('Page: ', stats.page);
    let mf;

    // check if filter is empty
    if (res.filter == '') {
      mf = 'meta.created gt \"' + res.block + '\"&sortBy=meta.created&sortOrder=ascending&count=2000';
    } else {
      mf = '((meta.created gt \"' + res.block + '\") and (' + res.filter + '))&sortBy=meta.created&sortOrder=ascending&count=2000';
    }
    let list = await this.getUserbyFilter(mf, grps);

    // now also check make sure we have some groups or an error
    if (list == null) {
      console.log('Failure in searching!');
      process.exit();
    }
    if (list.totalResults == 0) {
      console.log('No users found!');
      process.exit();
    }

    // We now check if the list returned is less then 2000!
    if (list.totalResults < 2000) {
      res.more = false;
    } else {
      // We need to find a new starting point!
      // The algorithm goes something like this,
      // compare the n element with the n-1 element.
      // if they are the same pop it
      // if it is different, pop it, and remember the last element stamp!
      while (list.Resources[list.Resources.length - 1].meta.created == list.Resources[list.Resources.length - 2].meta.created) {
        list.Resources.pop();
      }
      // we need to pop one more
      res.block = list.Resources[list.Resources.length - 1].meta.created;
      list.Resources.pop();
    }
    stats.got += list.Resources.length;
    log.debug('Page Count: ', list.Resources.length);
    // combine with the master list
    res.masterlist = [...res.masterlist, ...list.Resources];
    log.trace('masterlist size: ', res.masterlist.length);
  }

  // get all users by filter
  async getAllUserbyFilter(filter, stats, grps = false) {
    let res = {
      filter: filter,
      more: true,
      masterlist: [],
      block: '2000-01-01T00:00:00Z'
    }

    while (res.more) {
      await this.userpage(res, stats, grps);
    }

    return res.masterlist;
  }

  // get a list of group based on filter
  async getGroupbyFilter(filter) {
    log.debug('filter: ', filter);

    try {
      let list = await this.get('/v2.0/Groups?filter=' + filter);
      return list;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  }

  // get a list of group members by id
  async getGroupMemberbyId(id) {
    log.debug('id: ', id);

    try {
      let list = await this.get('/v2.0/Groups/' + id + "?membershipType=firstLevelUsersAndGroups");
      return list;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  }

  // get a single user by name
  // include groups if set
  async getUserbyName(id, groups = false) {
    log.debug('getUserbyName(id) (%s) (%s)', id, groups);
    let filter = 'username eq "' + id + '"';

    if (groups) {
      filter += '&includeGroups=true';
    }

    let res = await this.getUserbyFilter(filter);

    if ((res == null) || (res.totalResults != 1)) {
      log.warn('did not find a user or to many :', (res?.totalResults || null));
      return (null);
    }
    return (res.Resources[0]);
  }

  // get a single user by id
  async getUserbyId(id) {
    log.debug('getUserbyId(id) (%s)', id);

    try {
      let list = await this.get('/v2.0/Users/' + id);
      return list;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  }

  // get a single group  by name
  async getGroupbyName(id) {
    log.debug('getGroupbyName(id) (%s)', id);

    let res = await this.getGroupbyFilter('displayname eq "' + id + '"');

    if ((res == null) || (res.totalResults != 1)) {
      log.warn('did not find a group or to many :', (res?.totalResults || null));
      return (null);
    }
    return (res.Resources[0]);
  }

  // return true if user exists
  async userExist(id) {
    if ((await this.getUserbyName(id)) == null) {
      return false
    }
    return true
  }

  // get a single group by name
  async getGroupbyName(id) {
    log.debug('getGroupbyName(id) (%s)', id);

    let res = await this.getGroupbyFilter('displayname eq "' + id + '"');

    if ((res == null) || (res.totalResults != 1)) {
      log.warn('did not find a group or to many :', (res?.totalResults || null));
      return (null);
    }
    return (res.Resources[0]);
  }

  // return true if group exists
  async groupExist(id) {
    if ((await this.getGroupbyName(id)) == null) {
      return false
    }
    return true
  }

  // add a group 
  async addGroup(group) {
    log.trace('group:', group);

    try {
      return await this.postScim('/v2.0/Groups', JSON.stringify(group), {});
    } catch (e) {
      // if we already have the group, ignore it.
      // surpress the long error message and just display the short.
      log.info('Failed with ', e.message)
      log.trace('try catch is', e);
      return e.statusCode;
    }
  }

  async modUser(user, skippwdreset = false) {
    log.trace('user:', user);
    try {
      return await this.putScim('/v2.0/Users/' + user.id, user, { 'usershouldnotneedtoresetpassword': skippwdreset });
    } catch (e) {
      // if we already have the user, ignore it.
      // surpress the long error message and just display the short.
      log.info('Failed with ', e.message)
      log.trace('try catch is', e);
      return e.statusCode;
    }
  }

  // add a single user
  async addUser(user, skippwdreset = false) {
    log.trace('user:', user);

    try {
      return await this.postScim('/v2.0/Users', JSON.stringify(user), { 'usershouldnotneedtoresetpassword': skippwdreset });
    } catch (e) {
      // if we already have the user, ignore it.
      // surpress the long error message and just display the short.
      log.info('Failed with ', e.message)
      log.trace('try catch is', e);
      return e.statusCode;
    }
  }

  // delete a user based on the ID
  async delUser(id) {
    log.debug('id: ', id);

    try {
      await this.del('/v2.0/Users/' + id);
      return ('Success');
    } catch (e) {
      log.error('try catch is %s', e);
      return (e);
    }
  }

  // patch a user based on ID
  async updateUser(id, body, skippwdreset = false) {
    log.debug('id: ', id);
    log.debug('body: ', body);

    try {
      return await this.patch('/v2.0/Users/' + id, JSON.stringify(body), { 'usershouldnotneedtoresetpassword': skippwdreset });
    } catch (e) {
      log.info('Failed with ', e.message)
      log.trace('try catch is', e);
      return e.statusCode;
    }
  }

  //patch a group based on ID this was added by Martin Alvarez 
  async updateGroup(id, body) {
    log.debug('id: ', id);
    log.debug('body: ', body);

    try {
      return await this.patch('/v2.0/Groups/' + id, JSON.stringify(body), { "Content-Type": "application/scim+json", "Accept": "application/scim+json" });
    } catch (e) {
      log.info('Failed with ', e.message)
      log.trace('try catch is', e);
      return e.statusCode;

    }
  }
  // Perform a bulk operation
  async bulk(ops) {
    log.debug('count: ', ops.length);

    // create the payload
    let body = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkRequest'],
      Operations: ops
    }

    try {
      return await this.postScim('/v2.0/Bulk', JSON.stringify(body));
    } catch (e) {
      log.error('try catch is %s', e);
      return (e);
    }
  }

  /**
   *  Method that will return all users in a grouop
   * @param {*} id the id of the group you want the members of
   */
  async getAllMemberInGroup(id) {
    log.debug('getAllMemberInGroup(id) (%s)', id);

    try {
      let list = await this.get('/v2.0/Groups/' + id);
      return list;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }

  }


  /**
   * returns all the users in a group (not sure how api returns it, in an array format?)
   * @param {*} id  id of the group you want to retrieve the users from 
   * @returns the users in that group
   */
  async getUsersInGroup(id) {
    log.debug('Getting Users in Group ' + id);

    try {
      let list = await this.get('/v2.0/Users?filter=memberOf eq "' + id + '" ');
      return list;
    } catch (e) {
      log.error('try catch is %s', e);
      return null;
    }
  }

  async sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
  }

  // Parses an time offset string:
  // day:hour:min,  [[<day>:]<hour>:]<min>
  parseOffset(arg) {
    if (arg === undefined) return 0;
    let t = arg.split(":").reverse();

    let os = 60000 * (+t[0] ? t[0] : 0);

    if (t.length > 1) {
      os += (60 * 60000) * (+t[1] ? t[1] : 0);
    }

    if (t.length > 2) {
      os += (24 * 60 * 60000) * (+t[2] ? t[2] : 0);
    }

    return os;
  }


  getTombstone(fileName) {
    try {
      if (!fs.existsSync(fileName)) {
        return {};
      }
      return fs.readFileSync(fileName, 'utf8')
    } catch (err) {
      log.error(err);
      return;
    }
  }

  putTombstone(fileName, tombstone) {
    try {
      fs.writeFileSync(fileName, JSON.stringify(tombstone, null, 2));
      return
    } catch (err) {
      log.error(err);
      return;
    }
  }

  // return micro seconds minus offset
  getOffsetTime(arg) {
    let now = new Date().getTime();
    now -= this.parseOffset(arg);
    return now;
  }
} // end of class

