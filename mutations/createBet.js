const { db } = require("../db");
const axios = require("axios");
const User = require("../classes/User");
const Bet = require("../classes/Bet");
const keys = require("../config/keys");
const { format } = require("date-fns");

// should be shared between frontend and backend
class BetTimer {
  constructor(additionalJoinTimeWeeks = 0, additionalRunTimeWeeks = 0) {
    this.minimumJoinTimeWeeks = 2;
    this.minimumRunTimeWeeks = 1;
    this.secondsPerWeek = 7 * 24 * 60 * 60 * 1000;
    this.now = Date.now();
    this.additionalJoinTimeWeeks = additionalJoinTimeWeeks;
    this.additionalRunTimeWeeks = additionalRunTimeWeeks;
    this.currentWeek = Math.floor(this.now / this.secondsPerWeek);
    this.startWeek =
      this.currentWeek +
      this.minimumJoinTimeWeeks +
      this.additionalJoinTimeWeeks;
    this.endWeek =
      this.startWeek + this.minimumRunTimeWeeks + this.additionalRunTimeWeeks;
  }
  formatter(ms, type) {
    switch (type) {
      case "format":
        if (!ms) return "Invalid";
        return format(new Date(ms), "dd.MM.yyyy HH:mm:ss");
      case "iso":
        return new Date(ms).toISOString();
      case "object":
        return new Date(ms);
      default:
        return ms;
    }
  }
  starts(type) {
    return this.formatter(this.startWeek * this.secondsPerWeek, type);
  }
  ends(type) {
    return this.formatter(this.endWeek * this.secondsPerWeek, type);
  }
  validate(endDate) {
    if (typeof endDate !== "string") {
      return false;
    }
    const startWeek = this.startWeek; // get from validates 2nd argument new Date(startDate).getTime() / this.secondsPerWeek;
    const endWeek = new Date(endDate).getTime() / this.secondsPerWeek;
    return (
      startWeek >= this.currentWeek + this.minimumJoinTimeWeeks &&
      endWeek >= startWeek + this.minimumRunTimeWeeks &&
      endWeek % 1 === 0 &&
      startWeek % 1 === 0
    );
  }
}

const createBet = async (
  { artistId, artistName, spotifyUrl, listeners, type, endDate },
  currentUser
) => {
  try {
    const betTimer = new BetTimer();
    const valid = betTimer.validate(endDate);
    if (!valid) {
      return {
        bet: null,
        success: false,
        error: "error during date validation",
      };
    }
    const startDate = betTimer.starts("iso");
    // GENERATE BET ENTRY
    const userIdDb = User.decryptId(currentUser.id);
    const betId = (
      await db.query(
        `INSERT INTO public.bet (user_id, artist_id, spotify_url, listeners, type, start_date, end_date, transactions) VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING id`,
        [userIdDb, artistId, spotifyUrl, listeners, type, startDate, endDate]
      )
    ).rows[0].id;
    // SEND ARTIST TO STAT_SERVER
    const { data } = await axios.post(
      `${keys.statServerURI}/insert`,
      {
        inserts: [
          {
            artist_id: artistId,
            spotify_url: spotifyUrl,
            artist_name: artistName,
          },
        ],
      },
      {
        headers: {
          Authorization: keys.statServerSecret,
        },
      }
    );
    // ROLLBACK BET CREATION ON STAT SERVER ERROR
    // eslint-disable-next-line no-console
    console.log("statServer response", data);
    if (!data.success) {
      const errorMessage = "error during sending artist to statServer";
      // eslint-disable-next-line no-console
      console.log(errorMessage);
      await db.query(`DELETE FROM public.bet WHERE id = $1`, [betId]);
      return { bet: null, success: false, error: errorMessage };
    }
    const bet = await Bet.gen(betId);
    return { bet, success: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("error creating bet", e);
    return { bet: null, success: false, error: e };
  }
};

module.exports = createBet;
