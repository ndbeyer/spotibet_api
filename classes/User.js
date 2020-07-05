const { encrypt, decrypt } = require("../util/encryptDecrypt");
const { db } = require("../db");
// require other classes after exports to avoid circular dependencies

module.exports = class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static encryptDbId(dbId) {
    return encrypt("user", dbId);
  }

  static decryptId(id) {
    return typeof id === "string" ? decrypt(id) : id;
  }

  static async gen(id) {
    const userIdDb = User.decryptId(id);
    const res = await db.query("SELECT * FROM public.user WHERE id = $1", [
      userIdDb,
    ]);
    const user = new User({
      ...res.rows[0],
      id: User.encryptDbId(userIdDb),
    });
    return user;
  }

  async bets() {
    const userIdDb = User.decryptId(this.id);
    const userBetIdsPublic = (
      await db.query(
        `SELECT bet_id FROM public.participant WHERE user_id = $1`,
        [userIdDb]
      )
    ).rows.map(({ bet_id }) => Bet.encryptDbId(bet_id));
    return await Bet.genMult(userBetIdsPublic);
  }

  async transactions() {
    await makeUserBetTransactions(this.id);
    const userIdDb = User.decryptId(this.id);
    const rows = (
      await db.query(`SELECT id FROM public.transaction WHERE user_id = $1`, [
        userIdDb,
      ])
    ).rows;
    const ids = rows.map(({ id }) => Transaction.encryptDbId(id));
    return await Transaction.genMult(ids);
  }
};

// require other classes after exports to avoid circular dependencies
const Bet = require("./Bet");
const Transaction = require("./Transaction");
const makeUserBetTransactions = require("../mutations/makeUserBetTransactions");
