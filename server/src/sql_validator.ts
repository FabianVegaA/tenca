import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as tmp from 'tmp';

const execute = promisify(exec);

type Result<Success, Error> =
  | { success: true; value: Success }
  | { success: false; value: Error };

type Command = 'parse' | 'fix' | 'format';

export class SQLParser {
  private sqlfluffPath: string;

  constructor(sqlfluffPath: string) {
    this.sqlfluffPath = sqlfluffPath;
  }

  private async runSqlfluff<Success>(
    command: Command,
    sql: string,
    callback: (
      output: string,
      stdout: string,
      stderr: string,
    ) => Result<Success, string>,
  ): Promise<Result<Success, string>> {
    console.log(`Running SQLFluff ${command} command...`);
    const { name: tempFile, removeCallback } = tmp.fileSync();

    try {
      await fs.writeFile(tempFile, sql);
      const output = await execute(
        `${this.sqlfluffPath} ${command} ${tempFile} --dialect=postgres --config /Users/fabianveal/dev/autoprofiler/.sqlfluff`,
      );

      if (output.stdout.includes('==== formatting violations ====')) {
        return { success: false, value: output.stderr };
      }

      return callback(
        await fs.readFile(tempFile, 'utf8'),
        output.stdout,
        output.stderr,
      );
    } finally {
      removeCallback();
    }
  }

  public async parseSQL(sql: string): Promise<Result<null, string>> {
    return this.runSqlfluff('parse', sql, () => ({
      success: true,
      value: null,
    }));
  }

  public async formatSQL(sql: string): Promise<Result<string, string>> {
    return this.runSqlfluff('format', sql, (output) => ({
      success: true,
      value: output,
    }));
  }
}

const defaultSqlfluffPath = '/opt/homebrew/bin/sqlfluff';
const defaultParser = new SQLParser(defaultSqlfluffPath);

export async function parseSQL(sql: string): Promise<Result<null, string>> {
  return defaultParser.parseSQL(sql);
}

export async function formatSQL(sql: string): Promise<Result<string, string>> {
  return defaultParser.formatSQL(sql);
}
