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
import { CreateRoleDto } from '../../dto/create-role.dto';
import { UpdateRoleDto } from '../../dto/update-role.dto';
import { PermissionEntity } from '../../models/permissions.entity';

@Injectable()
export class RoleService {
  private logger: Logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly repoRole: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly repoPermission: Repository<PermissionEntity>,
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
    this.logger.verbose(`Updating role permissions by ID: ${roleId}`);

    const roleDb = await this.repoRole.findOne({
      where: { id: roleId, organizationId: dto.organizationId },
      relations: ['permissions'],
    });

    if (!roleDb) {
      throw new NotFoundException(`Role is not found. ID: ${roleId}`);
    }

    if (dto.name && dto.name !== roleDb.name) {
      const nameExists = await this.repoRole.findOneBy({
        name: dto.name,
        organizationId: dto.organizationId,
      });

      if (nameExists) {
        throw new BadRequestException('Role name already exists');
      }
      roleDb.name = dto.name;
    }

    if (dto.description) {
      roleDb.description = dto.description;
    }

    const currentPermissionSet = new Set(
      roleDb.permissions.map((p) => p.permission),
    );

    if (dto.permissions?.insert?.length) {
      const newPermissions = dto.permissions.insert
        .filter((p) => !currentPermissionSet.has(p.permission)) // Only add if not exists
        .map((p) =>
          this.repoPermission.create({
            permission: p.permission,
            entityType: p.entityType,
            role: roleDb,
          }),
        );

      if (newPermissions.length > 0) {
        await this.repoPermission.save(newPermissions);
        roleDb.permissions.push(...newPermissions);
      }
    }

    if (dto.permissions?.delete?.length) {
      const deleteSet = new Set(
        dto.permissions.delete.map((p) => p.permission),
      );

      roleDb.permissions = roleDb.permissions.filter(
        (p) => !deleteSet.has(p.permission),
      );
    }

    const savedRole = await this.repoRole.save(roleDb);
    console.log(savedRole);
    return plainToInstance(GetRoleResponseDto, savedRole);
  }
}
