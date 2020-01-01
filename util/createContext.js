const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const User = require("../classes/User");

const createContext = async ({ req, res }) => {
  const token =
    req.headers.authorization &&
    req.headers.authorization.replace("Bearer ", "");
  try {
    if (!token) {
      // eslint-disable-next-line no-console
      console.log("jwt verification failed");
      throw new Error("jwt missing");
    }
    const { data } = jwt.verify(token, keys.jwtSecret);
    const currentUser = await User.gen(data.userId);
    return { currentUser };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log("jwt verification failed");
    res.send(
      `{"errors":[{"extensions":{"code":"UNAUTHENTICATED"},"message":"INVALID_JWT"}]}`
    ); // make sure the client understands that there is some problem with authentication
    throw new Error("you must be logged in"); // if context creation fails, stop every subsequent action
  }
};

module.exports = createContext;
