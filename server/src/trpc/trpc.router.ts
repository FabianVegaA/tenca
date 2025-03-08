import { INestApplication, Injectable } from '@nestjs/common';
import { TrpcService } from '@server/trpc/trpc.service';
import { z } from 'zod';
import * as trpcExpress from '@trpc/server/adapters/express';

@Injectable()
export class TrpcRouter {
  constructor(private readonly trpc: TrpcService) {}

  appRouter = this.trpc.router({
    hello: this.trpc.procedure
      .input(z.object({ name: z.string().optional() }))
      .query(({ input }) => {
        return `Hello ${input.name ? input.name : `Bilbo`}`;
      }),
    profile: this.trpc.procedure
      .input(z.object({ query: z.string(), tables: z.array(z.string()) }))
      .output(
        z.object({
          think: z.string(),
          strategies: z.array(
            z.object({
              name: z.string(),
              description: z.string(),
              query: z.string(),
              tables: z.array(z.string()),
            }),
          ),
        }),
      )
      .mutation(async ({ input: { query, tables } }) => {
        console.log(
          `Fetching data from ${query} and ${tables.join(',;\n')}...`,
        );
        return await this.trpc.profile(query, tables);
      }),
  });

  async applyMiddleware(app: INestApplication) {
    console.log('Initializing TRPC router...');
    app.use(
      `/trpc`,
      trpcExpress.createExpressMiddleware({ router: this.appRouter }),
    );
  }
}

export type AppRouter = TrpcRouter['appRouter'];
