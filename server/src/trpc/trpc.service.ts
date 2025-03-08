import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';

import { Ollama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

import { formatSQL, parseSQL } from '@server/sql_validator';

const model = new Ollama({
  baseUrl: 'http://localhost:11434',
  model: 'deepseek-r1:1.5b',
  temperature: 0,
  maxRetries: 3,
});

type Strategy = {
  name: string;
  description: string;
};

export type ThoughtStrategies = {
  think: string;
  strategies: (Strategy & { query: string; tables: string[] })[];
};

function cleanJSONResponse(jsonString: string): string {
  const start = jsonString.indexOf('{');
  const end = jsonString.lastIndexOf('}');

  if (start === -1 || end === -1) return jsonString;

  return jsonString.substring(start, end + 1);
}

function parseThink(response: string): {
  think: string;
  rest: string;
} {
  const thinkStart = response.indexOf('<think>');
  const thinkEnd = response.indexOf('</think>');

  if (thinkStart === -1 || thinkEnd === -1)
    return { think: '', rest: response };

  const think = response.substring(thinkStart + 7, thinkEnd).trim();
  const rest = response.substring(thinkEnd + 8).trim();
  return { think, rest };
}

const strategySchema = z
  .object({
    strategies: z
      .array(
        z.object({
          name: z.string().describe('Name of the strategy'),
          description: z.string().describe('Description of the strategy'),
        }),
      )
      .describe('Array of strategies'),
  })
  .describe('Schema for strategies');

const strategySchemaTemplate = `
{{
"strategies": [
{{
"name": "Strategy Name",
"description": "Strategy Description"
}}
]
}}`;

function parseStrategies(content: string): Strategy[] {
  try {
    return strategySchema.parse(JSON.parse(content)).strategies;
  } catch (error) {
    throw new Error(`Failed to parse strategies: ${(error as Error).message}`);
  }
}

type Implementation = {
  query: string;
  tables: string[];
};

async function fixJSONResponse<Response>(
  parser: (content: string) => Response,
  responseModel: string,
  error: Error,
  schema: string,
  tries: number = 3,
): Promise<Response> {
  console.log(`Fixing implementation response with schema ${schema}`);
  const prompt = PromptTemplate.fromTemplate(`
Correct the following JSON response to conform a valid JSON object using the provided schema.

**JSON Response (to be corrected):**
{response}

**Error Encountered:**
{error}

**Target JSON Schema:**
\`\`\`json
{schema}
\`\`\`

**Instructions:**
* Identify and fix all errors in the JSON response based on the schema.
* Ensure the corrected JSON is valid and adheres strictly to the schema.
* Return ONLY the corrected JSON.
* Check if the JSON contains all required commas (','), and ensure they are properly placed.
`);
  for (let i = 0; i < tries; i++) {
    console.log(`Trying to fix JSON response (try ${i + 1}/${tries})`);
    const { rest: response } = parseThink(
      await prompt.pipe(model).invoke({
        response: responseModel,
        schema: schema,
        error,
      }),
    );
    const clearJSONResponse = cleanJSONResponse(response);
    try {
      return parser(clearJSONResponse);
    } catch (error) {
      console.error(
        `Failed to parse implementation (try ${i + 1}/${tries}):
${(error as Error).message}
${clearJSONResponse}
`,
      );
    }
  }
  throw new Error(`Failed to fix implementation response`);
}

const implementationSchema = z
  .object({
    query: z.string().describe('The SQL query to execute'),
    tables: z.array(z.string()).describe('The tables involved in the query'),
  })
  .describe('The implementation details');

const implementationSchemaTemplate = `{{
"query": "Modified SQL query",
"tables": [
"List of modified table creation statements, including indexes"
]
}}`;

function parseImplementation(content: string): Implementation {
  try {
    return implementationSchema.parse(JSON.parse(content));
  } catch (error) {
    throw new Error(
      `Failed to parse implementation: ${(error as Error).message}`,
    );
  }
}

async function tryParse<Response>(
  content: string,
  parser: (content: string) => Response,
  schema: string,
): Promise<Response> {
  try {
    return parser(content);
  } catch (error) {
    console.error(`Failed to parse response: ${(error as Error).message}`);
    return await fixJSONResponse(parser, content, error as Error, schema);
  }
}

async function tryParseImplementation(
  content: string,
): Promise<Implementation> {
  return await tryParse(
    content,
    parseImplementation,
    implementationSchemaTemplate,
  );
}

async function tryParseStrategies(content: string): Promise<Strategy[]> {
  return await tryParse(content, parseStrategies, strategySchemaTemplate);
}

async function validateSql({
  query,
  tables,
}: {
  query: string;
  tables: string[];
}) {
  const { success: isQueryValid, value: validQuery } = await parseSQL(query);
  const { success: isValidTables, value: validTables } = (
    await Promise.all(tables.map((table) => parseSQL(table)))
  ).reduce(
    (acc, result) => ({
      success: acc.success && result.success,
      value: [...acc.value, result.value],
    }),
    { success: true, value: [] },
  ) as { success: boolean; value: string[] };
  if (!isQueryValid) throw new Error(`Invalid query: ${validQuery}`);
  if (!isValidTables)
    throw new Error(`Invalid tables: ${validTables.join(', ')}`);
  console.log('Validated SQL query and tables');
}

async function fixQuery(
  query: string,
  originalError: string,
  tries: number = 3,
): Promise<string> {
  console.log('Fixing SQL query...');
  let error = originalError;
  const prompt = PromptTemplate.fromTemplate(`
# Task: SQL Query Debugging and Optimization

You are an expert SQL developer tasked with debugging, fixing, and optimizing the provided SQL query.

## Instructions:

1.  **Analyze the Query and Error:** Carefully examine the provided SQL query and the reported error message.
2.  **Diagnose the Issue:** Identify the specific cause of the error (syntax, logic, data type mismatch, etc.).
3.  **Correct the Query:** Fix the identified error(s) to ensure the query executes without errors and produces the intended result.
4.  **Optimize for Performance:** If possible, optimize the query for better performance (e.g., improve indexing, reduce redundant operations, use appropriate joins).
5.  **Explain the Changes:** Briefly explain the changes made and the reasoning behind them.
6.  **Provide the Corrected Query:** Return only the corrected SQL query without any additional text or comments.

## Example:

**Original Query:**
SELECT * FROM users WHEREIN age > 18;

**Error:**
Syntax error: 'WHEREIN' is not a valid keyword.

**Corrected Query:**
SELECT * FROM users WHERE age > 18;

**Explanation:**
'WHEREIN' was replaced with 'WHERE', which is the correct SQL keyword for filtering rows.

---

## Case:

**SQL (to be corrected):**
{query}

**Error Encountered:**
{error}

**Corrected SQL Query:**
`);
  for (let i = 0; i < tries; i++) {
    console.log(`Trying to fix SQL query... ${i + 1}/${tries}`);
    const { rest: fixedQuery } = parseThink(
      await prompt.pipe(model).invoke({ query, error }),
    );
    const { success, value } = await parseSQL(fixedQuery);
    if (success) return fixedQuery;
    error = value;
  }
  throw new Error('Failed to correct query');
}

async function validateImplementation({
  query,
  tables,
}: Implementation): Promise<Implementation> {
  const { success: querySuccess, value: queryValue } = await parseSQL(query);
  const fixedQuery = querySuccess ? query : await fixQuery(query, queryValue);
  const fixedTables = await Promise.all(
    tables.map(async (table) => {
      const { success: tableSuccess, value: tableValue } =
        await parseSQL(table);
      return tableSuccess ? table : await fixQuery(table, tableValue);
    }),
  );
  return { query: fixedQuery, tables: fixedTables };
}

async function formatImplementation({
  query,
  tables,
}: Implementation): Promise<Implementation> {
  const { success: querySuccess, value: queryValue } = await formatSQL(query);
  const formattedQuery = querySuccess
    ? query
    : await fixQuery(query, queryValue);
  const formattedTables = await Promise.all(
    tables.map(async (table) => {
      const { success: tableSuccess, value: tableValue } =
        await formatSQL(table);
      return tableSuccess ? table : await fixQuery(table, tableValue);
    }),
  );
  return { query: formattedQuery, tables: formattedTables };
}

@Injectable()
export class TrpcService {
  trpc = initTRPC.create();
  procedure = this.trpc.procedure;
  router = this.trpc.router;
  mergeRouters = this.trpc.mergeRouters;

  async implementStrategies(
    strategy: Strategy,
    query: string,
    tables: string[],
  ): Promise<{ query: string; tables: string[] }> {
    const prompt = PromptTemplate.fromTemplate(`
      # Task: SQL Query Optimization and Modification

      You are an expert SQL developer tasked with optimizing and modifying existing SQL queries based on provided strategies.

      ## Instructions:

      1.  **Understand the Strategy:** Carefully analyze the provided "Strategy" and "Description".
      2.  **Apply the Strategy:** Implement the specified strategy to the given "Query" and consider the existing "Tables".
      3.  **Generate Output:** Return the modified SQL query and any necessary table modifications (including index creation, table alterations, etc.) in the JSON format specified below.
      4.  **Preserve Original Query:** If the strategy does not necessitate changes to the original query, return the original query in the "Query" field of the JSON output.
      5.  **Secure the SQL generation:** Ensure that the generated SQL is valid and secure.

      ## Input Format:

      Strategy: {strategy_name}
      Description: {strategy_description}
      Query: {query}
      Tables: {tables}

      ## Output Format:

      \`\`\`json
      ${implementationSchemaTemplate}
      \`\`\`

      ## Example:

      ### Input:
      Strategy: Indexing
      Description: Indexing on 'age' column in 'users' table
      Query: SELECT * FROM users WHERE age > 18;
      Tables: CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT, email VARCHAR(255));

      ### Output:
      \`\`\`json
      {{
        "query": "SELECT * FROM users WHERE age > 18;",
        "tables": [
          "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), age INT, email VARCHAR(255)); CREATE INDEX idx_users_age ON users(age);"
        ]
      }}
      \`\`\`
    `);
    const response = await prompt.pipe(model).invoke({
      strategy_name: strategy.name,
      strategy_description: strategy.description,
      query,
      tables: tables.map((table) => table.replace(';', '').trim()).join(';\n'),
    });

    const { rest } = parseThink(response);
    const content = cleanJSONResponse(rest);

    try {
      console.log('Parsing implementation response...');
      const implementation = await tryParseImplementation(content);
      return await validateImplementation(implementation).then(
        formatImplementation,
      );
    } catch (error) {
      throw new Error(
        `Failed to parse implementation response ${content}: ${(error as Error).message}`,
      );
    }
  }

  async profile(query: string, tables: string[]): Promise<ThoughtStrategies> {
    await validateSql({ query, tables });

    const prompt = PromptTemplate.fromTemplate(`
      # Postgres SQL Profile
      Generate an enumerated list of strategies to improve the memory and execution time of the PostgreSQL query {query}.
      Consider the following tables:
      ${tables.map((table) => `- ${table}`).join('\n')}

      Available strategies:
      - Refactoring: Simplify complex queries or functions.
      - Indexing:
        - Create indexes on columns that are frequently used in WHERE, JOIN, or ORDER BY clauses.
        - Select the most convenient index type for each column.
        - Optimize index size and storage.
        - Use partial indexes for selective data.
        - Use covering indexes to reduce disk I/O.
      - Partitioning: Divide large tables into smaller, more manageable pieces.
      - Query Optimization: Rewrite queries to reduce the number of rows scanned.
      - Caching: Use caching mechanisms to store frequently accessed data.

      # Output
      Output format only JSON without Markdown, or any additional text.
      The response must be in the following schema:
      ${strategySchemaTemplate}

      ## Example:

      ### Input
      - Query: SELECT * FROM users WHERE age > 18;
      - Tables:
        - Create table users (id serial primary key, name varchar(100), age integer);
        - Create table orders (id serial primary key, user_id integer references users(id), product varchar(100), quantity integer);

      ### Output
      {{
        "strategies": [
          {{
            "name": "Indexing",
            "description": "Create an index on the 'age' column in the 'users' table to improve the performance of the query."
          }}
        ]
      }}
      `);
    const chain = prompt.pipe(model);
    const response = await chain.invoke({ query });

    const { think, rest } = parseThink(response);
    const content = cleanJSONResponse(rest);

    try {
      const strategis = await tryParseStrategies(content);
      console.log(`Found ${strategis.length} strategies`);
      const strategiesWithImplementation = await Promise.all(
        strategis.map(async (strategy, index) => {
          console.log(`Processing strategy ${index + 1}: ${strategy.name}`);
          const implementation = await this.implementStrategies(
            strategy,
            query,
            tables,
          );
          return { ...strategy, ...implementation };
        }),
      );
      console.log(`Processing completed`);
      return { think, strategies: strategiesWithImplementation };
    } catch (error) {
      throw new Error(`
        Unable to parse strategies from response.
        Response: ${content}
        Error: ${(error as Error).message}
      `);
    }
  }
}
