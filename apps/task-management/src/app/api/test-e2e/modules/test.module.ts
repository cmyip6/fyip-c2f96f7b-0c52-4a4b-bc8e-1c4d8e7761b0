import { Module } from '@nestjs/common';
import * as allTests from '../test';

@Module({
  imports: [{ providers: Object.values(allTests), imports: [] }],
})
export class TestModule {}
