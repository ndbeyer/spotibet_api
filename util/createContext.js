const { AuthenticationError } = require("apollo-server-express");

const jwt = require("jsonwebtoken");
const { apiJwtSecret } = require("../config/keys");
const User = require("../classes/User");

const createContext = async ({ req }) => {
  const token =
    req.headers.authorization &&
    req.headers.authorization.replace("Bearer ", "");
  try {
    const { id } = jwt.verify(token, apiJwtSecret);
    if (id) {
      const currentUser = await User.gen(id);
      return { currentUser };
    } else {
      throw new AuthenticationError("UNAUTHENTICATED");
    }
  } catch (err) {
    throw new AuthenticationError("UNAUTHENTICATED");
  }
};

module.exports = createContext;
