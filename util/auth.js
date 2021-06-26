const fetch = require("node-fetch");
const queryString = require("querystring");
const bodyParser = require("body-parser");
const { db } = require("../db");
const jwt = require("jsonwebtoken");
const {
  spotifyClientId,
  spotifyClientSecret,
  apiJwtSecret,
} = require("../config/keys");

// this object needs to be always part of the server response, otherwise 'react-native-app-auth' will throw 'JSON deserialization error' (android only)
const androidDebugObject = {
  access_token: "placeholder",
  token_type: "placeholder",
  expires_in: 123455,
  refresh_token: "placeholder",
  scope: "placeholder",
};

const handleError = (error, response) => {
  response.json({
    ...androidDebugObject,
    success: false,
    error,
  });
};

const assignAuthRoutes = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.get("/test", (req, res) => {
    res.status(200).json({ success: true, data: "that was a successful test" });
  });

  app.post("/get-jwt-for-auth-code", async (request, response) => {
    try {

      console.log(`hit /get-jwt-for-auth-code with ${code} and ${code_verifier}`)

      const { code, code_verifier } = request.body;
      if (!code || !code_verifier) {
        handleError("MISSING_INPUTS", response);
        return;
      }
      // get access and refresh tokens
      const tokenResponse = await fetch(
        "https://accounts.spotify.com/api/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: queryString.stringify({
            code,
            code_verifier,
            grant_type: "authorization_code",
            redirect_uri: "com.audioshares:/oauthredirect",
            client_id: spotifyClientId,
            client_secret: spotifyClientSecret,
          }),
        }
      );

      if (tokenResponse.status !== 200) {
        handleError("TOKEN_RESPONSE_ERROR", response);
        return;
      }
      const tokeResponseJson = await tokenResponse.json();
      const {
        access_token: spotifyAccessToken,
        refresh_token: spotifyRefreshToken,
      } = tokeResponseJson;
      const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${spotifyAccessToken}`,
        },
      });
      if (profileResponse.status !== 200) {
        handleError("PROFILE_RESPONSE_ERROR", response);
        return;
      }
      const { id: spotifyProfileId } = await profileResponse.json();
      const userExistsRes = await db.query(
        `SELECT id FROM public.user WHERE spotify_profile_id = $1`,
        [spotifyProfileId]
      );
      // new user
      if (!userExistsRes.rows.length) {
        const newUserRes = await db.query(
          `INSERT INTO public.user 
                (spotify_profile_id, spotify_access_token, spotify_refresh_token, datetime, money)
                VALUES($1, $2, $3, now(), 100)
                RETURNING id`,
          [spotifyProfileId, spotifyAccessToken, spotifyRefreshToken]
        );
        const newUserId = newUserRes.rows[0].id;
        const token = jwt.sign({ id: newUserId }, apiJwtSecret);
        return response.json({
          ...androidDebugObject,
          success: true,
          newUser: true, // TODO: handle new user in the frontend
          jwt: token,
          refreshToken: spotifyRefreshToken,
        });
      }

      // user already exists
      const alreadyExistentUserId = userExistsRes.rows[0].id;
      await db.query(
        "UPDATE public.user SET spotify_access_token = $1, spotify_refresh_token =$2",
        [spotifyAccessToken, spotifyRefreshToken]
      );
      const token = jwt.sign({ id: alreadyExistentUserId }, apiJwtSecret);
      return response.json({
        ...androidDebugObject,
        success: true,
        newUser: false, // TODO: handle already existent user in the frontend
        jwt: token,
        refreshToken: spotifyRefreshToken,
      });
    } catch (e) {
      return response.json({ ...androidDebugObject, success: false, error: e });
    }
  });

  app.get("*", (_, res) =>
    res.status(404).json({ success: false, data: "endpoint not found." })
  );
};

module.exports = assignAuthRoutes;
