/*
Author: chankruze (chankruze@geekofia.in)
Created: Wed Feb 02 2022 00:13:13 GMT+0530 (India Standard Time)

Copyright (c) geekofia 2022 and beyond
*/

const { ApolloServer, gql } = require('apollo-server');

// schema
// type checking
// query vs mutation
// objects
// arrays
// arguments
const typeDefs = gql`
    type Query {
        hello(name: String): String!
        user: User!
    }

    type User {
        id: ID!
        username: String!
        email: String!
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
        password: String!
        age: Int
    }

    type Mutation {
        register(userInfo: UserInfo): Response!
        login(userInfo: UserInfo): String!
    }
`;

// resolvers
const resolvers = {
    Query: {
        hello: (parent, { name }, context, info) => `Hello ${name}!`,
        user: () => ({
            id: '1',
            username: 'chankruze',
            email: 'chankruze@gmail.com'
        })
    },
    Mutation: {
        // (parent, args, context, info) => {}
        login: async (parent, { userInfo: { username } }, context, info) => {
            // console.log(context);
            // check password
            // await checkPassword(username, password);
            // return token
            return username;
        },
        register: () => ({
            errors: [{
                field: "username",
                message: "bad"
            },
            {
                field: "email",
                message: "already exists"
            }],
            user: {
                id: '1',
                username: 'chankruze',
                email: 'chankruze@gmail.com'
            }
        })
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