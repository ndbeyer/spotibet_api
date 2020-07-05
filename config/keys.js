const keys =
  process.env.ENVIRONMENT === "production"
    ? require("./prod")
    : require("./dev");
module.exports = keys;
