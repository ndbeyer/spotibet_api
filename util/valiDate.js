const { db } = require("../db");

const msPerDay = 1000 * 60 * 60 * 24;
const joinDays = 1 // time to join a bet (in days)
const minDifference = 2 // time that must be between now and the endDate when creating the bet (in days)

const getStartOfNthDay = (n=0) => {
  const startOfNthDay = (Math.floor(Date.now()/(msPerDay))+n)*msPerDay
  const nextLocalDateTime = new Date(startOfNthDay)
  return nextLocalDateTime
}

const valiDateEndDate = (endDate, nowInMs) => {
  if (typeof endDate !== "string") {
    // eslint-disable-next-line no-console
    console.log("valiDateEndDate expects an ISOString as input argument");
    return false;
  }
  const endDateInMs = Date.parse(endDate);
  if (endDateInMs % msPerDay !== 0) {
    // only allow endDates at utc times 00:00:00 (HH:mm:ss)
    // eslint-disable-next-line no-console
    console.log("valiDateEndDate: bets can only end at 00:00:00 utc");
    return false
  }
  if (endDateInMs - nowInMs < msPerDay * minDifference) {
    // only allow endDates that are at least 48h in the future
    // eslint-disable-next-line no-console
    console.log(`valiDateEndDate: bets can only in end in >= ${minDifference*24}hours from now`);
    return false
  }
  return true
};

const valiDateJoinDate = async (betIdDb) => {
    const {joinable} = (await db.query(`SELECT (now() at time zone 'utc') <= start_date + interval '${joinDays} day' AS joinable FROM public.bet WHERE id = $1`, [betIdDb])).rows[0]
    return joinable
}

const betIsJoinable = (startDate) => {
  const diffStartToNow = Date.now() - Date.parse(startDate)
  if(diffStartToNow > (msPerDay*joinDays)) {
    return false
  } else {
    return true
  }
}

const betEnded = (endDate) => {
  const timeSinceEnding = Date.now() - Date.parse(endDate)
  if(timeSinceEnding>0) {
    return true
  } else {
    return false
  }
}

module.exports = {
  valiDateEndDate, valiDateJoinDate, betIsJoinable, betEnded, getStartOfNthDay
};
