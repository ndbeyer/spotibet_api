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

const console = true; // TODO: remove

const assignAuthRoutes = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.get("/test", (req, res) => {
    res.status(200).json({ success: true, data: "that was a successful test" });
  });

  app.post("/get-jwt-for-auth-code", async (request, response) => {
    console && console.log("hit get-jwt-for-auth-code");
    const { code, code_verifier } = request.body;
    const { os } = request.query;

    if (!code) {
      return response
        .status(403)
        .json({ success: false, data: "No authentication_code provided" });
    } else {
      try {
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
              redirect_uri:
                os === "ios"
                  ? "com.spotibet:/oauthredirect"
                  : "com.spotibet://oauthredirect",
              client_id: spotifyClientId,
              client_secret: spotifyClientSecret,
            }),
          }
        );
        if (tokenResponse.status !== 200) {
          return response.json({
            success: false,
            error: `status code: ${tokenResponse.status}`,
          });
        } else {
          const {
            access_token: spotifyAccessToken,
            refresh_token, // TODO: write refresh_token into db
          } = await tokenResponse.json();
          console && console.log({ spotifyAccessToken, refresh_token });
          const profileResponse = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${spotifyAccessToken}`,
            },
          });
          if (profileResponse.status !== 200) {
            return response.json({
              success: false,
              error: `profileResponse status code: ${profileResponse.status}`,
            });
          } else {
            const { id: spotifyProfileId } = await profileResponse.json();
            console && console.log({ spotifyProfileId });
            const userExistsRes = await db.query(
              `SELECT id FROM public.user WHERE spotify_profile_id = $1`,
              [spotifyProfileId]
            );
            console && console.log({ userExistsRes });
            // new User
            if (!userExistsRes.rows.length) {
              const newUserRes = await db.query(
                "INSERT INTO public.user spotify_profile_id = $1, spotify_access_token = $2, datetime = now(), money = 100 RETURNING id",
                [spotifyProfileId, spotifyAccessToken]
              );
              console && console.log({ newUserRes });
              const newUserId = newUserRes.rows[0].id;
              const token = jwt.sign({ id: newUserId }, apiJwtSecret);
              return response.json({
                success: true,
                newUser: true,
                jwt: token,
              });
            } else {
              // user already exists
              const alreadyExistentUserId = userExistsRes.rows[0].id;
              console && console.log({ alreadyExistentUserId });
              const token = jwt.sign(
                { id: alreadyExistentUserId },
                apiJwtSecret
              );
              console && console.log({ token });
              return response.json({
                success: true,
                newUser: false,
                jwt: token,
              });
            }
          }
        }
      } catch (e) {
        return response.json({ success: false, error: e });
      }
    }

    // if (refreshToken) {
    // }
  });

  app.get("*", (_, res) =>
    res.status(404).json({ success: false, data: "endpoint not found." })
  );
};

module.exports = assignAuthRoutes;
