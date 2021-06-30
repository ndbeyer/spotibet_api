const getBody = require("./getBody");
const cheerio = require("cheerio");

const log = false

const getMonthlyListeners = async (spotifyUrl) => {
  const artistUrl = `${spotifyUrl}`;
  const body = await getBody(artistUrl);
  const $ = cheerio.load(body);
  const result = $('meta[name="description"]').attr('content')
  if (!result) return null
  const splitted = result.split(" ")
  const listenersText = splitted[splitted.length - 3]
  const multiplicator = listenersText.includes('K') ? 1000 : listenersText.includes('M') ? 1000 * 1000 : 1
  const hasPoint = listenersText.includes('.')
  const listenersNumber = Number(listenersText.replace('K', '').replace('M', '').replace(".", ''))
  const listeners = hasPoint ? listenersNumber * multiplicator / 10 : listenersNumber * multiplicator

  if (log) {
    console.log('>>> result', result)
    console.log('>>> listenersText', listenersText)
    console.log('>>> multiplicator', multiplicator)
    console.log('>>> listenersNumber', listenersNumber)
    console.log('>>> listeners', listeners)
  }

  return listeners

};

module.exports = getMonthlyListeners
