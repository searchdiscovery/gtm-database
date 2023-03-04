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

  const MOCK_DATA = true; // change to false to use live API calls

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
  const dataset = bqClient.dataset('test_gtm_upload');

  /**
   * 1. Get a list of all accounts
   * @see https://developers.google.com/tag-platform/tag-manager/api/v2/reference
   */
  const accounts = MOCK_DATA ? [] : await getAccounts();

  /**
   * 2. Get all the containers for all the accounts.
   */
  const containers = MOCK_DATA ? [] : await getContainers(accounts);
  // console.log(containers);

  /**
   * 3. Get an array of container live versions.
   */
  const versions = MOCK_DATA ? require('./data/versions.json') : await getVersions(containers);

  /**
   * 4. For each live container version, insert the following into respective BQ tables:
   * - Its tags
   * - Its variables
   * - Its builtInVariables
   * - Its triggers
   */
  
  const tags = versions.map(version => version.tag).filter(o => o).flat();
  const variables = versions.map(version => version.variable).filter(o => o).flat();
  const builtInVariables = versions.map(version => version.builtInVariable).filter(o => o).flat(2);
  const triggers = versions.map(version => version.trigger).filter(o => o).flat();


  //TODO: explain what's happening here
  const tagRecords = tags.flatMap(tag => {
    let { accountId, containerId, tagId, name, type, parameter, fingerprint, firingTriggerId = [], blockingTriggerId = [], tagFiringOption, monitoringMetadata } = tag;
    parameter = parameter.map(p => {
        // return an object that has some value for all properties, not just key/value/type
        let { type, "key":_key = null, value = null, list = [], map = [] } = { ...p };
        return { type, key: _key, value, list, map };
      });
    return { accountId, containerId, tagId, name, type, parameter, fingerprint, firingTriggerId, blockingTriggerId, tagFiringOption, monitoringMetadata };
  });

  const variableRecords = variables.flatMap(variable => {
    let { accountId, containerId, variableId, name, type, parameter, fingerprint, parentFolderId = null } = variable;
    if (parameter) parameter = parameter.map(p => {
      // return an object that has some value for all properties, not just key/value/type
      let { type, "key":_key = null, value = null, list = [], map = [] } = { ...p };
      return { type, key: _key, value, list, map };
    });
    
    return { accountId, containerId, variableId, name, type, parameter, fingerprint, parentFolderId }
  });

  const builtInVariableRecords = builtInVariables;

  const triggerRecords = triggers.flatMap(trigger => {
    let {
        accountId,
        containerId,
        triggerId,
        name,
        type,
        filter = null,
        customEventFilter = null,
        waitForTags = null,
        checkValidation = null,
        waitForTagsTimeout = null,
        uniqueTriggerId = null,
        fingerprint = null,
        parentFolderId = null,
        formatValue = null,
        parameter = null
      } = trigger;

    if (parameter) parameter = parameter.map(p => {
      // return an object that has some value for all properties, not just key/value/type
      let { type, "key":_key = null, value = null, list = [], map = [] } = { ...p };
      return { type, key: _key, value, list, map };
    });
    
    return { accountId, containerId, triggerId, name, type, filter, customEventFilter, waitForTags, checkValidation, waitForTagsTimeout, uniqueTriggerId, fingerprint, parentFolderId, formatValue, parameter }
  });

  /**
   * Sends rows to BigQuery
   */

  // Insert account rows
  // await dataset.table('test_gtm_accounts').insert(accountRecords);

  // Insert container rows
  // await dataset.table('test_gtm_containers').insert(containerRecords);

  // Insert tag rows
  // await dataset.table('test_gtm_tags').insert(tagRecords);

  // Insert variable rows
  // await dataset.table('test_gtm_variables').insert(variableRecords);

  // BQ request to insert built-in variables
  // await dataset.table('test_gtm_built_in_variables').insert(builtInVariableRecords);

  // BQ request to insert triggers
  await dataset.table('test_gtm_triggers').insert(triggerRecords);
  
  return `${triggerRecords.length} rows successfully inserted.`

}

// do the cloud function!
functions.http('gtmDownloader', async (req, res) => {

  try {
    // run main
    const data = await main();

    res.status(200).send(data);

  } catch(e) {
    console.error('Something went wrong:',e);
    res.status(500).send(e);
  }
  
});

const getAccounts = async () => {

  const accountsList = await tagmanager.accounts.list();
  return accountsList.data.account;

}

const getContainers = async (accounts) => {

  const containerRequests = [];

  accounts.forEach(account => {
    containerRequests.push(
      limit(() => tagmanager.accounts.containers.list({ parent: account.path }))
    );
  });
  
  const containersList = await Promise.all(containerRequests);

  return containersList.flatMap(c => c.data.container);
}

const getVersions = async (containers) => {

  const versionRequests = [];

  containers.forEach(container => {
    versionRequests.push(
      limit(() => tagmanager.accounts.containers.versions.live({ parent: container.path }))
    );
  });
  
  const versionsList = await Promise.all(versionRequests);

  console.log("versionsList: ", versionsList);

  return versionsList.flatMap(c => c.data); // <== USE THIS
  
}