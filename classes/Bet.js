const { encrypt, decrypt } = require("../util/encryptDecrypt");
const { db } = require("../db");
const makeEndedBetTransactions = require("../queries/makeEndedBetTransactions");
const makeInvalidBetTransactions = require("../queries/makeInvalidBetTransactions");
const { betIsJoinable, betEnded } = require("../util/valiDate");

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
        start_date AS "startDate",
        end_date AS "endDate",
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
      id: Bet.encryptDbId(res.rows[0].id)
    });
  }

  static async genMult(ids) {
    const dbIds = ids.map(id => Bet.decryptId(id));
    const res = await db.query(
      `SELECT
        id,
        user_id AS "_userId",
        artist_id AS "artistId",
        listeners,
        type,
        start_date AS "startDate",
        end_date AS "endDate",
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
      bet =>
        new Bet({
          ...bet,
          id: Bet.encryptDbId(bet.id)
        })
    );
  }

  static async allBets() {
    const betIdsDb = (await db.query("SELECT id FROM public.bet")).rows.map(
      ({ id }) => id
    );
    return Bet.genMult(betIdsDb);
  }

  async pro() {
    const betDbId = Bet.decryptId(this.id);
    const pro = (
      await db.query(
        `SELECT SUM(amount) FROM public.participant WHERE bet_id =$1 AND support IS TRUE`,
        [betDbId]
      )
    ).rows[0].sum;
    return Number(pro);
  }

  async contra() {
    const betDbId = Bet.decryptId(this.id);
    const contra = (
      await db.query(
        `SELECT SUM(amount) FROM public.participant WHERE bet_id =$1 AND support IS FALSE`,
        [betDbId]
      )
    ).rows[0].sum;
    return Number(contra);
  }

  async quote() {
    const pro = await this.pro();
    const contra = await this.contra();
    const total = pro + contra;
    const proPercent = (pro / total && (pro / total).toFixed(2)) || null;
    return proPercent;
  }

  async status() {
    const betIdDb = Bet.decryptId(this.id);
    if (betIsJoinable(this.startDate)) {
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
        if(!this.transactions) {
          await makeInvalidBetTransactions(betIdDb)
        }
        return "INVALID";
      }
      if (betIsValid && !betEnded(this.endDate)) {
        return "RUNNING";
      }
      if (betIsValid && betEnded(this.endDate)) {
        if (!this.transactions) {
          await makeEndedBetTransactions(betIdDb);
        }
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
};

// require other classes after exports to avoid circular dependencies
const User = require("../classes/User.js");
const Artist = require("../classes/Artist.js");
