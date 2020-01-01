const request = require("request");

const getBody = (url, timeout = 1000) =>
  new Promise(resolve => {
    request({ url, timeout }, (err, res, body) => {
      if (err) {
        resolve(false);
        return;
      }
      if(res.statusCode === 200) {
          resolve(body)
          return
      }
      resolve(false);
    });
  });

module.exports = getBody;
