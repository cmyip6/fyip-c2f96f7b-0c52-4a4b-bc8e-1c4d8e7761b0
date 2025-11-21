import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { DataSource, DeleteResult, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { UserEntity } from '../../models/users.entity';
import {
  CreateUserDto,
  GetUserReponseDto,
  RefreshTokenDto,
} from '../../../../libs/data/dto';
import { OrganizationService } from '../organization/organization.service';
import { RoleService } from '../role/role.service';
import { AuthUserDto } from '../../../../libs/data/dto/auth-user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  private logger: Logger;

  @Inject() private readonly orgnaizationService: OrganizationService;
  @Inject() private readonly roleService: RoleService;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected get repoUser(): Repository<UserEntity> {
    return this.dataSource.getRepository(UserEntity);
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    return await this.repoUser.findOne({
      where: { id: userId },
      relations: { role: true },
    });
  }

  @Transactional()
  async createUser(dto: CreateUserDto): Promise<GetUserReponseDto> {
    this.logger.debug(`Creating user ${dto.name}`);
    let organizationId = null;
    let roleId = null;

    if (dto?.organizationId) {
      const orgDb = await this.orgnaizationService.findOneById(
        dto.organizationId,
      );
      if (!orgDb) {
        throw new NotFoundException(
          'Organization is not found' + dto.organizationId,
        );
      }
      organizationId = orgDb.id;
    }

    if (dto?.roleId) {
      const roleDb = await this.roleService.findOneById(dto.roleId);
      roleId = roleDb.id;
    }

    if (await this.repoUser.existsBy({ username: dto.username })) {
      throw new ConflictException('Username exists in the database');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const ret = await this.repoUser.save({
      username: dto.username,
      passwordHash,
      email: dto.email,
      name: dto.name,
      organizationId,
      roleId,
    });

    return ret;
  }

  async getUserById(
    userId: string,
    throwException = false,
  ): Promise<UserEntity> {
    this.logger.verbose('Getting user by id:' + userId);
    const user = await this.repoUser.findOne({ where: { id: userId } });
    if (!user && throwException) throw new NotFoundException('User not found');
    return user;
  }

  async refreshAuthToken(dto: RefreshTokenDto): Promise<AuthUserDto> {
    throw new NotImplementedException('Service not implemented');

    // implement refresh token
  }

  @Transactional()
  async deleteUser(userId: string): Promise<DeleteResult> {
    throw new NotImplementedException('Service not implemented');

    // delete relational entities

    return await this.repoUser.delete(userId);
  }
}
