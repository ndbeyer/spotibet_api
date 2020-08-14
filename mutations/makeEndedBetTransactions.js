const { db } = require("../db");
const axios = require("axios");
const keys = require("../config/keys");
const lodash = require("lodash");

const getEndedBets = async (input) => {
  const ids = Array.isArray(input) ? input : [input];
  return (
    await db.query(
      `SELECT 
        id,
        artist_id AS "artistId", 
        end_date::text AS "endDate"
        FROM public.bet 
        WHERE transactions = false 
        AND (now() at time zone 'utc') > end_date ${
          input ? "AND id = ANY($1)" : ""
        }`,
      input ? [ids] : []
    )
  ).rows;
};

const makeEndedBetTransactions = async (input) => {
  try {
    const endedBets = await getEndedBets(input);
    if (!endedBets.length) {
      return { success: true };
    }
    const betsPerArtist = lodash.groupBy(endedBets, "artistId");
    // go through all artist-grouped bets, get stats for each artist
    for (const artistId in betsPerArtist) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await axios.get(
        `${keys.statServerURI}/artist:${artistId}`,
        {
          headers: {
            Authorization: keys.statServerSecret,
          },
        }
      );
      const bets = betsPerArtist[artistId];
      // go through all bets of each artist and determine the listeners_at_end_date
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        bets.map(async (bet) => {
          const endDate = bet.endDate.substr(0, 10);
          const endDateEntry =
            data &&
            data.payload &&
            data.payload.filter(
              ({ fetch_date_start }) =>
                fetch_date_start.substr(0, 10) === endDate
            )[0];
          await db.query(
            "UPDATE public.bet SET listeners_at_end_date = $1 WHERE id = $2",
            [endDateEntry.monthly_listeners, bet.id]
          );

          // determine winners and losers

          const supportersWin =
            bet.type === "HIGHER"
              ? bet.listeners_at_end_date >= bet.listeners
              : bet.listeners_at_end_date < bet.listeners;

          const winningParticipants = (
            await db.query(
              "SELECT user_id, amount FROM public.participant WHERE bet_id = $1 AND support = $2",
              [bet.id, supportersWin]
            )
          ).rows;
          const loosingParticipants = (
            await db.query(
              "SELECT user_id, amount FROM public.participant WHERE bet_id = $1 AND support = $2",
              [bet.id, !supportersWin]
            )
          ).rows;

          const lostMoney = loosingParticipants
            .map(({ amount }) => amount)
            .reduce((a, b) => a + b, 0);
          const allWinnerAmounts = winningParticipants
            .map(({ amount }) => amount)
            .reduce((a, b) => a + b, 0);

          const serviceFee = lostMoney * 0.1;
          const lostMoneyToDistribute = lostMoney - serviceFee;
          const winnersFactor = lostMoneyToDistribute / allWinnerAmounts;

          // !!! updating user.money, transactions and bet.transactions must be done in one query

          // update User.money / update transactions / update Bet.transactions
          await Promise.all(
            winningParticipants.map(async ({ amount, user_id }) => {
              const addedCash =
                Number(amount) + Number(amount) * Number(winnersFactor);
              await Promise.all([
                await db.query(
                  "UPDATE public.user SET money = money + $1 WHERE id = $2",
                  [addedCash, user_id]
                ),
                await db.query(
                  "INSERT INTO public.transaction (amount, user_id, type, bet_id, datetime) VALUES ($1, $2, $3, $4, now())",
                  [addedCash, user_id, "PLUS", bet.id]
                ),
              ]);
            })
          );

          await db.query(
            "UPDATE public.bet SET transactions = true WHERE id = $1",
            [bet.id]
          );

          return { success: true };
        })
      );
    }
    return { success: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("!!!makeEndedBetTransactions error: ", e);
    return { success: false, error: e.message };
  }
};

module.exports = makeEndedBetTransactions;
