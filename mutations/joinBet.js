const { db } = require("../db");
const User = require("../classes/User");
const Bet = require("../classes/Bet");
const { valiDateJoinDate } = require("../util/valiDate");

const joinBet = async ({ betId, support, amount }, currentUser) => {
  try {
    const userIdDb = User.decryptId(currentUser.id);
    const betIdDb = Bet.decryptId(betId);
    //make sure the bet is still joinable
    const betIsJoinable = await valiDateJoinDate(betIdDb)
    if (!betIsJoinable) {
      return { success: false, error: "The bet is no longer joinable" };
    }
    // make sure the user has enough money
    const moneyBefore = (
      await db.query(`SELECT money FROM public.user WHERE id = $1`, [
        userIdDb
      ])
    ).rows[0].money;
    
    if (moneyBefore < amount) {
      return { success: false, error: "You don't have enough money" };
    }
    // subtract money from currentUser
    await db.query(
      `UPDATE public.user SET money = money - $1 WHERE id = $2`,
      [amount, userIdDb]
    );
    // make transaction entry
    await db.query(
      "INSERT INTO public.transaction (amount, user_id, type, bet_id, datetime) VALUES ($1, $2, $3, $4, now())",
      [amount, userIdDb, "MINUS", betIdDb]
    );
    // create participation
    await db.query(
      "INSERT INTO public.participant (bet_id, user_id, support, amount) VALUES ($1, $2, $3, $4) RETURNING id",
      [betIdDb, userIdDb, support, amount]
    );
    return { success: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("error in joinBet", e);
    return { success: false };
  }
};

module.exports = joinBet;
