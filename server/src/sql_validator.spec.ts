import { parseSQL, SQLParser } from './sql_validator';
import fs from 'fs';
import path from 'path';
import { exec, ChildProcess, ExecOptions } from 'child_process';

jest.mock('child_process');
jest.mock('fs');

describe('SQLParser', () => {
  const mockExec = exec as jest.MockedFunction<typeof exec>;
  const mockMkdirTempSync = fs.mkdtempSync as jest.MockedFunction<
    typeof fs.mkdtempSync
  >;
  const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<
    typeof fs.writeFileSync
  >;
  const mockUnlinkSync = fs.unlinkSync as jest.MockedFunction<
    typeof fs.unlinkSync
  >;
  const mockRmdirSync = fs.rmdirSync as jest.MockedFunction<
    typeof fs.rmdirSync
  >;

  const tempDir = '/tmp/sqlfluff-test';
  const tempFile = path.join(tempDir, 'sql.sql');

  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdirTempSync.mockReturnValue(tempDir);
    mockExec.mockImplementation(
      (
        command: string,
        options?:
          | ExecOptions
          | ((error: Error | null, stdout: string, stderr: string) => void)
          | null,
        callback?: (
          error: Error | null,
          stdout: string,
          stderr: string,
        ) => void,
      ) => {
        const process: ChildProcess = {
          stdout: {
            on: jest.fn(),
          },
          stderr: {
            on: jest.fn(),
          },
          on: jest
            .fn()
            .mockImplementation(
              (
                event: string,
                closeCallback: (code: number | Error) => void,
              ) => {
                if (event === 'close') {
                  closeCallback(0);
                }
              },
            ),
          kill: jest.fn(),
          pid: 1,
          stdin: null,
          connected: false,
          disconnect: jest.fn(),
          ref: jest.fn(),
          unref: jest.fn(),
        };
        if (typeof options === 'function') {
          options(null, '', '');
        } else if (typeof callback === 'function') {
          callback(null, '', '');
        }
        return process;
      },
    );
  });

  describe('parseSQL method', () => {
    it('should return success if SQL is valid', async () => {
      mockExec.mockImplementation(
        (
          command: string,
          options?:
            | ExecOptions
            | ((error: Error | null, stdout: string, stderr: string) => void)
            | null,
          callback?: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          const process: ChildProcess = {
            stdout: {
              on: jest
                .fn()
                .mockImplementation(
                  (event: string, dataCallback: (data: string) => void) => {
                    if (event === 'data') {
                      dataCallback('');
                    }
                  },
                ),
            },
            stderr: {
              on: jest
                .fn()
                .mockImplementation(
                  (event: string, dataCallback: (data: string) => void) => {
                    if (event === 'data') {
                      dataCallback('');
                    }
                  },
                ),
            },
            on: jest
              .fn()
              .mockImplementation(
                (
                  event: string,
                  closeCallback: (code: number | Error) => void,
                ) => {
                  if (event === 'close') {
                    closeCallback(0);
                  }
                },
              ),
            kill: jest.fn(),
            pid: 1,
            stdin: null,
            connected: false,
            disconnect: jest.fn(),
            ref: jest.fn(),
            unref: jest.fn(),
          };
          if (typeof options === 'function') {
            options(null, '', '');
          } else if (typeof callback === 'function') {
            callback(null, '', '');
          }
          return process;
        },
      );

      const result = await new SQLParser('test').parseSQL('SELECT 1;');

      expect(result).toEqual({ success: true, value: null });
      expect(mockMkdirTempSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(tempFile, 'SELECT 1;');
      expect(mockExec).toHaveBeenCalled();
      expect(mockUnlinkSync).toHaveBeenCalledWith(tempFile);
      expect(mockRmdirSync).toHaveBeenCalledWith(tempDir);
    });

    it('should return failure if SQL is invalid', async () => {
      const errorOutput = '==== parsing violations ====\nError: Syntax error';
      mockExec.mockImplementation(
        (
          command: string,
          options?:
            | ExecOptions
            | ((error: Error | null, stdout: string, stderr: string) => void)
            | null,
          callback?: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          const process: ChildProcess = {
            stdout: {
              on: jest
                .fn()
                .mockImplementation(
                  (event: string, dataCallback: (data: string) => void) => {
                    if (event === 'data') {
                      dataCallback(errorOutput);
                    }
                  },
                ),
            },
            stderr: {
              on: jest
                .fn()
                .mockImplementation(
                  (event: string, dataCallback: (data: string) => void) => {
                    if (event === 'data') {
                      dataCallback('');
                    }
                  },
                ),
            },
            on: jest
              .fn()
              .mockImplementation(
                (
                  event: string,
                  closeCallback: (code: number | Error) => void,
                ) => {
                  if (event === 'close') {
                    closeCallback(0);
                  }
                },
              ),
            kill: jest.fn(),
            pid: 1,
            stdin: null,
            connected: false,
            disconnect: jest.fn(),
            ref: jest.fn(),
            unref: jest.fn(),
          };
          if (typeof options === 'function') {
            options(null, errorOutput, '');
          } else if (typeof callback === 'function') {
            callback(null, errorOutput, '');
          }
          return process;
        },
      );

      const result = await new SQLParser('test').parseSQL('SELECT 1 FROM;');

      expect(result).toEqual({ success: false, value: errorOutput });
      expect(mockMkdirTempSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        tempFile,
        'SELECT 1 FROM;',
      );
      expect(mockExec).toHaveBeenCalled();
      expect(mockUnlinkSync).toHaveBeenCalledWith(tempFile);
      expect(mockRmdirSync).toHaveBeenCalledWith(tempDir);
    });

    it('should handle command execution errors', async () => {
      mockExec.mockImplementation(
        (
          command: string,
          options?:
            | ExecOptions
            | ((error: Error | null, stdout: string, stderr: string) => void)
            | null,
          callback?: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          const process: ChildProcess = {
            stdout: {
              on: jest.fn(),
            },
            stderr: {
              on: jest.fn(),
            },
            on: jest
              .fn()
              .mockImplementation(
                (event: string, callback: (code: number | Error) => void) => {
                  if (event === 'error') {
                    callback(new Error('Command execution failed'));
                  }
                },
              ),
            kill: jest.fn(),
            pid: 1,
            stdin: null,
            connected: false,
            disconnect: jest.fn(),
            ref: jest.fn(),
            unref: jest.fn(),
          };
          return process;
        },
      );

      await expect(new SQLParser('test').parseSQL('SELECT 1;')).rejects.toThrow(
        'Command execution failed',
      );
      expect(mockMkdirTempSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(tempFile, 'SELECT 1;');
      expect(mockExec).toHaveBeenCalled();
      expect(mockUnlinkSync).toHaveBeenCalledWith(tempFile);
      expect(mockRmdirSync).toHaveBeenCalledWith(tempDir);
    });
  });

  describe('parseSQL function', () => {
    it('should call the parseSQL method of SQLParser', async () => {
      const sql = 'SELECT 1;';
      const result = await parseSQL(sql);
      expect(result).toEqual({ success: true, value: null });
    });
  });
});
