import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
  username: process.env.TEST_POSTGRES_USER,
  password: process.env.TEST_POSTGRES_PASSWORD,
  database: process.env.TEST_POSTGRES_DB,
  entities: ['apps/api/models/*.entity.ts'],
  migrations: ['apps/api/database/migrations/*.ts'],
  migrationsTableName: 'CUSTOM_MIGRATION_TABLE',
});
