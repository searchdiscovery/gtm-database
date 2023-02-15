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

  // make request using Tag Manager client
  const res = await tagmanager.accounts.list(request);
  console.log(res.data);

  return res.data;
}

// do the cloud function!
functions.http('gtmDownloader', (req, res) => {

  try {
    // run main
    main()
      .then(data => { res.send(`Hello ${data.account[0].name}`) })
      .catch(console.error);

    // write to BQ tables
  } catch(e) {
    res.send(`Oops ${e.message}`);
  }
  
});
