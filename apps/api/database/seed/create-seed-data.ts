import { Logger } from '@nestjs/common';
import { Seeder } from 'typeorm-extension';
import { RoleEntity } from '../../models/roles.entity';
import { type DataSource } from 'typeorm';
import { CreateRoleDto } from '../../../../libs/data/dto';
import { UserRoleOptions } from '../../../../libs/data/type';
import { OrganizationEntity, UserEntity } from '../../models';
import { hashPassword } from '../../helper/password-hash';

export class CreateSeedData implements Seeder {
  logger = new Logger(CreateSeedData.name);
  async run(connection: DataSource): Promise<void> {
    const passwordSuffix = '1234!!';
    try {
      this.logger.debug('Creating Adam...');
      const repoUser = connection.getRepository<UserEntity>(UserEntity);
      const owner = await repoUser.save({
        username: 'Adam',
        email: 'adam@example.com',
        passwordHash: await hashPassword('Adam' + passwordSuffix),
      });

      const orgRepo =
        connection.getRepository<OrganizationEntity>(OrganizationEntity);
      this.logger.debug('Creating Eden Garden...');
      const organization = await orgRepo.save({
        name: `Frankie's Demo`,
        description: `Welcome to my demo`,
        createdBy: owner.id,
      });

      const repoRole = connection.getRepository<RoleEntity>(RoleEntity);
      const roles = Object.values(UserRoleOptions);
      let rolesDb = [];
      if (roles.length) {
        this.logger.debug('Creating roles...');
        rolesDb = await repoRole.save(
          roles.map((role) => {
            const createRoleDto: CreateRoleDto = {
              organizationId: organization.id,
              name: role,
              description: role + ' description',
            };
            return createRoleDto;
          }),
        );
      }

      const usersToSave = [];
      for (const role of rolesDb) {
        usersToSave.push({
          username: role.name,
          email: role.name + '@example.com',
          passwordHash: await hashPassword(role.name + passwordSuffix),
          roleId: role.id,
          organization: organization.id,
        });
      }
      const usersDb = await repoUser.save(usersToSave);
      this.logger.debug(
        `Seeding complete, ${usersDb.length} Users, ${rolesDb.length} Roles and 1 Organization seeded!`,
      );
    } catch (e) {
      this.logger.error(`Error running seed ${JSON.stringify(e)}`);
    }
  }
}
