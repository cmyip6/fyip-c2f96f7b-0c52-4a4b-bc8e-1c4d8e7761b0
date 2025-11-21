import { Logger } from '@nestjs/common';
import { Seeder } from 'typeorm-extension';
import { RoleEntity } from '../../models/roles.entity';
import { type DataSource } from 'typeorm';
import { CreateRoleDto } from 'src/libs/data/dto';
import { UserRoleOptions } from 'src/libs/data/type';

export class CreateSeedData implements Seeder {
  logger = new Logger(CreateSeedData.name);
  async run(connection: DataSource): Promise<void> {
    const repoRole = connection.getRepository<RoleEntity>(RoleEntity);
    const roles = Object.values(UserRoleOptions);
    try {
      if (roles.length) {
        await repoRole.save(
          roles.map((role) => {
            const createRoleDto: CreateRoleDto = {
              name: role,
              description: role + ' description',
            };
            return createRoleDto;
          }),
        );
      }
    } catch (e) {
      this.logger.error(`Error running seed ${JSON.stringify(e)}`);
    }
  }
}
