const { db } = require("../db");

const getInvalidBets = async input => {
  const ids = Array.isArray(input) ? input : [input];
  return (
    await db.query(
      `
    SELECT * FROM public.bet WHERE id = ANY
    ( 
      SELECT id FROM 
        (
          SELECT bet.id, COUNT(DISTINCT support) FROM public.bet bet
          LEFT JOIN public.participant participant
          ON bet.id = participant.bet_id
          WHERE now() > start_date + interval '1 day'
          AND transactions = false
          ${input ? "AND bet.id = ANY($1)" : ""}
          GROUP BY bet.id
        ) as sub
      WHERE count < 2
    )`,
      input ? [ids] : []
    )
  ).rows;
};

const makeInvalidBetTransactions = async input => {
  try {
    const invalidBets = await getInvalidBets(input);
    console.log("invalidBets", invalidBets)
    if (!invalidBets.length) {
      return { success: true };
    }
    await Promise.all(
      invalidBets.map(async bet => {
        const participants = (
          await db.query(
            "SELECT user_id, bet_id, amount FROM public.participant WHERE bet_id = $1",
            [bet.id]
          )
        ).rows;
        await Promise.all(
          participants.map(async ({ user_id, amount, bet_id }) => {
            await Promise.all([
              await db.query(
                "UPDATE public.user SET money = money + $1 WHERE id = $2",
                [amount, user_id]
              ),
              await db.query(
                "INSERT INTO public.transaction (amount, user_id, type, bet_id, datetime) VALUES ($1, $2, 'PLUS', $3, now())",
                [amount, user_id, bet_id]
              )
            ]);
          })
        );

        await db.query(
          "UPDATE public.bet SET transactions = true WHERE id = $1",
          [bet.id]
        );
      })
    );
    return { success: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("!!!makeInvalidBetTransactions error: ", e);
    return { success: false, error: e.message };
  }
};

module.exports = makeInvalidBetTransactions;
