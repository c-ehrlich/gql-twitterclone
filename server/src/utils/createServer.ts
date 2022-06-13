import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-fastify';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { execute, GraphQLSchema, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { buildSchema } from 'type-graphql';
import fastifyCors from '@fastify/cors';
import fastifyCookies from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import UserResolver from '../modules/user/user.resolver';
import { User } from '@prisma/client';
import { bearerAuthChecker } from './bearerAuthChecker';

const app = fastify({
  // turn this on to get WAY more details in error messages
  // logger: true,
});

app.register(fastifyCors, {
  // we need this to set cookies in the browser
  credentials: true,
  origin: (origin, cb) => {
    if (
      !origin ||
      [
        'http://localhost:3000',
        'https://studio.apollographql.com',
        // TODO add environment variable
      ].includes(origin)
    ) {
      return cb(null, true);
    }

    return cb(new Error('Not allowed'), false);
  },
});

app.register(fastifyCookies, { parseOptions: {} });

app.register(fastifyJwt, {
  secret: 'change-me', // TODO use env
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

function fastifyAppClosePlugin(app: FastifyInstance): ApolloServerPlugin {
  return {
    async serverWillStart() {
      return {
        async drainServer() {
          await app.close();
        },
      };
    },
  };
}

type CtxUser = Omit<User, 'password'>;

async function buildContext({
  request,
  reply,
  connectionParams,
}: {
  request?: FastifyRequest;
  reply?: FastifyReply;
  connectionParams?: {
    Authorization: string;
  };
}) {
  if (connectionParams || !request) {
    try {
      return {
        user: app.jwt.verify<CtxUser>(connectionParams?.Authorization || ''),
      };
    } catch (e) {
      return { user: null };
    }
  }

  try {
    const user = await request?.jwtVerify<CtxUser>();
    return { request, reply, user };
  } catch (e) {
    return { request, reply, user: null };
  }
}

export type Context = Awaited<ReturnType<typeof buildContext>>;

export async function createServer() {
  // need: root query
  // root query needs root resolver
  const schema = await buildSchema({
    resolvers: [UserResolver],
    authChecker: bearerAuthChecker,
  });

  const server = new ApolloServer({
    schema,
    plugins: [
      fastifyAppClosePlugin(app),
      // Graceful shutdown
      // https://www.apollographql.com/docs/apollo-server/api/plugin/drain-http-server/
      ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
    ],
    context: buildContext,
  });

  return { app, server };
}

const subscriptionServer = ({
  schema,
  server,
}: {
  schema: GraphQLSchema;
  server: ApolloServer;
}) => {
  return SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      async onConnect(connectionParams: { Authorization: string }) {
        return buildContext({ connectionParams });
      },
    },
    {
      server,
      path: '/graphql',
    }
  );
};
