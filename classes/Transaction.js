const { encrypt, decrypt } = require("../util/encryptDecrypt");
const { db } = require("../db");
// require other classes after exports to avoid circular dependencies

module.exports = class Transaction {
  constructor(data) {
    Object.assign(this, data);
  }

  static encryptDbId(dbId) {
    return encrypt("transaction", dbId);
  }

  static decryptId(id) {
    return typeof id === "string" ? decrypt(id) : id;
  }

  static async gen(id) {
    const dbId = Transaction.decryptId(id);
    const rows = (
      await db.query(
        `SELECT
        id,
        user_id AS "_userId",
        amount,
        type, 
        bet_id AS betId,
        datetime::text
        FROM public.transaction WHERE id = $1
        `,
        [dbId]
      )
    ).rows;
    if (!rows.length) {
      return null;
    }
    return new Transaction({
      ...rows[0],
      id: Transaction.encryptDbId(rows[0].id),
      betId: Bet.encryptDbId(rows[0].betId),
      userId: User.encryptDbId(rows[0].userId),
      datetime: new Date(rows[0].datetime).toISOString(),
    });
  }

  static async genMult(ids) {
    const dbIds = ids.map((id) => Transaction.decryptId(id));
    const res = await db.query(
      `SELECT
        id,
        user_id AS "_userId",
        amount,
        type, 
        bet_id AS betId,
        datetime::text
        FROM public.transaction WHERE id = ANY($1)
        ORDER BY datetime DESC
        `,
      [dbIds]
    );
    if (!res.rows.length) {
      return [];
    }
    return res.rows.map(
      (transaction) =>
        new Transaction({
          ...transaction,
          id: Transaction.encryptDbId(transaction.id),
          betId: Bet.encryptDbId(transaction.betId),
          userId: User.encryptDbId(transaction.userId),
          datetime: new Date(transaction.datetime).toISOString(),
        })
    );
  }
};

// require other classes after exports to avoid circular dependencies
const Bet = require("./Bet");
const User = require("./User");
