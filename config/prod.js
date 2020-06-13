module.exports = {
  // connectionString: process.env.DATABASE_URL will be injected from heroku in db/index.js
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  apiJwtSecret: process.env.API_JWT_SECRET,
  statServerSecret: process.env.STAT_SERVER_SECRET,
  statServerURI: process.env.STAT_SERVER_URI,
};
