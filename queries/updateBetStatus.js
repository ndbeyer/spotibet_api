// const { db } = require("../db");
// const evaluateEndedBets = require("./evaluateEndedBets");

// const updateBetStatus = async betIds => {
//   try {
//     const [
//       joinableToRunning,
//       joinableToEnded,
//       joinableToInvalid,
//       runningToEnded
//     ] = await Promise.all([
//       (
//         await db.query(
//           `
//       SELECT * FROM public.bet WHERE id = ANY
//       ( 
//         SELECT id FROM 
//           (
//             SELECT bet.id, COUNT(DISTINCT support) FROM public.bet bet
//             LEFT JOIN public.participant participant
//             ON bet.id = participant.bet_id
//             WHERE status = 'JOINABLE'
//             AND (now() at time zone 'utc') > start_date + interval '1 day'
//             AND (now() at time zone 'utc') < end_date
//             ${betIds ? "AND bet.id = ANY($1)" : ""}
//             GROUP BY bet.id
//           ) as sub
//         WHERE count = 2
//       )
//       `,
//           betIds ? [betIds] : []
//         )
//       ).rows,
//       (
//         await db.query(
//           `
//       SELECT * FROM public.bet WHERE id = ANY
//       ( 
//         SELECT id FROM 
//           (
//             SELECT bet.id, COUNT(DISTINCT support) FROM public.bet bet
//             LEFT JOIN public.participant participant
//             ON bet.id = participant.bet_id
//             WHERE status = 'JOINABLE'
//             AND (now() at time zone 'utc') > end_date
//             ${betIds ? "AND bet.id = ANY($1)" : ""}
//             GROUP BY bet.id
//           ) as sub
//         WHERE count = 2
//       )
//       `,
//           betIds ? [betIds] : []
//         )
//       ).rows,
//       (
//         await db.query(
//           `
//     SELECT * FROM public.bet WHERE id = ANY
//     ( 
//       SELECT id FROM 
//         (
//           SELECT bet.id, COUNT(DISTINCT support) FROM public.bet bet
//           LEFT JOIN public.participant participant
//           ON bet.id = participant.bet_id
//           WHERE status = 'JOINABLE'
//           AND (now() at time zone 'utc') > start_date + interval '1 day'
//           ${betIds ? "AND bet.id = ANY($1)" : ""}
//           GROUP BY bet.id
//         ) as sub
//       WHERE count < 2
//     )
//     `,
//           betIds ? [betIds] : []
//         )
//       ).rows,
//       (
//         await db.query(
//           `
//       SELECT * FROM public.bet 
//       WHERE status = 'RUNNING'
//       AND (now() at time zone 'utc') > end_date
//       ${betIds ? "AND id = ANY($1)" : ""}
//       `,
//           betIds ? [betIds] : []
//         )
//       ).rows
//     ]);

//     console.log(
//       "joinableToRunning",
//       joinableToRunning,
//       "\njoinableToEnded",
//       joinableToEnded,
//       "\njoinableToInvalid",
//       joinableToInvalid,
//       "\nrunningToEnded",
//       runningToEnded
//     );

//     if (joinableToRunning.length) {
//       await db.query(
//         "UPDATE public.bet SET status = 'RUNNING' WHERE id = ANY($1)",
//         [joinableToRunning.map(({ id }) => id)]
//       );
//     }
//     if (joinableToEnded.length) {
//       const ids = joinableToEnded.map(({ id }) => id);
//       await db.query(
//         "UPDATE public.bet SET status = 'ENDED' WHERE id = ANY($1)",
//         [ids]
//       );
//       await evaluateEndedBets(ids);
//     }
//     if (joinableToInvalid.length) {
//       await db.query(
//         "UPDATE public.bet SET status = 'INVALID' WHERE id = ANY($1)",
//         [joinableToInvalid.map(({ id }) => id)]
//       );
//     }
//     if (runningToEnded.length) {
//       const ids = runningToEnded.map(({ id }) => id);
//       await db.query(
//         "UPDATE public.bet SET status = 'ENDED' WHERE id = ANY($1)",
//         [ids]
//       );
//       await evaluateEndedBets(ids);
//     }

//     return { success: true };
//   } catch (e) {
//     console.log("updateBetStatus error: ", e);
//     return { success: false, error: e.message };
//   }
// };

// module.exports = updateBetStatus;
