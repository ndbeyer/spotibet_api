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

const handleError = (error, response) => {
  return response.json({
    success: false,
    error,
  });
};

const getProfile = async (spotifyAccessToken) => {
  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${spotifyAccessToken}`,
    },
  });
  if (profileResponse.status !== 200) {
    return {
      error: `PROFILE_RESPONSE_ERROR`,
    };
  }
  const { id: spotifyProfileId } = await profileResponse.json();
  return await { spotifyProfileId };
};

const assignAuthRoutes = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.get("/test", (req, res) => {
    res.status(200).json({ success: true, data: "that was a successful test" });
  });

  app.post("/get-jwt-for-auth-code", async (request, response) => {
    try {
      const { code, code_verifier } = request.body;
      const { os } = request.query;
      if (!code || !code_verifier || !os) {
        handleError("MISSING_INPUTS", response);
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
        handleError("TOKEN_RESPONSE_ERROR", response);
      }
      const {
        access_token: spotifyAccessToken,
        refresh_token: spotifyRefreshToken,
      } = await tokenResponse.json();

      const { error, spotifyProfileId } = await getProfile(spotifyAccessToken);
      if (error) {
        handleError(error, response);
      }

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
        success: true,
        newUser: false, // TODO: handle already existent user in the frontend
        jwt: token,
        refreshToken: spotifyRefreshToken,
      });
    } catch (e) {
      return response.json({ success: false, error: e });
    }
  });

  app.post("/refresh-login", async (req, res) => {
    const { refreshToken } = req.body;
    const refreshResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: queryString.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: spotifyClientId,
          client_secret: spotifyClientSecret,
        }),
      }
    );
    if (refreshResponse.status !== 200) {
      handleError("REFRESH_RESPONSE_ERROR", res);
    }
    const {
      access_token: spotifyAccessToken,
      refresh_token: spotifyRefreshToken,
    } = await refreshResponse.json();

    const { error, spotifyProfileId } = await getProfile(spotifyAccessToken);
    if (error) {
      handleError(error, res);
    }

    const userExistsRes = await db.query(
      `SELECT id FROM public.user WHERE spotify_profile_id = $1`,
      [spotifyProfileId]
    );

    // user does not exist
    if (!userExistsRes.rows.length) {
      handleError("USER_DOES_NOT_EXIST", res);
    }

    // user already exists
    const alreadyExistentUserId = userExistsRes.rows[0].id;
    await db.query(
      "UPDATE public.user SET spotify_access_token = $1, spotify_refresh_token =$2",
      [spotifyAccessToken, spotifyRefreshToken]
    );
    const token = jwt.sign({ id: alreadyExistentUserId }, apiJwtSecret);
    return res.json({
      success: true,
      jwt: token,
      refreshToken: spotifyRefreshToken,
    });
  });

  app.get("*", (_, res) =>
    res.status(404).json({ success: false, data: "endpoint not found." })
  );
};

module.exports = assignAuthRoutes;
