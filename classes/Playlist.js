const getSpotifyData = require("../util/getSpotifyData");
const lodash = require("lodash");
// require other classes after exports to avoid circular dependencies

module.exports = class Playlist {
  constructor(data) {
    Object.assign(this, data);
  }

  static genMult(playlists) {
    return playlists.map(
      ({ id, name, images }) =>
        new Playlist({
          id,
          name,
          image: images.length ? images[0].url : null,
        })
    );
  }

  static async artistsOfPlaylist(playlistId, currentUser) {
    const artistIds = (
      await getSpotifyData(currentUser, "playlistTracks", playlistId)
    ).items
      .map((item) => item.track.artists)
      .reduce((a, b) => [...a, ...b])
      .sort((a, b) => (b.name > a.name ? -1 : 1))
      .map(({ id }) => id);

    const uniqueArtistIds = lodash.uniq(artistIds);
    return await Artist.genMult(uniqueArtistIds, currentUser);
  }

  static async ofCurrentUser(currentUser) {
    const userPlaylists = (await getSpotifyData(currentUser, "userPlaylists"))
      .items;
    const result = Playlist.genMult(userPlaylists);
    return result;
  }
};

const Artist = require("./Artist");
