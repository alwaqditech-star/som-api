import { DataSource } from 'typeorm';

import { config } from 'dotenv';

import { getDatabaseConfig } from './database.config';



config();



const db = getDatabaseConfig();



export default new DataSource({

  type: 'postgres',

  host: db.host,

  port: db.port,

  username: db.username,

  password: db.password,

  database: db.database,

  entities: ['src/**/*.entity.ts'],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,

  ssl: db.ssl ? { rejectUnauthorized: false } : false,

});

