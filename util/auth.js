const passport = require("passport");
const keys = require("../config/keys");
const { db } = require("../db");
const bodyParser = require("body-parser");
const session = require("express-session");
const jwt = require("jsonwebtoken");
require("./passport");

const log = (req, res, next) => {
  //eslint-disable-next-line no-console
  console.log("hit route: ", req && req.route && req.route.path);
  next();
};

const stopSession = req => {
  req.session = null;
  req.user = null;
  req.logout();
};

const assignAuthRoutes = app => {
  app.use(
    session({
      secret: keys.sessionSecret,
      resave: false,
      saveUninitialized: false
    })
  );
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/hello", (req, res) => {
    res.send("<div>Hello</div>");
  });

  app.get(
    "/auth/spotify",
    log,
    passport.authenticate("spotify", {
      scope: ["user-read-email", "user-read-private"],
      showDialog: true
    }),
    () => {}
  );

  app.get(
    "/auth/spotify/callback",
    log,
    passport.authenticate("spotify", {
      successRedirect: "/auth/spotify/redirect",
      failureRedirect: "/auth/spotify/failed"
    }),
    () => {}
  );

  const dispatch = `function dispatch(type, payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type: type, payload: payload}))
  }`;

  app.get("/auth/spotify/redirect", log, async (req, res) => {
    // create or login user
    // if user does not exist, create and get user id, write user id into jwt
    // if user does exist, get user id and write user id into jwt

    const resp = await db.query(
      `SELECT id FROM public.user WHERE spotify_profile_id = $1`,
      [req.user.spotifyProfileId]
    );
    let userId;
    if (!resp.rows.length) {
      userId = (
        await db.query(
          `INSERT INTO public.user (spotify_profile_id, spotify_access_token, datetime, money) VALUES ($1, $2, now(), 100) returning id`,
          [req.user.spotifyProfileId, req.user.spotifyAccessToken]
        )
      ).rows[0].id;
    } else {
      await db.query("UPDATE public.user SET spotify_access_token = $1", [
        req.user.spotifyAccessToken
      ]);
      userId = resp.rows[0].id;
    }

    const token = jwt.sign(
      {
        data: { userId }
      },
      keys.jwtSecret,
      { expiresIn: "1h" }
    );

    stopSession(req);
    res.send(`
      <html>
          <body>
              <script>
                  ${dispatch}
                  document.addEventListener('DOMContentLoaded', function(){ 
                      console.log("${token}")
                      dispatch('AUTHENTICATED', {
                          jwt: '${token}'
                      })
                  })
              </script>
          </body>
      </html>`);
  });

  app.get("/auth/spotify/failed", log, (req, res) => {
    stopSession(req);
    res.send(`
      <html>
          <body>
              <script>
                  ${dispatch}
                  document.addEventListener('DOMContentLoaded', function(){ 
                      dispatch('AUTHENTICATION_FAILED')
                  })
              </script>
          </body>
      </html>`);
  });
};

module.exports = assignAuthRoutes;
