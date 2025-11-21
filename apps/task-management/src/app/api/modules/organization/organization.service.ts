import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { DataSource, In, IsNull, Not, Repository, UpdateResult } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { UserEntity } from '../../models/users.entity';
import { CreateUserDto, GetUserReponseDto } from '../../../../libs/data/dto';
import { OrganizationEntity } from '../../models';

@Injectable()
export class OrganizationService {
  private logger: Logger;

  constructor(private readonly dataSource: DataSource) {
    this.logger = new Logger(this.constructor.name);
  }

  protected get repoOrganization(): Repository<OrganizationEntity> {
    return this.dataSource.getRepository(OrganizationEntity);
  }

  public async findOneById(
    organizationId: number,
  ): Promise<OrganizationEntity | null> {
    return await this.repoOrganization.findOneBy({ id: organizationId });
  }
}
