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
    auth: authClient
  });

  const bqClient = new BigQuery();

  /**
   * Get a list of all accounts
   * @see https://developers.google.com/tag-platform/tag-manager/api/v2/reference
   */

  const accountsList = await tagmanager.accounts.list();
  const accounts = accountsList.data.account || [];

  console.log('accounts:',accounts)

  const promises = [];

  accounts.forEach(account => {
    promises.push(tagmanager.accounts.containers.list({ parent: account.path }))
  });
  
  console.log(promises);
  
  const containersList = await Promise.all(promises);
  
  console.log(containersList.map(container => container.data.container.map(c => c.name)));
  
  /**
   * Get a list of containers for each account
   */
  // const containersList = accounts.reduce(async (acc, account) => {
  //   const containers = await Promise.all(
  //     wait(4000),
  //     tagmanager.accounts.containers.list({ parent: account.path })
  //   );
  //   acc = [...containers.data.container];
  //   return acc;
  // }, []);

//   get a list of tags 
  
  // const liveContainers = containersList.reduce(async (acc, container) => {
  //   await wait(4000);
  //   const liveContainers = await tagmanager.accounts.containers.versions.live({ parent: container.path });
  //   acc = [...liveContainers.data.version];
  //   return acc;
  // }, []);

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