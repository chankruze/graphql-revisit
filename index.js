/*
Author: chankruze (chankruze@geekofia.in)
Created: Wed Feb 02 2022 00:13:13 GMT+0530 (India Standard Time)

Copyright (c) geekofia 2022 and beyond
*/

const { ApolloServer, gql } = require('apollo-server');
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
`;


// resolvers
const resolvers = {
    User: {
        age: parent => getAge(parent.dob)
    },
    Query: {
        hello: (parent, { name }, context, info) => `Hello ${name}!`,
        user: async (parent, { userInfo }, context) => ({
            ...userInfo,
            id: generateId(),
            password: await cryptPassword(userInfo.password),
        })
    },
    Mutation: {
        login: async (parent, { userInfo: { password } }, context) => {
            const hashedPass = await cryptPassword(password);
            return await comparePassword(password, hashedPass);;
        },
        register: async (parent, { userInfo }, context) => {
            const { password } = userInfo;
            return {
                errors: [],
                user: {
                    ...userInfo,
                    id: generateId(),
                    password: await cryptPassword(password),
                }
            }

        }
    }
};

const server = new ApolloServer({ typeDefs, resolvers, context: ({ req, res }) => ({ req, res }) });

// start the server: server.listen({port: 4000})
server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
});



// Notes:
// 1. Querries are run parallel
// 2. Mutations are run serially
// 3. parameters: (parent, args, context, info) => {}