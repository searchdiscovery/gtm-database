'use strict';

require('dotenv').config();

const { wait } = require('./helpers/wait');

const functions = require('@google-cloud/functions-framework');
const { BigQuery } = require('@google-cloud/bigquery');

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

  const accountsList = await tagmanager.accounts.list();
  const accounts = accountsList.data.account || [];

  /**
   * 2. Get all the containers for all the accounts.
   */
  const containerRequests = [];

  accounts.forEach(account => {
    containerRequests.push(
      limit(() => tagmanager.accounts.containers.list({ parent: account.path }))
    );
  });
  
  const containersList = await Promise.all(containerRequests);

  const containers = containersList.flatMap(c => c.data.container);

  // console.log(containers);

  /**
   * 3. Get an array of container live versions.
   */

  const versionRequests = [];

  containers.forEach(container => {
    versionRequests.push(
      limit(() => tagmanager.accounts.containers.versions.live({ parent: container.path }))
    );
  });
  
  const versionsList = await Promise.all(versionRequests);

  console.log(versionsList);

  // const versions = versionsList.flatMap(c => c.data.version.container);

  // console.log(versions);

  /**
   * 4. For each live container version, insert the following into respective BQ tables:
   * - Its tags
   * - Its variables
   * - Its builtInVariables
   * - Its triggers
   */


  // BQ request to insert tags

  // BQ request to insert variables

  // BQ request to insert built-in variables

  // BQ request to insert triggers


  // const query = containersList.map(c => {
  //   c.features = JSON.stringify(c.features);
  //   return c;
  // })

  // const tagsQuery = tagsList.map(c => {
  //   c.features = JSON.stringify(c.features);
  //   return c;
  // })

  // const variablesQuery = variablesList.map(c => {
  //   c.features = JSON.stringify(c.features);
  //   return c;
  // })

  /**
   * Sends rows to BigQuery
   */

  // await bqClient
  //   .dataset('test_gtm_upload')
  //   .table('test_gtm_containers')
  //   .insert(query);

  // await bqClient
  // .dataset('test_gtm_upload')
  // .table('test_gtm_tags')
  // .insert(tagsQuery);

  // await bqClient
  // .dataset('test_gtm_upload')
  // .table('test_gtm_variables')
  // .insert(variablesQuery);
  
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

function serializePromises(immediate) {
  // This works as our promise queue
  let last = Promise.resolve();
  return function (...a) {
    // Catch is necessary here — otherwise a rejection in a promise will
    // break the serializer forever
    last = last.catch(() => {}).then(() => immediate(...a));
    return last;
  }
}