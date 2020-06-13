const keys = require("../config/keys");
const { Pool } = require("pg");

const pool = new Pool(
  process.env.ENVIRONMENT === "production"
    ? {
        connectionString: keys.dbUrl,
      }
    : {
        port: 5432,
        host: "localhost",
        database: "test",
        user: "andreasbeyer",
        password: "",
      }
);

const dbAdapter = {
  query: async (sql, args) => {
    return await pool.query(sql, args);
  },
  end: pool.end,
};

module.exports = {
  db: dbAdapter,
};
