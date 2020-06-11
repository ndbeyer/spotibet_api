const fetch = require("node-fetch");
const queryString = require("querystring");
const bodyParser = require("body-parser");
const { db } = require("../db");
const jwt = require("jsonwebtoken");

const { clientId, clientSecret } = require("../config/keys");

const assignAuthRoutes = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.get("/test", (req, res) => {
    res.status(200).json({ success: true, data: "that was a successful test" });
  });

  app.post("/auth", async (req, res) => {
    const { code, refreshToken, code_verifier } = req.body;
    const { os } = req.query;

    if (!code && !refreshToken) {
      return res
        .status(403)
        .json({ success: false, data: "Neither code nor refreshToken" });
    }

    // get access- and refresh-tokens for authorization_code
    if (code) {
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
              client_id: clientId,
              client_secret: clientSecret,
            }),
          }
        );
        if (tokenResponse.status !== 200)
          return {
            success: false,
            error: `status code: ${tokenResponse.status}`,
          };
        if (tokenResponse.status === 200) {
          const { access_token, refresh_token } = await tokenResponse.json();
          const profileResponse = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          if (profileResponse.status !== 200)
            return {
              success: false,
              error: `profileResponse status code: ${profileResponse.status}`,
            };
          if (profileResponse.status === 200) {
            const { id: spotifyProfileId } = await profileResponse.json();

            // const res = await db.query(`SELECT id FROM user WHERE spotify_profile_id = $1`, [spotifyProfileId])

            // if(!res.rows.length) {
            //   // new user
            // }

            return { success: true, access_token, refresh_token, id };
          }
        }
      } catch (e) {
        return { success: false, error: e };
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
