const keys = process.env.ENVIRONMENT === "production" ? require('./prod') : require('./dev')
// eslint-disable-next-line no-console
console.log("keys", keys)
module.exports = keys