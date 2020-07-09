const getSpotifyData = require("../util/getSpotifyData");
const { db } = require("../db");
const getMonthlyListeners = require("../util/getMonthlyListeners");
const syncArtistMonthlyListenersHistory = require("../mutations/syncArtistMonthlyListenersHistory");
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

  async monthlyListenersHistory() {
    await syncArtistMonthlyListenersHistory({ artistId: this.id });
    const rows = (
      await db.query(
        `SELECT id, monthly_listeners AS "monthlyListeners", fetch_date_end::text AS "fetchDateEnd" FROM public.monthly_listeners_history WHERE artist_id = $1 ORDER BY fetch_date_end DESC`,
        [this.id]
      )
    ).rows;
    return rows; // TODO: encode db ids? Paulo said this might not be necessary
  }
};

// require other classes after exports to avoid circular dependencies
const Bet = require("./Bet");
