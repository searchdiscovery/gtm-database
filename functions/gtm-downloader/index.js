'use strict';

require('dotenv').config();

const functions = require('@google-cloud/functions-framework');
const { BigQuery } = require('@google-cloud/bigquery');

const { google } = require('googleapis');
const tagmanager = google.tagmanager('v2');


// @see https://www.npmjs.com/package/p-ratelimit
const { pRateLimit } = require('p-ratelimit');

const limit = pRateLimit({
  interval: 1000,
  rate: .25
});

const { asyncPipe } = require('./helpers/pipe');


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
   * Start with getting all the live versions each container
   */
  const versions = MOCK_DATA ? require('./data/versions.json') : await asyncPipe(
    getAccounts,
    getContainers,
    getVersions
  )();

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
        parameter = null
      } = trigger;

    if (parameter) {
      parameter = parameter.map(p => {
        // return an object that has some value for all properties, not just key/value/type
        let { type, "key":_key = null, value = null } = { ...p };
        return { type, key: _key, value };
      });
    } else {
      parameter = [
        {
          type: null,
          key: null,
          value: null
        }
      ];
    }

    if (filter) {
      filter = filter.map(c => {
        let { type, parameter } = c;
        parameter = parameter.map(p => {
          // return an object that has some value for all properties, not just key/value/type
          let { type, "key":_key = null, value = null } = { ...p };
          return { type, key: _key, value };
        });
        return { type, parameter };
      });
    } else {
      filter = [
        {
          type: null,
          parameter: [
            {
              type: null,
              key: null,
              value: null
            }
          ]
        }
      ];
    }

    if (customEventFilter) {
      customEventFilter = customEventFilter.map(c => {
        let { type, parameter } = c;
        parameter = parameter.map(p => {
          // return an object that has some value for all properties, not just key/value/type
          let { type, "key":_key = null, value = null } = { ...p };
          return { type, key: _key, value };
        });
        return { type, parameter };
      });
    } else {
      customEventFilter = [{
        type: null,
        parameter: [
          {
            type: null,
            key: null,
            value: null
          }
        ]
      }];
    }
    
    return { accountId, containerId, triggerId, name, type, filter, customEventFilter, waitForTags, checkValidation, waitForTagsTimeout, uniqueTriggerId, fingerprint, parentFolderId, parameter }
  });

  /**
   * Sends rows to BigQuery
   */

  // Insert account rows
  await dataset.table('test_gtm_accounts').insert(accountRecords);

  // Insert container rows
  await dataset.table('test_gtm_containers').insert(containerRecords);

  // Insert tag rows
  await dataset.table('test_gtm_tags').insert(tagRecords);

  // Insert variable rows
  await dataset.table('test_gtm_variables').insert(variableRecords);

  // BQ request to insert built-in variables
  await dataset.table('test_gtm_built_in_variables').insert(builtInVariableRecords);

  // BQ request to insert triggers
  await dataset.table('test_gtm_triggers').insert(triggerRecords);
  
  return `Tag manager db go brrrrr`;

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