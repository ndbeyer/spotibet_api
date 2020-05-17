const passport = require("passport");
const keys = require("../config/keys");
const SpotifyStrategy = require("passport-spotify").Strategy;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// configure passport
passport.use(
  new SpotifyStrategy(
    {
      clientID: keys.spotifyClientId,
      clientSecret: keys.spotifyClientSecret,
      callbackURL: keys.callbackUrl,
    },
    async (accessToken, refreshToken, expires_in, profile, done) => {
      return done(null, {
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        spotifyProfileId: profile.id,
      });
    }
  )
);
