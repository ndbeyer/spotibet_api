const axios = require("axios");
const { chunk } = require("lodash");

const fetch = async (spotify_access_token, url) => {
  try {
    const { data } = await axios({
      method: "get",
      url,
      headers: {
        Authorization: `Bearer ${spotify_access_token}`,
      },
    });
    return data;
    // eslint-disable-next-line no-console
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`error during fetching ${url} data`, error.message);
  }
};

const getSpotifyData = async (currentUser, type, identifier) => {
  const { spotify_access_token, spotify_profile_id } = currentUser;
  switch (type) {
    case "artists": {
      const artistIds = identifier;
      if (Array.isArray(artistIds)) {
        const chunked = chunk(artistIds, 50);
        const promises = chunked.map(
          async (array) =>
            await fetch(
              spotify_access_token,
              `https://api.spotify.com/v1/artists?ids=${array.join(",")}`
            )
        );
        return (await Promise.all(promises)).reduce(
          (a, b) => [...a, ...b.artists],
          []
        );
      } else {
        // identifier is one artistId
        return (
          await fetch(
            spotify_access_token,
            `https://api.spotify.com/v1/artists?ids=${artistIds}`
          )
        ).artists;
      }
    }
    case "userPlaylists":
      return await fetch(
        spotify_access_token,
        `https://api.spotify.com/v1/users/${spotify_profile_id}/playlists`
      );
    case "playlistTracks":
      return await fetch(
        spotify_access_token,
        `https://api.spotify.com/v1/playlists/${identifier}/tracks`
      );
    case "userProfile":
      return await fetch(
        spotify_access_token,
        `https://api.spotify.com/v1/users/${spotify_profile_id}`
      );
    default:
      return null;
  }
};

module.exports = getSpotifyData;
