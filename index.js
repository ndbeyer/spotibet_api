const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");
const jwt = require("jsonwebtoken");

const assignAuthRoutes = require("./util/auth");
const Playlist = require("./classes/Playlist");
const Artist = require("./classes/Artist");
const Bet = require("./classes/Bet");
const User = require("./classes/User");
const makeEndedBetTransactions = require("./mutations/makeEndedBetTransactions");
const makeInvalidBetTransactions = require("./mutations/makeInvalidBetTransactions");
const makeUserBetTransactions = require("./mutations/makeUserBetTransactions");
const syncArtistMonthlyListenersHistory = require("./mutations/syncArtistMonthlyListenersHistory");
const { createBet, joinBet, jwtForRefreshToken } = require("./mutations");
const initializeDb = require("./util/initializeDb");
const { apiJwtSecret } = require("./config/keys");

(async () => {
  await initializeDb();
})();

const app = express();

assignAuthRoutes(app);

const typeDefs = gql`
  type Query {
    currentUser: User
    playlists: [Playlist!]!
    artistsOfPlaylist(playlistId: ID!): [Artist!]!
    artist(id: ID!): Artist!
    bet(id: ID!): Bet!
    allBets: [Bet!]!
  }
  type Mutation {
    createBet(
      artistId: ID!
      artistName: String!
      type: BetType!
      listeners: Int!
      endDate: String!
      spotifyUrl: String!
    ): CreateBetReturnType
    joinBet(betId: ID!, support: Boolean!, amount: Int!): JoinBetReturnType
    jwtForRefreshToken(refreshToken: ID!): JwtForRefreshTokenResponse
    makeEndedBetTransactions(ids: [ID!]): Response!
    makeInvalidBetTransactions(ids: [ID!]): Response!
    makeUserBetTransactions(userId: ID): Response!
    syncArtistMonthlyListenersHistory(artistId: ID!): Response!
  }
  type JwtForRefreshTokenResponse {
    success: Boolean!
    jwt: String!
    refreshToken: String!
  }
  type Response {
    success: Boolean!
  }
  type CreateBetReturnType {
    bet: Bet
  }
  type JoinBetReturnType {
    bet: Bet
    transaction: Transaction
  }
  type User {
    id: ID!
    spotify_profile_id: String!
    spotify_access_token: String!
    playlists: [Playlist!]!
    bets: [Bet!]!
    money: Float!
    transactions: [Transaction!]!
  }
  type Playlist {
    id: ID!
    name: String!
    image: String
  }
  type Artist {
    id: ID!
    name: String!
    image: String
    popularity: Int
    followers: Int
    spotifyUrl: String
    monthlyListeners: Int
    joinableBets: [Bet!]
    monthlyListenersHistory: [MonthlyListenersHistoryItem!]!
  }
  type Bet {
    id: ID!
    artistId: ID!
    listeners: Int!
    type: BetType!
    startDate: String!
    endDate: String!
    artist: Artist!
    quote: Float
    supportersAmount: Int!
    contradictorsAmount: Int!
    currentUserAmount: Int
    currentUserSupports: Boolean
    status: BetStatus!
    listenersAtEndDate: Int
    listenersAtStartDate: Int
    transactions: Boolean!
  }
  type Transaction {
    id: ID!
    amount: Float!
    betId: ID!
    userId: ID!
    type: TransactionType!
    datetime: String!
  }
  type MonthlyListenersHistoryItem {
    id: ID!
    monthlyListeners: Int!
    dateTime: String!
  }
  enum TransactionType {
    PLUS
    MINUS
  }
  enum BetType {
    HIGHER
    LOWER
  }
  enum BetStatus {
    JOINABLE
    INVALID
    RUNNING
    ENDED
  }
`;

const protect = (currentUser) => {
  if (!currentUser) {
    throw new Error("UNAUTHENTICATED");
  }
};

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    currentUser: async (_, __, { currentUser }) => {
      protect(currentUser);
      return currentUser;
    },
    playlists: async (_, __, { currentUser }) => {
      protect(currentUser);
      return await Playlist.ofCurrentUser(currentUser);
    },
    artistsOfPlaylist: async (_, { playlistId }, { currentUser }) => {
      protect(currentUser);
      return await Playlist.artistsOfPlaylist(playlistId, currentUser);
    },
    artist: async (_, { id }, { currentUser }) => {
      protect(currentUser);
      return await Artist.gen(id, currentUser);
    },
    bet: async (_, { id }, { currentUser }) => {
      protect(currentUser);
      return await Bet.gen(id);
    },
    allBets: async (_, __, { currentUser }) => {
      protect(currentUser);
      return await Bet.allBets();
    },
  },
  Mutation: {
    createBet: async (_, args, { currentUser }) => {
      protect(currentUser);
      return await createBet(args, currentUser);
    },
    joinBet: async (_, args, { currentUser }) => {
      protect(currentUser);
      return await joinBet(args, currentUser);
    },
    makeEndedBetTransactions: async (_, { ids }, { currentUser }) => {
      protect(currentUser);
      return await makeEndedBetTransactions(ids);
    },
    makeInvalidBetTransactions: async (_, { ids }, { currentUser }) => {
      protect(currentUser);
      return await makeInvalidBetTransactions(ids);
    },
    makeUserBetTransactions: async (_, { userId }, { currentUser }) => {
      protect(currentUser);
      return await makeUserBetTransactions(userId, currentUser);
    },
    jwtForRefreshToken: async (_, args) => {
      return await jwtForRefreshToken(args);
    },
    syncArtistMonthlyListenersHistory: async (_, args, currentUser) => {
      protect(currentUser);
      return await syncArtistMonthlyListenersHistory(args);
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const token =
      req.headers.authorization &&
      req.headers.authorization.replace("Bearer ", "");
    if (process.env.ENVIRONMENT !== "production") {
      // allow to login as certain user by only providing test:userId string as Bearer
      if (token.includes("test")) {
        const userId = Number(token.replace("test:", ""));
        const currentUser = await User.gen(userId);
        return { currentUser };
      }
    }
    try {
      const { id } = jwt.verify(token, apiJwtSecret);
      if (id) {
        const currentUser = await User.gen(id);
        return { currentUser };
      } else {
        return { currentUser: null };
      }
    } catch (err) {
      return { currentUser: null };
    }
  },
});

server.applyMiddleware({ app, path: "/" });

app.listen({ port: process.env.PORT || 4000 });
