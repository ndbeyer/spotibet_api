const keys = require("../config/keys");
const { Pool } = require("pg");

// eslint-disable-next-line no-console
console.log("process.env.ENVIRONMENT", process.env.ENVIRONMENT)

const pool = new Pool(
  process.env.ENVIRONMENT === "production"
    ? {
        connectionString: keys.dbUrl
      }
    : {
        port: keys.dbPort,
        host: keys.dbHost,
        database: keys.dbName,
        user: keys.dbUser,
        password: keys.dbPassword
      }
);

const dbAdapter = {
  query: async (sql, args) => {
    return await pool.query(sql, args);
  },
  end: pool.end
};

module.exports = {
  db: dbAdapter
};