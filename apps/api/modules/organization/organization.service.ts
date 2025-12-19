import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrganizationEntity } from '@api/models/organizations.entity';
import { GetOrganizationResponseDto } from '@api/dto/get-organization-response.dto';
import { UserEntity } from '@api/models/users.entity';
import {
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
} from '../../dto/create-organization.dto';
import { OrganizationRelationEntity } from '@api/models/organization-relation.entity';

@Injectable()
export class OrganizationService {
  private logger: Logger;

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repoOrganization: Repository<OrganizationEntity>,
    @InjectRepository(OrganizationRelationEntity)
    private readonly repoOrganizationRelation: Repository<OrganizationRelationEntity>,
    @InjectRepository(UserEntity)
    private readonly repoUser: Repository<UserEntity>,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  public async create(
    dto: CreateOrganizationDto,
  ): Promise<CreateOrganizationResponseDto> {
    const nameIsExist = await this.repoOrganization.existsBy({
      name: dto.name,
    });

    if (nameIsExist) {
      throw new BadRequestException(
        'Organization name is already used, please choose another name',
      );
    }

    let parentOrg: OrganizationEntity | null = null;
    if (dto.parentOrganizationId) {
      parentOrg = await this.repoOrganization.findOneBy({
        id: dto.parentOrganizationId,
      });

      if (!parentOrg) {
        throw new NotFoundException(
          'Parent organization is not found. ID: ' + dto.parentOrganizationId,
        );
      }

      if (
        await this.repoOrganizationRelation.findOneBy({
          childOrganizationId: dto.parentOrganizationId,
        })
      ) {
        throw new BadRequestException(
          'You cannot set a child organization to a parent organization',
        );
      }
    }

    let childOrg: OrganizationEntity | null = null;
    if (dto.childOrganizationId) {
      childOrg = await this.repoOrganization.findOneBy({
        id: dto.childOrganizationId,
      });

      if (!childOrg) {
        throw new NotFoundException(
          'Child organization is not found. ID: ' + dto.childOrganizationId,
        );
      }

      if (
        await this.repoOrganizationRelation.findOneBy({
          parentOrganizationId: dto.childOrganizationId,
        })
      ) {
        throw new BadRequestException(
          'You cannot set a parent organization to a child organization',
        );
      }
    }

    const newOrg = this.repoOrganization.create(dto);
    const savedOrg = await this.repoOrganization.save(newOrg);

    if (parentOrg) {
      await this.repoOrganizationRelation.create({
        parentOrganizationId: parentOrg.id,
        childOrganizationId: newOrg.id,
      });
    }

    if (childOrg) {
      await this.repoOrganizationRelation.create({
        parentOrganizationId: childOrg.id,
        childOrganizationId: newOrg.id,
      });
    }

    return plainToInstance(CreateOrganizationResponseDto, savedOrg);
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

    return plainToInstance(GetOrganizationResponseDto, organization);
  }

  async existsById(organizationId): Promise<boolean> {
    return this.repoOrganization.existsBy({ id: organizationId });
  }
}
