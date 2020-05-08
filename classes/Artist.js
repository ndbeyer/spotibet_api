const getSpotifyData = require("../util/getSpotifyData");
const lodash = require("lodash");
const { db } = require("../db");
const getMonthlyListeners = require("../util/getMonthlyListeners");
// require other classes after exports to avoid circular dependencies

module.exports = class Artist {
  constructor(data) {
    Object.assign(this, data);
  }

  static async gen(spotifyArtistId, currentUser) {
    const data = await getSpotifyData(currentUser, "artists", spotifyArtistId);
    return data.map(
      ({ id, name, images, popularity, followers, external_urls }) =>
        new Artist({
          id,
          name,
          image: images.length ? images[0].url : null,
          popularity,
          followers: followers.total,
          spotifyUrl: external_urls ? external_urls.spotify : null,
        })
    )[0];
  }

  static async genMult(spotifyArtistIds, currentUser) {
    const data = await getSpotifyData(currentUser, "artists", spotifyArtistIds);

    return data.map(
      ({ id, name, images, popularity, followers, external_urls }) =>
        new Artist({
          id,
          name,
          image: images.length ? images[0].url : null,
          popularity,
          followers: followers.total,
          spotifyUrl: external_urls ? external_urls.spotify : null,
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

  async monthlyListeners() {
    return await getMonthlyListeners(this.spotifyUrl);
  }

  async joinableBets() {
    const artistBetIdsDb = (
      await db.query(
        "SELECT id FROM public.bet WHERE artist_id = $1 AND now() < start_date",
        [this.id]
      )
    ).rows.map(({ id }) => id);
    return await Bet.genMult(artistBetIdsDb);
  }
};

// require other classes after exports to avoid circular dependencies
const Bet = require("./Bet");
