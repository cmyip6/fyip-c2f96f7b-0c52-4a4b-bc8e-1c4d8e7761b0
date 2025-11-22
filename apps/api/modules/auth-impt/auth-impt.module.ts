import { Global, Module } from '@nestjs/common';
import { AuthImptService } from './auth-impt.service';
import { AUTHORIZATION_SERVICE } from '@api/guard/policy-guard';

@Global()
@Module({
  providers: [{ provide: AUTHORIZATION_SERVICE, useClass: AuthImptService }],
  exports: [AUTHORIZATION_SERVICE],
})
export class AuthImptModule {}
