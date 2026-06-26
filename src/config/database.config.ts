export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

function parseDatabaseUrl(url: string): Omit<DatabaseConfig, 'ssl'> & { sslMode?: string } {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const sslMode = parsed.searchParams.get('sslmode') ?? undefined;

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: database || 'railway',
    sslMode,
  };
}

function isRemoteHost(host: string): boolean {
  return host.includes('rlwy.net') || host.includes('railway.app') || host.includes('railway.internal');
}

function envFlag(value?: string): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function fromExplicitEnv(): DatabaseConfig | null {
  if (!process.env.DB_HOST?.trim()) return null;

  const host = process.env.DB_HOST.trim();
  const explicitSsl = process.env.DB_SSL;
  const ssl = envFlag(explicitSsl) || (!explicitSsl && isRemoteHost(host));

  return {
    host,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME?.trim() ?? 'postgres',
    password: String(process.env.DB_PASSWORD ?? ''),
    database: process.env.DB_DATABASE?.trim() ?? 'railway',
    ssl,
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const explicit = fromExplicitEnv();
  if (explicit) return explicit;

  const databaseUrl = process.env.DATABASE_URL;
  const explicitSsl = process.env.DB_SSL;

  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    const database = process.env.DB_DATABASE?.trim() || parsed.database;
    const ssl =
      envFlag(explicitSsl) ||
      (!explicitSsl &&
        (parsed.sslMode === 'require' ||
          parsed.sslMode === 'verify-full' ||
          isRemoteHost(parsed.host)));

    return {
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password,
      database,
      ssl,
    };
  }

  const host = 'shinkansen.proxy.rlwy.net';
  const ssl = envFlag(explicitSsl) || (!explicitSsl && isRemoteHost(host));

  return {
    host,
    port: parseInt(process.env.DB_PORT ?? '37330', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: String(process.env.DB_PASSWORD ?? ''),
    database: process.env.DB_DATABASE ?? 'railway',
    ssl,
  };
}
