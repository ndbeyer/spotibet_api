module.exports = {
  // connectionString: process.env.DATABASE_URL will be injected from heroku in db/index.js
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID, // spotify developer console
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET, // spotify developer console
  apiJwtSecret: process.env.API_JWT_SECRET, // use the production secret in development, as the login jwt can only be retreived from the production api
  statServerSecret: process.env.STAT_SERVER_SECRET, // the scret to communicate with the statserver e.g. secret
  statServerURI: process.env.STAT_SERVER_URI, // http://localhost:5000
};
