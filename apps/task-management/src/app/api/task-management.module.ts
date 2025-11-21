import {
  MiddlewareConsumer,
  Module,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AuthMiddleware } from './middleware';
import { AllExceptionsFilter } from './filters';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
