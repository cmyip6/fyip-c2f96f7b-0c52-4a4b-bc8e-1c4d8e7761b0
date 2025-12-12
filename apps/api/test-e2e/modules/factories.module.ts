import { Global, Module } from '@nestjs/common';
import * as allFactories from '../factory';

@Global()
@Module({
  providers: [...Object.values(allFactories)],
  exports: [...Object.values(allFactories)],
})
export class FactoriesModule {}
