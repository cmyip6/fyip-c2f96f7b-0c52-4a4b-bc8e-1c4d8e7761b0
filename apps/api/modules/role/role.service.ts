import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '@api/models/roles.entity';
import { GetRoleResponseDto } from '@api/dto/get-role-response.dto';

@Injectable()
export class RoleService {
  private logger: Logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly repoRole: Repository<RoleEntity>,
  ) {}

  public async findOneById(roleId: number): Promise<GetRoleResponseDto> {
    this.logger.verbose('Getting role by ID: ' + roleId);
    const roleDb = await this.repoRole.findOneBy({ id: roleId });

    if (!roleDb) {
      throw new NotFoundException('Role is not found. ID: ' + roleId);
    }

    return plainToInstance(GetRoleResponseDto, roleDb);
  }
}
