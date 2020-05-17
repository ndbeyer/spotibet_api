const passport = require("passport");
const keys = require("../config/keys");
const { db } = require("../db");
const bodyParser = require("body-parser");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const { clientId, clientSecret } = require("../config/keys");

const log = (req, res, next) => {
  //eslint-disable-next-line no-console
  console.log("hit route: ", req && req.route && req.route.path);
  next();
};

const spotifyConfig = {
  clientId,
  clientSecret,
  redirectUri: "com.clientdemo:/oauthredirect",
};

const assignAuthRoutes = (app) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  app.get("/hello", (req, res) => {
    res.send("<div>Hello</div>");
  });

  app.post("/auth", (req, res) => {
    const { code, refreshToken } = req.body;
    console.log({ code, refreshToken });

    if (!code && !refreshToken) {
      return res.status(403).json({ success: false, data: "Not authorized" });
    }

    if (refreshToken) {
      //Refresh token is available, retrieve a new access token
      return res.json({ todo: "Refresh accesstoken" });
    }

    if (code) {
      //Retrieve new refresh token and access token
      return res.json({ todo: "Get refresh token & access token" });
    }
  });

  app.get("*", (_, res) =>
    res.status(404).json({ success: false, data: "endpoint not found." })
  );
};

module.exports = assignAuthRoutes;
