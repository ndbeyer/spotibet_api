const atob = require("atob")
const btoa = require("btoa")

module.exports.encrypt = (type, identifier) => btoa(`${type}:${identifier}`)
module.exports.decrypt  = (string) => atob(string).split(":")[1]