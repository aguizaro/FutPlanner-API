const express = require('express');
const authRouter = express.Router();
const callbackRouter = express.Router();
const { google } = require('googleapis');
const { updateUser, createNewUser } = require('../scripts/modUser.js'); //use createNewUser or updateUser based on if user exists or not

const credentials = require('../client_secret.json');

const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0], { expires_in: 9000 });

// begin OAuth2 flow
authRouter.get('/', (_, res) => {
  // redirect users to Google's OAuth2 consent screen
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.profile'],
  });
  res.redirect(authUrl);
});

// callback route for Google to redirect to
callbackRouter.get('/', async (req, res) => {
  try {
    const code = req.query.code;

    // exchange the auth code for tokens
    const { tokens } = await oAuth2Client.getToken(code);

    if (!tokens.refresh_token) throw new Error('No refresh token found.');
    oAuth2Client.setCredentials(tokens); //set credentials for OAuth2 client

    // fetch the user's profile information
    const peopleApi = google.people({ version: 'v1', auth: oAuth2Client });
    const me = await peopleApi.people.get({
      resourceName: 'people/me',
      personFields: 'names',
    });

    const userName = me.data.names && me.data.names.length > 0 ? me.data.names[0].displayName : 'Unknown';
    console.log(`creating user: ${userName} with refresh token: ${tokens.refresh_token}`);
    createNewUser(userName, tokens.refresh_token); //create new user in database
    res.send({ 'Authentication successful!': tokens });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Internal Server Error: ${error}` });
  }
});

module.exports = {
  authRoute: authRouter,
  callbackRoute: callbackRouter,
};
