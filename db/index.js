const { Pool } = require("pg");

const pool = new Pool(
  process.env.ENVIRONMENT === "production"
    ? {
      connectionString: process.env.DATABASE_URL, // will be injected from heroku
      ssl: {
        rejectUnauthorized: false
      },
    }
    : {
      port: 5432,
      host: "localhost",
      database: "audioshares_api",
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
