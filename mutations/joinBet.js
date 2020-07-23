const { ApolloError } = require("apollo-server-express");
const { db } = require("../db");
const User = require("../classes/User");
const Bet = require("../classes/Bet");
const Transaction = require("../classes/Transaction");

const valiDateJoinDate = async (betIdDb) => {
  const { joinable } = (
    await db.query(
      `SELECT (now() at time zone 'utc') <= start_date AS joinable FROM public.bet WHERE id = $1`,
      [betIdDb]
    )
  ).rows[0];
  return joinable;
};

const joinBet = async ({ betId, support, amount }, currentUser) => {
  const userIdDb = User.decryptId(currentUser.id);
  const betIdDb = Bet.decryptId(betId);
  //make sure the bet is still joinable
  const betIsJoinable = await valiDateJoinDate(betIdDb);
  if (!betIsJoinable) throw new ApolloError("BET_NOT_JOINABLE");
  // make sure the user has enough money
  const moneyBefore = (
    await db.query(`SELECT money FROM public.user WHERE id = $1`, [userIdDb])
  ).rows[0].money;
  if (moneyBefore < amount) throw new ApolloError("NOT_ENOUGH_MONEY");
  // subtract money from currentUser
  await db.query(`UPDATE public.user SET money = money - $1 WHERE id = $2`, [
    amount,
    userIdDb,
  ]);
  // make transaction entry
  const response = await db.query(
    "INSERT INTO public.transaction (amount, user_id, type, bet_id, datetime) VALUES ($1, $2, $3, $4, now()) RETURNING id",
    [amount, userIdDb, "MINUS", betIdDb]
  );
  const transactionId = response.rows[0].id;
  const transaction = await Transaction.gen(transactionId);
  // create participation
  await db.query(
    "INSERT INTO public.participant (bet_id, user_id, support, amount) VALUES ($1, $2, $3, $4) RETURNING id",
    [betIdDb, userIdDb, support, amount]
  );
  const bet = await Bet.gen(betId);
  return { bet, transaction };
};

module.exports = joinBet;
