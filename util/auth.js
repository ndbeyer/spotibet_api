// const { db } = require("../db");
// const session = require("express-session");
// const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const { clientId, clientSecret } = require("../config/keys");
const SpotifyApi = require("spotify-web-api-node");
const spotifyConfig = {
  clientId,
  clientSecret,
  redirectUri: "com.spotibet:/oauthredirect",
}; // necessary to get access_token and refresh_token for the authorization_code from spotify, therefore these infos must comply with the data in the spotiy developer dashboard

const spotifyApi = new SpotifyApi(spotifyConfig);

const assignAuthRoutes = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.get("/bla", (req, res) => {
    console.log({ req, res });
    res.status(200).json({ success: true, data: "great" });
  });

  app.post("/auth", (req, res) => {
    // this route will be called by our react native app after
    // A. it has received an authorization_code from spotify
    // B. or the app retreived a refresh_token from secure storage
    const { code, refreshToken } = req.body;

    console.log({ code, refreshToken });
    console.log({ spotifyConfig });

    if (!code && !refreshToken) {
      return res.status(403).json({ success: false, data: "Not authorized" });
    }

    if (refreshToken) {
      //Refresh token is available, retrieve a new access token
      return res.json({ todo: "Refresh accesstoken" });
    }

    if (code) {
      //Retrieve new refresh token and access token
      spotifyApi
        .authorizationCodeGrant(code)
        .then((data) => {
          console.log(data);
          return (
            res.json({ success: true, data: data.body }),
            (err) => {
              console.log("error", err);
              return res.json({ success: false, error: err });
            }
          );
        })
        .catch((error) => {
          console.log("catchError", error);
          return res.json({ success: false, error: error });
        });
    }
  });

  app.get("*", (_, res) =>
    res.status(404).json({ success: false, data: "endpoint not found." })
  );
};

module.exports = assignAuthRoutes;
