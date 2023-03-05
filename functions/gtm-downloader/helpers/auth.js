'use strict';

exports.getAuthClient = async () => {

  const { google } = require('googleapis');

  // auth constructor
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/tagmanager.readonly'],
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });

  // create auth client
  return await auth.getClient();

}