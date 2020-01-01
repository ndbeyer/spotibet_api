module.exports = {
  apiPort: process.env.PORT,
  apiEndpoint: process.env.API_ENDPOINT,
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  jwtSecret:  process.env.JWT_SECRET,
  dbUrl: process.env.DATABASE_URL,
  // dbPort
	// dbHost
	// dbName
	// dbUser
  // dbPassword
  // connectionString: process.env.DATABASE_URL will be injected from heroku in db/index.js
  statServerSecret: process.env.STAT_SERVER_SECRET,
  statServerURI: process.env.STAT_SERVER_URI,
  
};
