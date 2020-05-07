const fetch = require("node-fetch");

const getBody = async (url) => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/html",
    },
  });
  if (response.status === 200) {
    const body = await response.text();
    return body;
  } else {
    return false;
  }
};

module.exports = getBody;
