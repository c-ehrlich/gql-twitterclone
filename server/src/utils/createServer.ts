import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import fastify from 'fastify';
import { buildSchema } from 'type-graphql'
import UserResolver from '../modules/user/user.resolver';

const app = fastify();

function buildContext() {}

export async function createServer() {
  // need: root query
  // root query needs root resolver
  const schema = await buildSchema({
    resolvers: [UserResolver],
  });

  const server = new ApolloServer({
    schema,
    plugins: [
      // Graceful shutdown
      // https://www.apollographql.com/docs/apollo-server/api/plugin/drain-http-server/
      ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
    ],
    context: buildContext,
  });

  return { app, server };
}
