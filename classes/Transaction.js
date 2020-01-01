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

  static async genMult(ids) {
    const dbIds = ids.map(id => Transaction.decryptId(id));
    const res = await db.query(
      `SELECT
        id,
        user_id AS "_userId",
        amount,
        type, 
        bet_id AS betId,
        datetime
        FROM public.transaction WHERE id = ANY($1)
        ORDER BY datetime DESC
        `,
      [dbIds]
    );
    if (!res.rows.length) {
      return [];
    }
    return res.rows.map(
      transaction =>
        new Transaction({
          ...transaction,
          id: Transaction.encryptDbId(transaction.id),
          betId: Bet.encryptDbId(transaction.betId),
          userId: User.encryptDbId(transaction.userId)
        })
    );
  }
};

// require other classes after exports to avoid circular dependencies
const Bet = require("./Bet")
const User = require("./User")
