// ===========================================================================
// Kysely Client (Wraps around a DB connection via Hrana)
// - This is the preferred client for most queries.
// = For develop, we use the Bun dialect.
// ===========================================================================

import { privateConfig } from '@/config.private';

import { LibsqlDialect } from '@libsql/kysely-libsql';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';
import { DB } from './types'; // Generated by prisma.

const getDialect = () => {
  const isLocal = privateConfig.database.URL.includes('file:');

  // Because better-sqlite3 is weird.
  const cleanUrl = privateConfig.database.URL.replace('file:', '');
  console.log('Clean URL', cleanUrl);

  if (isLocal) {
    return new SqliteDialect({
      database: new Database(cleanUrl),
    });
  }

  console.log('Found remote database. Using LibsqlDialect.');
  return new LibsqlDialect({
    authToken: privateConfig.database.AUTH_TOKEN,
    url: privateConfig.database.URL,
  });
};

export const db = new Kysely<DB>({
  dialect: getDialect(),
});
