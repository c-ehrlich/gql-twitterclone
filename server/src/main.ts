import 'reflect-metadata';
import { createServer } from './utils/createServer';

async function main() {
  // start our server
  const { app, server } = await createServer();

  app.get('/healthcheck', async () => 'ok');

  await server.start();
  
  app.register(
    server.createHandler({
      cors: false,
    })
  );

  await app.listen({
    port: 4000,
  });
  console.log(`Server ready at http://localhost:4000${server.graphqlPath}`);
}

main();
