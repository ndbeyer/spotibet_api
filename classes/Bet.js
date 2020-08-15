const axios = require("axios");
const keys = require("../config/keys");
const { encrypt, decrypt } = require("../util/encryptDecrypt");
const { db } = require("../db");

// require other classes after exports to avoid circular dependencies

module.exports = class Bet {
  constructor(data) {
    Object.assign(this, data);
  }

  static encryptDbId(dbId) {
    return encrypt("bet", dbId);
  }

  static decryptId(id) {
    return typeof id === "string" ? decrypt(id) : id;
  }

  static async gen(id) {
    const dbId = Bet.decryptId(id);
    const res = await db.query(
      `SELECT
        id,
        artist_id AS "artistId",
        listeners,
        type,
        start_date::text AS "startDate",
        end_date::text AS "endDate",
        transactions,
        listeners_at_end_date AS "listenersAtEndDate"
        FROM public.bet WHERE id = $1`,
      [dbId]
    );

    if (!res.rows.length) {
      return null;
    }
    return new Bet({
      ...res.rows[0],
      id: Bet.encryptDbId(res.rows[0].id),
      startDate: new Date(res.rows[0].startDate).toISOString(),
      endDate: new Date(res.rows[0].endDate).toISOString(),
    });
  }

  static async genMult(ids) {
    const dbIds = ids.map((id) => Bet.decryptId(id));
    const res = await db.query(
      `SELECT
        id,
        user_id AS "_userId",
        artist_id AS "artistId",
        listeners,
        type,
        start_date::text AS "startDate",
        end_date::text AS "endDate",
        transactions,
        listeners_at_end_date AS "listenersAtEndDate"
        FROM public.bet WHERE id = ANY($1)
        ORDER BY end_date ASC
        `,
      [dbIds]
    );
    if (!res.rows.length) {
      return [];
    }
    return res.rows.map(
      (bet) =>
        new Bet({
          ...bet,
          id: Bet.encryptDbId(bet.id),
          startDate: new Date(bet.startDate).toISOString(),
          endDate: new Date(bet.endDate).toISOString(),
        })
    );
  }

  static async allBets() {
    const betIdsDb = (await db.query("SELECT id FROM public.bet")).rows.map(
      ({ id }) => id
    );
    return Bet.genMult(betIdsDb);
  }

  async supportersAmount() {
    const betDbId = Bet.decryptId(this.id);
    const supportersAmount = (
      await db.query(
        `SELECT SUM(amount) FROM public.participant WHERE bet_id =$1 AND support IS TRUE`,
        [betDbId]
      )
    ).rows[0].sum;
    return Number(supportersAmount);
  }

  async contradictorsAmount() {
    const betDbId = Bet.decryptId(this.id);
    const contradictorsAmount = (
      await db.query(
        `SELECT SUM(amount) FROM public.participant WHERE bet_id =$1 AND support IS FALSE`,
        [betDbId]
      )
    ).rows[0].sum;
    return Number(contradictorsAmount);
  }

  async quote() {
    const supportersAmount = await this.supportersAmount();
    const contradictorsAmount = await this.contradictorsAmount();
    const total = supportersAmount + contradictorsAmount;
    const proPercent =
      (supportersAmount / total && (supportersAmount / total).toFixed(2)) ||
      null;
    return proPercent;
  }

  async status() {
    const betIdDb = Bet.decryptId(this.id);
    if (new Date() < new Date(this.startDate)) {
      return "JOINABLE";
    } else {
      const count = (
        await db.query(
          "SELECT COUNT(DISTINCT support) FROM public.participant WHERE bet_id = $1",
          [betIdDb]
        )
      ).rows[0].count;
      const betIsValid = Number(count) === 2;
      if (!betIsValid) {
        return "INVALID";
      }
      if (betIsValid && new Date() < new Date(this.endDate)) {
        return "RUNNING";
      }
      if (betIsValid && new Date() >= new Date(this.endDate)) {
        return "ENDED";
      }
    }
  }

  async artist(_, { currentUser }) {
    return await Artist.gen(this.artistId, currentUser);
  }

  async currentUserAmount(_, { currentUser }) {
    const userIdDb = User.decryptId(currentUser.id);
    const betIdDb = Bet.decryptId(this.id);
    const result = (
      await db.query(
        `SELECT SUM(amount) FROM public.participant WHERE user_id =$1 AND bet_id =$2`,
        [userIdDb, betIdDb]
      )
    ).rows[0];
    return result ? result.sum : null;
  }

  async currentUserSupports(_, { currentUser }) {
    const userIdDb = User.decryptId(currentUser.id);
    const betIdDb = Bet.decryptId(this.id);
    const entry = (
      await db.query(
        "SELECT support FROM public.participant WHERE user_id = $1 AND bet_id = $2",
        [userIdDb, betIdDb]
      )
    ).rows[0];
    return entry ? entry.support : null;
  }

  async listenersAtStartDate() {
    const betIdDb = Bet.decryptId(this.id);
    const row = (
      await db.query(
        'SELECT artist_id AS "artistId", listeners_at_start_date AS "listenersAtStartDate", start_date::text AS "startDate" FROM public.bet WHERE id = $1',
        [betIdDb]
      )
    ).rows[0];
    if (!row.listenersAtStartDate) {
      // get the listeners from statServer
      const { data } = await axios.get(
        `${keys.statServerURI}/artist?id=${row.artistId}&date=${row.startDate}`,
        {
          headers: {
            Authorization: keys.statServerSecret,
          },
        }
      );
      const listenersAtStartDate =
        data.payload[0] && data.payload[0].monthly_listeners;
      if (!listenersAtStartDate) {
        return null;
      } else {
        await db.query(
          "UPDATE public.bet SET listeners_at_start_date = $1 WHERE id = $2",
          [listenersAtStartDate, betIdDb]
        );
        return listenersAtStartDate;
      }
    } else {
      return row.listenersAtStartDate;
    }
  }
};

// require other classes after exports to avoid circular dependencies
const User = require("../classes/User.js");
const Artist = require("../classes/Artist.js");
