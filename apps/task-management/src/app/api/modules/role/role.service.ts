import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, DeleteResult, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { RoleEntity } from '../../models';
import { CreateRoleDto } from '../../../../libs/data/dto';

@Injectable()
export class RoleService {
  private logger: Logger = new Logger(RoleService.name);

  constructor(@Inject() private readonly dataSource: DataSource) {}

  private get repoRole(): Repository<RoleEntity> {
    return this.dataSource.getRepository(RoleEntity);
  }

  public async findOneById(roleId: number): Promise<RoleEntity | null> {
    return await this.repoRole.findOneBy({ id: roleId });
  }
}
