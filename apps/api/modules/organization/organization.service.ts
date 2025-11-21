import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrganizationEntity } from '../../models';
import { plainToInstance } from 'class-transformer';
import { GetOrganizationResponseDto } from '../../../../libs/data/dto/get-organization-response.dto';

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
  ): Promise<GetOrganizationResponseDto> {
    this.logger.verbose('Getting origanization by ID: ' + organizationId);
    const organization = await this.repoOrganization.findOneBy({
      id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException(
        'Organization is not found. ID: ' + organizationId,
      );
    }
    return plainToInstance(GetOrganizationResponseDto, organization);
  }
}
