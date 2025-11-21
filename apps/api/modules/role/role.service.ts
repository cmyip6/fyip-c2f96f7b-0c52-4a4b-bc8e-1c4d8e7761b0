import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RoleEntity } from '../../models';
import { GetRoleResponseDto } from '../../../../libs/data/dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RoleService {
  private logger: Logger = new Logger(RoleService.name);

  constructor(private readonly dataSource: DataSource) {}

  private get repoRole(): Repository<RoleEntity> {
    return this.dataSource.getRepository(RoleEntity);
  }

  public async findOneById(roleId: number): Promise<GetRoleResponseDto> {
    this.logger.verbose('Getting role by ID: ' + roleId);
    const roleDb = await this.repoRole.findOneBy({ id: roleId });

    if (!roleDb) {
      throw new NotFoundException('Role is not found. ID: ' + roleId);
    }

    return plainToInstance(GetRoleResponseDto, roleDb);
  }
}
