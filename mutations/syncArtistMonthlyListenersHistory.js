const { db } = require("../db");
const fetch = require("node-fetch");
const { statServerSecret, statServerURI } = require("../config/keys");
const { differenceInMilliseconds } = require("date-fns");

const syncArtistMonthlyListenersHistory = async ({ artistId }) => {
  try {
    const result = (
      await db.query(
        `SELECT fetch_date_end::text AS "fetchDateEnd" FROM public.monthly_listeners_history WHERE artist_id = $1 ORDER BY fetch_date_end DESC`,
        [artistId]
      )
    ).rows[0];

    let lastEntryFetchDateEnd;
    if (result) {
      lastEntryFetchDateEnd = result.fetchDateEnd;
      const lastEntryOutdated =
        differenceInMilliseconds(new Date(), new Date(lastEntryFetchDateEnd)) >=
        24 * 60 * 60 * 1000;
      if (!lastEntryOutdated) {
        return { success: true };
      }
    }

    const response = await fetch(`${statServerURI}/artist?id=${artistId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: statServerSecret,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Could not reach ${statServerURI}/artist?id=${artistId}`); // TODO: systematize Apollo Errors
    }
    const { payload } = await response.json();

    let newEntries = undefined;

    if (!result) {
      newEntries = payload;
    } else {
      newEntries = payload.filter(
        (entry) => entry.fetch_date_end > lastEntryFetchDateEnd
      );
    }

    await Promise.all(
      newEntries.map(
        async ({
          artist_id,
          spotify_url,
          fetch_date_start,
          fetch_date_end,
          monthly_listeners,
        }) => {
          await db.query(
            "INSERT INTO public.monthly_listeners_history (artist_id, spotify_url, fetch_date_start, fetch_date_end , monthly_listeners) VALUES ($1, $2, $3, $4, $5)",
            [
              artist_id,
              spotify_url,
              fetch_date_start,
              fetch_date_end,
              monthly_listeners,
            ]
          );
        }
      )
    );
    return { success: true };
  } catch (e) {
    throw new Error(e); // TODO: systematize Apollo Errors
  }
};

module.exports = syncArtistMonthlyListenersHistory;
