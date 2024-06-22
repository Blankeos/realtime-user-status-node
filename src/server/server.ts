//
// How to serve Vike (SSR middleware) via a Hono server.
// https://github.com/phonzammi/vike-hono-example/blob/main/server/index.ts
import { privateConfig } from '@/config.private';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { renderPage } from 'vike/server';
import { appRouter } from './_app';
import { createContext } from './context';
import { attachWebsocketHandler } from './websocket';

const app = new Hono();

// Health checks
app.get('/up', async (c) => {
  return c.newResponse('🟢 UP', { status: 200 });
});

// For the Backend APIs
app.use(
  '/api/*',
  trpcServer({
    router: appRouter,
    createContext(opts, c) {
      return createContext(c);
    },
  })
);

// if (privateConfig.NODE_ENV === 'production') {
// In prod, serve static files.
app.use(
  '/*',
  serveStatic({
    root: `./dist/client/`,
  })
);
// }

// For the Frontend + SSR
app.get('*', async (c, next) => {
  const pageContextInit = {
    urlOriginal: c.req.url,
    request: c.req,
    response: c.res,
  };
  const pageContext = await renderPage(pageContextInit);
  const { httpResponse } = pageContext;
  if (!httpResponse) {
    return next();
  } else {
    const { body, statusCode, headers } = httpResponse;
    headers.forEach(([name, value]) => c.header(name, value));
    c.status(statusCode);

    return c.body(body);
  }
});

// Returning errors.
app.onError((_, c) => {
  const errorMessage = 'Error: ' + c.error?.message || 'Something went wrong';
  console.log(errorMessage);
  return c.json(
    {
      error: {
        message: errorMessage,
      },
    },
    500
  );
});

if (privateConfig.NODE_ENV === 'production') {
  const server = serve(
    {
      fetch: app.fetch,
      port: privateConfig.PORT,
    },
    (info) => {
      console.log('Server running at', info.port);
    }
  );

  attachWebsocketHandler(server);
}

export default {
  fetch: app.fetch,
  port: privateConfig.PORT,
};
