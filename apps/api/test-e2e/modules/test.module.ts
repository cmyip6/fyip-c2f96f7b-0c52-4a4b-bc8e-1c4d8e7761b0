import { Module } from '@nestjs/common';

import * as allTests from '../test';
import { TaskManagementModule } from '../../task-management.module';

@Module({
  imports: [
    {
      module: TestModule,
      providers: Object.values(allTests),
      imports: [TaskManagementModule],
    },
  ],
})
export class TestModule {}
