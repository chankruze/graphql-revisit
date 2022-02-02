/*
Author: chankruze (chankruze@geekofia.in)
Created: Wed Feb 02 2022 00:13:13 GMT+0530 (India Standard Time)

Copyright (c) geekofia 2022 and beyond
*/


const { ApolloServer } = require('apollo-server-express');
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
const { execute, subscribe } = require('graphql');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const gql = require('graphql-tag');
const express = require('express');
const http = require('http');
const { PubSub } = require('graphql-subscriptions');
const { generateId, cryptPassword, comparePassword, getAge } = require('./utils');

// schema
// type checking
// query vs mutation
// objects
// arrays
// arguments
const typeDefs = gql`
    type Query {
        hello(name: String): String!
        user(userInfo: UserInfo): User!
    }

    type User {
        id: ID!
        username: String!
        password: String!
        email: String!
        dob: String!
        age: Int
    }

    type Error {
        message: String!
        field: String!
    }

    type Response {
        errors: [Error!]
        user: User
    }

    input UserInfo {
        username: String!
        email: String!
        password: String!
        dob: String!
    }

    type Mutation {
        register(userInfo: UserInfo): Response!
        login(userInfo: UserInfo): Boolean!
    }

    type Subscription {
        newUser: User!
    }
`;

const NEW_USER = 'NEW_USER';

// resolvers
const resolvers = {
    Subscription: {
        newUser: {
            subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(NEW_USER)
        }
    },
    User: {
        age: parent => getAge(parent.dob)
    },
    Query: {
        hello: (_, { name }) => `Hello ${name}!`,
        user: async (_, { userInfo }) => ({
            ...userInfo,
            id: generateId(),
            password: await cryptPassword(userInfo.password),
        })
    },
    Mutation: {
        login: async (_, { userInfo: { password } }) => {
            const hashedPass = await cryptPassword(password);
            return await comparePassword(password, hashedPass);;
        },
        register: async (_, { userInfo }, { pubsub }) => {
            const { password } = userInfo;
            const newUser = {
                ...userInfo,
                id: generateId(),
                password: await cryptPassword(password),
            }

            pubsub.publish(NEW_USER, { newUser });

            return {
                errors: [],
                user: newUser
            }

        }
    }
};

(async function startApolloServer(typeDefs, resolvers) {
    // Required logic for integrating with Express
    const app = express();
    const httpServer = http.createServer(app);
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const pubsub = new PubSub();

    // Same ApolloServer initialization as before, plus the drain plugin.
    const server = new ApolloServer({
        schema,
        context: ({ req, res }) => ({ req, res, pubsub }),
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), {
            async serverWillStart() {
                return {
                    async drainServer() {
                        subscriptionServer.close();
                    }
                };
            }
        }],
    });

    const subscriptionServer = SubscriptionServer.create({
        // This is the `schema` we just created.
        schema,
        // These are imported from `graphql`.
        execute,
        subscribe,
        // Providing `onConnect` is the `SubscriptionServer` equivalent to the
        // `context` function in `ApolloServer`. Please [see the docs](https://github.com/apollographql/subscriptions-transport-ws#constructoroptions-socketoptions--socketserver)
        // for more information on this hook.
        async onConnect(
            connectionParams,
            webSocket,
            context
        ) {
            console.log('Connected!');
            // If an object is returned here, it will be passed as the `context`
            // argument to your subscription resolvers.
            return {
                pubsub
            }
        },
        onDisconnect(webSocket, context) {
            console.log('Disconnected!')
        },
    }, {
        // This is the `httpServer` we created in a previous step.
        server: httpServer,
        // This `server` is the instance returned from `new ApolloServer`.
        path: server.graphqlPath,
    });

    // More required logic for integrating with Express
    await server.start();
    server.applyMiddleware({
        app,

        // By default, apollo-server hosts its GraphQL endpoint at the
        // server root. However, *other* Apollo Server packages host it at
        // /graphql. Optionally provide this to match apollo-server.
    });

    // Modified server startup
    await new Promise(resolve => httpServer.listen({ port: 4000 }, resolve));
    console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
})(typeDefs, resolvers);


// Notes:
// 1. Querries are run parallel
// 2. Mutations are run serially
// 3. parameters: (parent, args, context, info) => {}