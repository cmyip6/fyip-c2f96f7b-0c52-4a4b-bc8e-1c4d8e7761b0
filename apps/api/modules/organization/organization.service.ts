import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '@api/models/organizations.entity';
import { GetOrganizationResponseDto } from '@api/dto/get-organization-response.dto';

@Injectable()
export class OrganizationService {
  private logger: Logger;

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repoOrganization: Repository<OrganizationEntity>,
  ) {
    this.logger = new Logger(this.constructor.name);
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
