module.exports = {
  apiPort: process.env.PORT,
  apiEndpoint: process.env.API_ENDPOINT,
  callbackUrl: process.env.CALLBACK_URL,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID, // TODO: remove
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET, // TODO: remove
  sessionSecret: process.env.SESSION_SECRET,
  jwtSecret: process.env.JWT_SECRET,
  dbUrl: process.env.DATABASE_URL,
  // dbPort
  // dbHost
  // dbName
  // dbUser
  // dbPassword
  // connectionString: process.env.DATABASE_URL will be injected from heroku in db/index.js
  statServerSecret: process.env.STAT_SERVER_SECRET,
  statServerURI: process.env.STAT_SERVER_URI,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
};
