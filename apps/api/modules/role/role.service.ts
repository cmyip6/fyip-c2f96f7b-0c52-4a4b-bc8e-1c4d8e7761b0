import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '@api/models/roles.entity';
import { GetRoleResponseDto } from '@api/dto/get-role-response.dto';
import { PermissionLevelOptions } from '../../../../libs/data/type/permission-level.enum';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { UpdateRoleDto } from '../../dto/update-role.dto';
import { EntityTypeOptions } from '../../../../libs/data/type/entity-type.enum';
import { PermissionEntity } from '../../models/permissions.entity';

@Injectable()
export class RoleService {
  private logger: Logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly repoRole: Repository<RoleEntity>,
  ) {}

  public async findOneById(
    roleId: number,
    organizationId?: number,
  ): Promise<GetRoleResponseDto> {
    this.logger.verbose(
      'Getting role by ID: ' + roleId + ' Organization ID: ' + organizationId,
    );
    const roleDb = await this.repoRole.findOneBy({
      id: roleId,
      organizationId,
    });

    if (!roleDb) {
      throw new NotFoundException('Role is not found. ID: ' + roleId);
    }

    return plainToInstance(GetRoleResponseDto, roleDb);
  }

  public async createRole(dto: CreateRoleDto): Promise<GetRoleResponseDto> {
    const nameIsExist = await this.repoRole.findOneBy({
      name: dto.name,
      organizationId: dto.organizationId,
    });

    if (nameIsExist) {
      throw new BadRequestException('Role name is already exist');
    }

    this.logger.verbose('Creating role');
    const roleDb = await this.repoRole.save(dto);
    return plainToInstance(GetRoleResponseDto, roleDb);
  }

  public async updateRolePermissions(
    roleId: number,
    dto: UpdateRoleDto,
  ): Promise<GetRoleResponseDto> {
    this.logger.verbose('Updating role permissions by ID: ' + roleId);
    const roleDb = await this.repoRole.findOne({
      where: {
        id: roleId,
        organizationId: dto.organizationId,
      },
      relations: ['permissions'],
    });

    if (!roleDb) {
      throw new NotFoundException('Role is not found. ID: ' + roleId);
    }

    if (dto.name) {
      const nameIsExist = await this.repoRole.findOneBy({
        name: dto.name,
        organizationId: dto.organizationId,
      });

      if (nameIsExist) {
        throw new BadRequestException('Role name is already exist');
      }
      roleDb.name = dto.name;
    }

    if (dto.description) {
      roleDb.description = dto.description;
    }

    const insertPermissions: Partial<PermissionEntity>[] = [];
    if (dto.permissions?.insert?.length > 0) {
      for (const insertDto of dto.permissions.insert) {
        if (
          !roleDb.permissions.find(
            (el) => el.permission === insertDto.permission,
          )
        ) {
          insertPermissions.push({
            permission: insertDto.permission,
            entityType: insertDto.entityType,
            role: roleDb,
          });
        }
      }
    }

    if (dto.permissions?.delete?.length > 0) {
      for (const deleteDto of dto.permissions.delete) {
        if (
          roleDb.permissions.find(
            (el) => el.permission === deleteDto.permission,
          )
        ) {
          roleDb.permissions = roleDb.permissions.filter(
            (el) => el.permission !== deleteDto.permission,
          );
        }
      }
    }

    await this.repoRole.save(roleDb);

    return plainToInstance(
      GetRoleResponseDto,
      await this.repoRole.save(roleDb),
    );
  }
}
