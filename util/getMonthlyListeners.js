const getBody = require("./getBody");
const cheerio = require("cheerio");

const getMonthlyListeners = async (spotifyUrl) => {
  const artistUrl = `${spotifyUrl}/about`;
  const body = await getBody(artistUrl);
  const $ = cheerio.load(body);
  const monthlyListeners = $(".insights__column__number")
    .map(function() {
      return $(this).text();
    })
    .get()[0];
  return monthlyListeners ? Number(monthlyListeners.replace(",", "")) : null;
};

module.exports = getMonthlyListeners
