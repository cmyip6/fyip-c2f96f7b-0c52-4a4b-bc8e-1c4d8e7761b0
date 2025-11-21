import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Seeder } from 'typeorm-extension';
import { RoleEntity } from '../../models/roles.entity';
import { CreateRoleDto } from 'apps/task-management/src/libs/data/dto/create-role.dto';
import { UserRole } from 'apps/task-management/src/libs/data/type';

export class CreateRoles implements Seeder {
  logger = new Logger(CreateRoles.name);
  async run(connection: DataSource): Promise<void> {
    const repoRole = connection.getRepository<RoleEntity>(RoleEntity);
    const roles = Object.values(UserRole);
    try {
      if (roles.length) {
        await repoRole.save(
          roles.map((role) => {
            const createRoleDto: CreateRoleDto = {
              name: role,
              description: role + ' mock description',
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
