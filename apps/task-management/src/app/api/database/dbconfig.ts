import { DataSourceOptions, EntitySchema, MixedList } from 'typeorm';

const CUSTOM_MIGRATION_TABLE = 'CUSTOM_MIGRATION_TABLE';
export const CONNECTION_NAME = 'default';

export const dataSourceConfig = ({
  migrations,
  entities = [],
  migrationsTableName = CUSTOM_MIGRATION_TABLE,
}: {
  migrations: MixedList<Function | string>;
  entities: MixedList<Function | string | EntitySchema>;
  migrationsTableName?: string;
}): DataSourceOptions => {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    migrationsTableName,
    entities: entities ?? [
      'apps/task-management/src/app/api/models/*.entity.ts',
    ],
    migrations: migrations ?? [
      'apps/task-management/src/app/api/database/migrations/*.ts',
    ],
    name: CONNECTION_NAME,
    logging: process.env.NODE_ENV === 'development',
    maxQueryExecutionTime: 6000,

    extra: {
      max: 20,
      min: 4,
      idleTimeoutMillis: 240000,
      connectionTimeoutMillis: 2000,
    },
  };
};
