const fetch = require("node-fetch");
const queryString = require("querystring");
const { db } = require("../db");
const jwt = require("jsonwebtoken");
const {
  spotifyClientId,
  spotifyClientSecret,
  apiJwtSecret,
} = require("../config/keys");

const jwtForRefreshToken = async ({ refreshToken }) => {
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
    throw new Error("REFRESH_RESPONSE_ERROR");
  }
  const {
    access_token: spotifyAccessToken,
    refresh_token: spotifyRefreshToken,
  } = await refreshResponse.json();

  const profileResponse = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${spotifyAccessToken}`,
    },
  });
  if (profileResponse.status !== 200) {
    throw new Error("PROFILE_RESPONSE_ERROR");
  }

  const { id: spotifyProfileId } = await profileResponse.json();

  const userExistsRes = await db.query(
    `SELECT id FROM public.user WHERE spotify_profile_id = $1`,
    [spotifyProfileId]
  );

  if (!userExistsRes.rows.length) {
    throw new Error("REFRESH_LOGIN_USER_DOES_NOT_EXIST");
  }

  const alreadyExistentUserId = userExistsRes.rows[0].id;
  await db.query(
    "UPDATE public.user SET spotify_access_token = $1, spotify_refresh_token =$2",
    [spotifyAccessToken, spotifyRefreshToken]
  );
  const token = jwt.sign({ id: alreadyExistentUserId }, apiJwtSecret);
  return {
    success: true,
    jwt: token,
    refreshToken: spotifyRefreshToken,
  };
};

module.exports = jwtForRefreshToken;
