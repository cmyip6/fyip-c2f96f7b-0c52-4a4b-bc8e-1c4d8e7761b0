import { DataSource, MixedList } from 'typeorm';
import { Logger } from '@nestjs/common';

export class TypeORMMigrations {
  private readonly logger = new Logger(TypeORMMigrations.name);

  constructor(private readonly dataSource: DataSource) {}

  public async run(
    dropSchema: boolean,
    executeMigrations: boolean,
    runSeeds: boolean,
    seedsTypes: MixedList<Function>,
  ): Promise<void> {
    this.logger.log('Checking if database should be dropped');
    if (dropSchema === true) {
      await this.dropDatabase();
    } else {
      this.logger.log('Database will NOT be dropped');
    }

    this.logger.log('Checking if migrations should be executed');
    if (executeMigrations === true) {
      await this.runMigrations();
    } else {
      this.logger.log('Migrations will NOT be executed');
    }

    this.logger.log('Checking if seeds should be executed');
    if (runSeeds === true) {
      await this.runSeeds(seedsTypes);
    } else {
      this.logger.log('Seeds will NOT be executed');
    }
  }

  private async runMigrations(): Promise<void> {
    this.logger.log('Running migrations');
    const migrations = await this.dataSource.runMigrations();

    for (const migration of migrations) {
      this.logger.log('Migration executed: ' + migration.name);
    }
  }

  private async dropDatabase(): Promise<void> {
    this.logger.log('Dropping database');
    await this.dataSource.dropDatabase();
  }

  private async runSeeds(seedsTypes: MixedList<Function>): Promise<void> {
    for (const seedType in seedsTypes) {
      const classCode = seedsTypes[seedType];
      const seederInstance = new classCode();
      this.logger.log('Running seed: ' + seederInstance.constructor.name);
      await seederInstance.run(null, this.dataSource);
    }
  }
}
