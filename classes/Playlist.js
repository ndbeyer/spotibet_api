const getSpotifyData = require("../util/getSpotifyData");
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
          image: images.length ? images[0].url : null
        })
    );
  }

  static async ofCurrentUser(currentUser) {
    const userPlaylists = (await getSpotifyData(currentUser, "userPlaylists"))
      .items;
    const result = Playlist.genMult(userPlaylists);
    return result;
  }
};
