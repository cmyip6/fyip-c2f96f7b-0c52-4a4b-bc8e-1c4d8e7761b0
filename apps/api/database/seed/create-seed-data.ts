import { Logger } from '@nestjs/common';
import { Seeder } from 'typeorm-extension';
import { DataSource, DeepPartial } from 'typeorm';
import { hashPassword } from '../../helper/password-hash';
import { UserRoleOptions } from '@libs/data/type/user-role.enum';
import { UserEntity } from '@api/models/users.entity';
import { OrganizationEntity } from '@api/models/organizations.entity';
import { RoleEntity } from '@api/models/roles.entity';
import { OrganizationRelationEntity } from '@api/models/organization-relation.entity';
import { PermissionEntity } from '@api/models/permissions.entity';
import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { UserTypeOptions } from '@libs/data/type/user-type.enum';
import { PermissionLevelOptions } from '@libs/data/type/permission-level.enum';

export class CreateSeedData implements Seeder {
  logger = new Logger(CreateSeedData.name);
  async run(connection: DataSource): Promise<void> {
    try {
      this.logger.debug('Creating Adam...');
      const repoUser = connection.getRepository<UserEntity>(UserEntity);
      const owner = await repoUser.save({
        username: 'Adam',
        name: 'Mr. Adam',
        userType: UserTypeOptions.SUPER_USER,
        email: 'adam@example.com',
        passwordHash: await hashPassword('Adam1234!!'),
      });

      const orgRepo =
        connection.getRepository<OrganizationEntity>(OrganizationEntity);
      this.logger.debug('Creating Eden Garden...');
      const parentOrganization = await orgRepo.save({
        name: `Frankie's Space - parent`,
        description: `Welcome to my demo`,
        createdBy: owner.id,
      });

      const childOrganization = await orgRepo.save({
        name: `Frankie's space - child`,
        description: `Welcome to my demo`,
        createdBy: owner.id,
      });

      const orgRelationRepo =
        connection.getRepository<OrganizationRelationEntity>(
          OrganizationRelationEntity,
        );

      this.logger.debug(
        `Creating Company layers ( parent: ${parentOrganization.name}, child: ${parentOrganization.name})`,
      );
      await orgRelationRepo.save({
        parentOrganization,
        childOrganization,
      });

      const repoRole = connection.getRepository<RoleEntity>(RoleEntity);
      const roles = Object.values(UserRoleOptions);
      let rolesDb: RoleEntity[] = [];
      if (roles.length) {
        this.logger.debug('Creating roles...');
        rolesDb = await repoRole.save(
          roles.flatMap((role) => {
            return [parentOrganization, childOrganization].map(
              (organization) => {
                const createRoleDto = {
                  organizationId: organization.id,
                  name: role,
                  description: `${organization.name} ${role} description`,
                  createdBy: owner.id,
                };
                return createRoleDto;
              },
            );
          }),
        );
      }

      const repoPermission =
        connection.getRepository<PermissionEntity>(PermissionEntity);
      const permissionsToSave: DeepPartial<PermissionEntity>[] = [];
      this.logger.debug('Creating permissions...');
      for (const role of rolesDb) {
        for (const entityType of Object.values(EntityTypeOptions)) {
          switch (entityType) {
            case EntityTypeOptions.TASK: {
              // create read update delete
              switch (role.name) {
                case UserRoleOptions.OWNER: {
                  permissionsToSave.push(
                    ...Object.values(PermissionLevelOptions).map(
                      (permission) => ({
                        entityType,
                        permission,
                        role,
                      }),
                    ),
                  );
                  break;
                }
                case UserRoleOptions.ADMIN: {
                  // create read update
                  permissionsToSave.push(
                    ...Object.values(PermissionLevelOptions)
                      .filter((el) => el != PermissionLevelOptions.DELETE)
                      .map((permission) => ({
                        entityType,
                        permission,
                        role,
                      })),
                  );
                  break;
                }
                case UserRoleOptions.VIEWER: {
                  //  read
                  permissionsToSave.push({
                    entityType,
                    permission: PermissionLevelOptions.READ,
                    role,
                  });
                  break;
                }
                default:
                  break;
              }
              break;
            }
            case EntityTypeOptions.ORGANIZATION: {
              switch (role.name) {
                case UserRoleOptions.OWNER: {
                  // create read update delete
                  permissionsToSave.push(
                    ...Object.values(PermissionLevelOptions).map(
                      (permission) => ({
                        entityType,
                        permission,
                        role,
                      }),
                    ),
                  );
                  break;
                }
                case UserRoleOptions.ADMIN: {
                  //  read update
                  permissionsToSave.push(
                    ...[
                      PermissionLevelOptions.READ,
                      PermissionLevelOptions.UPDATE,
                    ].map((permission) => ({
                      entityType,
                      permission,
                      role,
                    })),
                  );
                  break;
                }
                case UserRoleOptions.VIEWER: {
                  //  read
                  permissionsToSave.push({
                    entityType,
                    permission: PermissionLevelOptions.READ,
                    role,
                  });
                  break;
                }
                default:
                  break;
              }
              break;
            }
            default:
              break;
          }
        }
      }
      const permissionsDb = await repoPermission.save(permissionsToSave);

      const usersToSave: DeepPartial<UserEntity>[] = [];

      for (let i = 1; i <= 3; i++) {
        const name = `User ${i}`;
        usersToSave.push({
          username: `user` + i,
          email: `user` + i + '@example.com',
          name,
          passwordHash: await hashPassword('Password!!'),
          createdBy: owner.id,
        });
      }
      const usersDb = await repoUser.save(usersToSave);

      const [user1, user2, user3] = usersDb;

      this.logger.verbose(
        'Assigning user 1 with Owner role in parent org and Admin role in Child org',
      );
      const user1Roles = rolesDb.filter((role) => {
        return (
          (role.name === UserRoleOptions.OWNER &&
            role.organizationId === parentOrganization.id) ||
          (role.name === UserRoleOptions.ADMIN &&
            role.organizationId === childOrganization.id)
        );
      });
      await repoUser.save({ ...user1, roles: user1Roles });

      this.logger.verbose(
        'Assigning user 2 with Admin role in parent org and Owner role in Child org',
      );
      const user2Roles = rolesDb.filter((role) => {
        return (
          (role.name === UserRoleOptions.ADMIN &&
            role.organizationId === parentOrganization.id) ||
          (role.name === UserRoleOptions.OWNER &&
            role.organizationId === childOrganization.id)
        );
      });
      await repoUser.save({ ...user2, roles: user2Roles });

      this.logger.verbose(
        'Assigning user 3 with viwer role in parent org and no role in Child org',
      );
      const user3Roles = rolesDb.filter((role) => {
        return (
          role.name === UserRoleOptions.VIEWER &&
          role.organizationId === parentOrganization.id
        );
      });
      await repoUser.save({ ...user3, roles: user3Roles });

      this.logger.debug(
        `Seeding complete, ${usersDb.length} Users, ${rolesDb.length} Roles, ${permissionsDb.length} Permission entries and 2 Organizations seeded!`,
      );
    } catch (e) {
      this.logger.error(`Error running seed ${JSON.stringify(e)}`);
    }
  }
}
