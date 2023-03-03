'use strict';

require('dotenv').config();

const { wait } = require('./helpers/wait');

const functions = require('@google-cloud/functions-framework');
const { BigQuery } = require('@google-cloud/bigquery');

const fs = require('fs');

const { google } = require('googleapis');
const tagmanager = google.tagmanager('v2');


// @see https://www.npmjs.com/package/p-ratelimit
const { pRateLimit } = require('p-ratelimit');

const limit = pRateLimit({
  interval: 1000,
  rate: .25
})


async function main() {

  // auth constructor
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/tagmanager.readonly'],
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });

  // create auth client
  const authClient = await auth.getClient();

  google.options({
    // All requests made with this object will use these settings unless overridden.
    auth: authClient,
    timeout: 4000
  });

  const bqClient = new BigQuery();

  /**
   * 1. Get a list of all accounts
   * @see https://developers.google.com/tag-platform/tag-manager/api/v2/reference
   */

  // const accountsList = await tagmanager.accounts.list();
  // const accounts = accountsList.data.account || [];

  /**
   * 2. Get all the containers for all the accounts.
   */
  // const containerRequests = [];

  // accounts.forEach(account => {
  //   containerRequests.push(
  //     limit(() => tagmanager.accounts.containers.list({ parent: account.path }))
  //   );
  // });
  
  // const containersList = await Promise.all(containerRequests);

  // const containers = containersList.flatMap(c => c.data.container);

  // console.log(containers);

  /**
   * 3. Get an array of container live versions.
   */

  // const versionRequests = [];

  // containers.forEach(container => {
  //   versionRequests.push(
  //     limit(() => tagmanager.accounts.containers.versions.live({ parent: container.path }))
  //   );
  // });
  
  // const versionsList = await Promise.all(versionRequests);

  // console.log("versionsList: ", versionsList);

  // const versions = versionsList.flatMap(c => c.data.version.container);

  // console.log(versions);

  /**
   * 4. For each live container version, insert the following into respective BQ tables:
   * - Its tags
   * - Its variables
   * - Its builtInVariables
   * - Its triggers
   */
  
  // let tags = [];
  // const variables = []
  // const builtInVariables = []
  // const triggers = []

  // versionsList.forEach(version =>{
  //   tags.push(version.data.tag) // array
  //   variables.push(version.data.variable) // array
  //   builtInVariables.push(version.data.builtInVariable) // array 
  //   triggers.push(version.data.trigger) // array
  // })

  // mocking data so we don't have to wait for API requests to complete
  let tags = require('./data/tags.json');

  // Filter out undefined
  tags = tags.filter(tag => tag);

  // Flatten the array and do some prep
  const tagRecords = tags.flat(2).map(tag => {
    let { accountId, containerId, tagId, name, type, parameter, fingerprint, firingTriggerId = [], blockingTriggerId = [], tagFiringOption, monitoringMetadata } = tag;
    // console.log('parameter before:',parameter)
    parameter = parameter.map(p => {
        // this is some fucked up shit right here
        // return an object that has some value for all properties, not just key/value/type
        let { type, "key":_key = null, value = null, list = [], map = [] } = { ...p };
        return { type, key: _key, value, list, map };
      });
    // console.log('parameter after:',parameter);
    tag = { accountId, containerId, tagId, name, type, parameter, fingerprint, firingTriggerId, blockingTriggerId, tagFiringOption, monitoringMetadata };
    // console.log('prepped tag:',tag);
    return tag;
  });

  console.log('tagRecords:', tagRecords.map(t => t.name));

  // const variableRecords = variables.flat(Infinity)
  // const builtInVariableRecords = builtInVariables.flat(Infinity)
  // const triggerRecords = triggers.flat(Infinity)

  // variableRecords.forEach(record =>{
  //   console.log(record)
  // })
  // console.log( "tagQuery: ", typeof tagQuery[0])
  // console.log("tagQuery: ", typeof tagQuery)
  // console.log("tagQuery: ", typeof tagQuery[0])


  /**
   * Sends rows to BigQuery
   */

  // BQ request to insert containers
  // await bqClient
  //   .dataset('test_gtm_upload')
  //   .table('test_gtm_containers')
  //   .insert(query);

  // BQ request to insert tags
  await bqClient
    .dataset('test_gtm_upload')
    .table('test_gtm_tags')
    .insert(tagRecords);

  // BQ request to insert variables
  // await bqClient
  // .dataset('test_gtm_upload')
  // .table('test_gtm_variables')
  // .insert(variableRecords);

  // BQ request to insert built-in variables

  // await bqClient
  // .dataset('test_gtm_upload')
  // .table('test_gtm_builtInVariables')
  // .insert(builtInVariableRecords);

  // BQ request to insert triggers
  // await bqClient
  // .dataset('test_gtm_upload')
  // .table('test_gtm_triggers')
  // .insert(triggerRecords);
  
  // return query;
  // return tagsQuery;
  // return liveContainers;

}

// do the cloud function!
functions.http('gtmDownloader', async (req, res) => {

  try {
    // run main
    const data = await main();

    res.status(200).send(data);

    // write to BQ tables


  } catch(e) {
    console.error('Something went wrong:',e);
    res.status(500).send(e);
  }
  
});
