const axios = require("axios");
const { blockify } = require("./blockify");

const fetch = async (spotify_access_token, url) => {
  try {
    const { data } = await axios({
      method: "get",
      url,
      headers: {
        Authorization: `Bearer ${spotify_access_token}`
      }
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
        const [blockified, blocks] = blockify(artistIds, 50);
        if (blockified) {
          // identifier is an array of artistIds with more than 50 item in it
          const result = (
            await Promise.all(
              blocks.map(
                async block =>
                  await fetch(
                    spotify_access_token,
                    `https://api.spotify.com/v1/artists?ids=${block.join(",")}`
                  )
              )
            )
          ).reduce((a, b) => [...a.artists, ...b.artists]);
          return result;
        } else {
          // identifier is an array of artistIds
          return (
            await fetch(
              spotify_access_token,
              `https://api.spotify.com/v1/artists?ids=${artistIds.join(",")}`
            )
          ).artists;
        }
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
