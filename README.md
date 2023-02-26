# isv-node-tools

This repository contains nodejs based tools for performing REST API calls to the IBM Security Verify platform.  The tools are living scripts and are provided as is.

## Pre Requisites 

In order to use the tools we need a system with nodejs installed (minimum version v15.x), you also need at least one IBM Security Verify tenant and a client ID and client Secret with the appropriate permissions (based on what the tool is supposed to do).

The following packages are required:
* axios
* csv-parser
* ldapjs
* objects-to-csv
* tracer

#
- sudo npm install axios  
- sudo npm install tracer --save  
- sudo npm install objects-to-csv  
- sudo npm install csv-parser  
- sudo npm install qs  
- sudo npm install ldapjs  
#
Additional packages may be required in the future as more commands are added.

## Installation

1. Install nodejs
2. Disable any firewalls
3. Install the required packages with npm
4. Download the src directory

## Configuration

1. Create an API Client with the appropriate permissions
2. Create the following configuration file in the parent directory of the src folder

The configuration paramters shown here are the minimal needed, various scripts may need additional paramters as described in the code.

**env.js**

```javascript
module.exports = {
    tenant: {
      ui: 'https://<tenant name>.ice.ibmcloud.com',
      id: '<client id>',
      secret: '<client secret>',
    },
    log: { level: "log" }
  };
  // log levels are log - trace - debug - info - warn - error
```
Note that this enables full tracing, you may want to set trace level to error in production, and/or send trace events to a file.

You should see a folder structure like this:

```
.\node_modules
.\src
.\env.js
```

## Connection test

Use the following to perform a connections test:

```
Martins-MacBook-Pro:csvFeed schmidtm$ node src/test.js 
2021-07-30T08:19:01-0500 <info> test.js:21 (main) start test
2021-07-30T08:19:01-0500 <debug> ISVRequest.js:38 (ISVRequest.init) ISVRequest.init()
2021-07-30T08:19:01-0500 <debug> ISVToken.js:29 (ISVToken.init) 
2021-07-30T08:19:02-0500 <info> ISVToken.js:49 (ISVToken.init) token from https://ppsdemo.ice.ibmcloud.com is - [3iTH73xiM3GMwFoyFQGXKmIC8VVQIQCHL1RGxsav]
Passed TEST  3iTH73xiM3GMwFoyFQGXKmIC8VVQIQCHL1RGxsav
Martins-MacBook-Pro:csvFeed schmidtm$ 
```
On a successfull connection the access token is displayed.  The tool automatically updates tokens as needed if the tool runs as a server or for more then 2 hours.

## Tool use examples

* [ISV Integration with ELK Stack](https://docs.verify.ibm.com/verify/docs/integrating-with-elk-stack)
* [Looking up all users in ISV](https://docs.verify.ibm.com/verify/docs/looking-up-users)
