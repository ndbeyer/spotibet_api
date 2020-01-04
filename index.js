const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");

const keys = require("./config/keys");
const assignAuthRoutes = require("./util/auth");
const createContext = require("./util/createContext");
const Playlist = require("./classes/Playlist");
const Artist = require("./classes/Artist");
const Bet = require("./classes/Bet");
const makeEndedBetTransactions = require("./queries/makeEndedBetTransactions");
const makeInvalidBetTransactions = require("./queries/makeInvalidBetTransactions");
const makeUserBetTransactions = require("./queries/makeUserBetTransactions");
const { createBet, joinBet } = require("./mutations");
const initializeDb = require("./util/initializeDb");

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
    ): BetReturnType
    joinBet(betId: ID!, support: Boolean!, amount: Int!): Response
    makeEndedBetTransactions(ids: [ID!]): Response!
    makeInvalidBetTransactions(ids: [ID!]): Response!
    makeUserBetTransactions(userId: ID): Response!
  }
  type Response {
    success: Boolean!
  }
  type BetReturnType {
    success: Boolean!
    bet: Bet
    error: String
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
    image: String!
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
    pro: Int!
    contra: Int!
    currentUserAmount: Int
    currentUserSupports: Boolean
    status: BetStatus!
    listenersAtEndDate: Int
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

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    currentUser: async (parent, args, { currentUser }) => currentUser,
    playlists: async (parent, args, { currentUser }) =>
      await Playlist.ofCurrentUser(currentUser),
    artistsOfPlaylist: async (parent, { playlistId }, { currentUser }) =>
      await Artist.artistsOfPlaylist(playlistId, currentUser),
    artist: async (parent, { id }, { currentUser }) =>
      await Artist.gen(id, currentUser),
    bet: async (parent, { id }) => await Bet.gen(id),
    allBets: async () => await Bet.allBets()
  },
  Mutation: {
    createBet: async (parent, args, { currentUser }) =>
      await createBet(args, currentUser),
    joinBet: async (parent, args, { currentUser }) =>
      await joinBet(args, currentUser),
    makeEndedBetTransactions: async (_, { ids }) =>
      await makeEndedBetTransactions(ids),
    makeInvalidBetTransactions: async (_, { ids }) =>
      await makeInvalidBetTransactions(ids),
    makeUserBetTransactions: async (_, { userId }, { currentUser }) =>
      await makeUserBetTransactions(userId, currentUser)
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext
});

server.applyMiddleware({ app, path: "/" });

app.listen({ port: keys.apiPort }, () =>
  // eslint-disable-next-line no-console
  !process.env.ENVIRONMENT
    ? console.log(
        `🚀 Server ready at ${keys.apiEndpoint}:${keys.apiPort}${server.graphqlPath}`
      )
    : null
);
