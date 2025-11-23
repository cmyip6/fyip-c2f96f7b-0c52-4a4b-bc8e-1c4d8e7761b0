import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrganizationEntity } from '@api/models/organizations.entity';
import { GetOrganizationResponseDto } from '@api/dto/get-organization-response.dto';
import { UserEntity } from '@api/models/users.entity';

@Injectable()
export class OrganizationService {
  private logger: Logger;

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repoOrganization: Repository<OrganizationEntity>,
    @InjectRepository(UserEntity)
    private readonly repoUser: Repository<UserEntity>,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  public async findAll(userId: string): Promise<GetOrganizationResponseDto[]> {
    this.logger.verbose('Getting origanizations by user: ' + userId);
    const userDb = await this.repoUser.findOne({
      where: { id: userId },
      relations: { roles: true },
    });

    if (!userDb) {
      throw new NotFoundException('User is not found. ID: ' + userId);
    }

    if (!userDb?.roles || !userDb.roles?.length) {
      return [];
    }

    const allOrgsDb = await this.repoOrganization.find({
      where: { roles: { id: In(userDb.roles.map((el) => el.id)) } },
    });

    return allOrgsDb.map((organization) => {
      const role = userDb.roles.find(
        (el) => el.organizationId === organization.id,
      );
      return plainToInstance(GetOrganizationResponseDto, {
        ...organization,
        role: role.name,
      });
    });
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
