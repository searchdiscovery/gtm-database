'use strict';

require('dotenv').config();

const { wait } = require('./helpers/wait');

const functions = require('@google-cloud/functions-framework');

const {google} = require('googleapis');
const tagmanager = google.tagmanager('v2');

async function main() {

  // auth constructor
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/tagmanager.readonly'],
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });
  
  // create auth client
  const authClient = await auth.getClient();

  // set argument for request (?)
  const request = { auth: authClient };

  /**
   * Get a list of all accounts
   * @see https://developers.google.com/tag-platform/tag-manager/api/v2/reference
   */
  const accountsList = await tagmanager.accounts.list(request);
  const accounts = accountsList.data.account || [];

  /**
   * Get a list of containers for each account
   */
  const containersList = accounts.reduce(async (acc, account) => {
    await wait(4000);
    const containers = await tagmanager.accounts.containers.list({ auth: authClient, parent: account.path });
    acc = [...containers.data.container];
    return acc;
  }, [])

  return containersList;
}

// do the cloud function!
functions.http('gtmDownloader', async (req, res) => {

  try {
    // run main
    const data = await main();
    res.send(data);

    // write to BQ tables

  } catch(e) {
    res.status(500).send(`Oops ${e.message}`);
  }
  
});
