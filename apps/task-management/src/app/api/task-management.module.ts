import {
  MiddlewareConsumer,
  Module,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthMiddleware } from './middleware';
import { AllExceptionsFilter } from './filters';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { dataSourceConfig } from './database/dbconfig';
import * as migrations from './database/migrations';
import * as entities from './models';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const AppDataSource = new DataSource(
          dataSourceConfig({
            migrations: Object.values(migrations),
            entities: Object.values(entities),
          }),
        );
        await AppDataSource.initialize();
        return AppDataSource.options;
      },
    }),
    ,
    AuthModule,
    UserModule,
    TaskModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        enableDebugMessages: true,
        transformOptions: { enableImplicitConversion: true },
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
    {
      provide: APP_FILTER,
      useValue: new AllExceptionsFilter(),
    },
  ],
})
export class TaskManagementModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
