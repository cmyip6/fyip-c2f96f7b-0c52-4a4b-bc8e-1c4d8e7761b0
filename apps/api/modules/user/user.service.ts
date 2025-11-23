import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { DeleteResult, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';

import { OrganizationService } from '../organization/organization.service';
import { RoleService } from '../role/role.service';
import { GetUserReponseDto } from '@api/dto/get-user-response.dto';
import { CreateUserDto } from '@api/dto/create-user.dto';
import { AuthUserDto } from '@api/dto/auth-user.dto';
import { RefreshTokenDto } from '@api/dto/refresh-token.dto';
import { UserEntity } from '@api/models/users.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
  private logger: Logger;

  constructor(
    @InjectRepository(UserEntity)
    private readonly repoUser: Repository<UserEntity>,
    private readonly orgnaizationService: OrganizationService,
    private readonly roleService: RoleService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async findUserById(userId: string): Promise<UserEntity | null> {
    return await this.repoUser.findOne({
      where: { id: userId },
      relations: { roles: true },
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

    return plainToInstance(GetUserReponseDto, ret);
  }

  async getUserById(
    userId: string,
    throwException = false,
  ): Promise<GetUserReponseDto> {
    this.logger.verbose('Getting user by id:' + userId);
    const user = await this.repoUser.findOne({
      where: { id: userId },
      relations: { roles: { organization: true } },
    });
    if (!user && throwException) throw new NotFoundException('User not found');
    return plainToInstance(GetUserReponseDto, user);
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
