'use strict';

require('dotenv').config();

const { wait } = require('./helpers/wait');

const functions = require('@google-cloud/functions-framework');
const { BigQuery } = require('@google-cloud/bigquery');

const { google } = require('googleapis');
const tagmanager = google.tagmanager('v2');


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
  const promises = [];

  accounts.forEach(account => {
    promises.push(
      tagmanager.accounts.containers.list({ parent: account.path })
    );
  });
  
  const containersList = await Promise.all(promises);

  // Take the two arrays in containersList and create a new array with all of the members of each.
  const containerMembers = [containersList]

  const allContainers = containersList.flatMap(c => c.data.container);

  console.log(allContainers);

  /**
   * 3. Get an array of container live versions.
   */

  // const liveContainers = 

  /**
   * 4. For each live container version, insert the following into respective BQ tables:
   * - Its tags
   * - Its variables
   * - Its builtInVariables
   * - Its triggers
   */

//   get a list of tags 
  

  // const tagsList = await accounts.reduce(async (acc, workspace) =>{
  //   await wait(4000)
  //   const tags = await tagmanager.accounts.containers.workspaces.tags.list({ parent: workspace.path})
  //   acc = [...tags.data.tag];
  //   return acc;
  // }, []);

  //   get a list of variables 
  
  // const variablesList = await accounts.reduce(async (acc, account) =>{
  //   await wait(4000)
  //   const variables = await tagmanager.accounts.containers.workspaces.variables.list({ parent: workspace.path })
  //   // console.log("variables: ", variables)
  //   acc = [...variables.data.variable];
  // })

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