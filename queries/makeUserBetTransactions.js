const { db } = require("../db");
const User = require("../classes/User");
const makeEndedBetTransactions = require("./makeEndedBetTransactions");
const makeInvalidBetTransactions = require("./makeInvalidBetTransactions");

const makeUserBetTransactions = async (userId, currentUser) => {
  const userIdDb = User.decryptId(userId ? userId : currentUser.id);
  try {
    const betIds = (
      await db.query(
        "SELECT bet_id FROM public.participant WHERE user_id = $1",
        [userIdDb]
      )
    ).rows.map(({ bet_id }) => bet_id);
    console.log("betIds", betIds);

    await Promise.all([
      await makeEndedBetTransactions(betIds),
      await makeInvalidBetTransactions(betIds)
    ]);

    return { success: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("!!!makeUserBetTransactions error: ", e);
    return { success: false, error: e.message };
  }
};

module.exports = makeUserBetTransactions;
