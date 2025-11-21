import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('ENV LOADED BY TYPEORM CLI:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.POSTGRES_USER,
  pass: process.env.POSTGRES_PASSWORD,
  db: process.env.POSTGRES_DB,
});

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['apps/api/models/*.entity.ts'],
  migrations: ['apps/api/database/migrations/*.ts'],
  migrationsTableName: 'CUSTOM_MIGRATION_TABLE',
});
