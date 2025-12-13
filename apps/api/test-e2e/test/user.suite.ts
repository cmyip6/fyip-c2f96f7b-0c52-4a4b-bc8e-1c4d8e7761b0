import { Test, TestSuite } from '../modules/jest-test.decorator';
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { BaseTest } from './base-test';
import { UserFactory, OrganizationFactory, RoleFactory } from '../factory';
import { UserEntity } from '../../models/users.entity';
import { UserRoleOptions } from '../../../../libs/data/type/user-role.enum';
import { CreateUserResponseDto } from '../../dto/create-user.dto';
import { LoginDto } from '../../dto/login.dto';
import { CreateOrganizationResponseDto } from '../../dto/create-organization.dto';
import { UserTypeOptions } from '@libs/data/type/user-type.enum';

@Injectable()
@TestSuite('User Suite')
export class UserSuite extends BaseTest implements OnModuleInit {
  private readonly logger = new Logger(UserSuite.name);
  private superUser: UserEntity;
  private superUserCookies: { [key: string]: string };

  @Inject(UserFactory) userFactory: UserFactory;
  @Inject(OrganizationFactory) organizationFactory: OrganizationFactory;
  @Inject(RoleFactory) roleFactory: RoleFactory;

  async onModuleInit(): Promise<void> {
    this.logger.debug('User Suite initialized');
    this.setUrl('/user');
  }

  @Test('Create User')
  async createUser(role: UserRoleOptions = UserRoleOptions.OWNER): Promise<{
    loginDto: LoginDto;
    organization: CreateOrganizationResponseDto;
    role: CreateUserResponseDto;
  }> {
    this.logger.debug('Creating super user');

    if (!this.superUser || !this.superUserCookies) {
      const { user, cookies } = await this.createSuperUser();
      this.superUser = user;
      this.superUserCookies = cookies;
    }

    this.logger.debug('Creating organization');
    const createOrganizationDto =
      this.organizationFactory.createFakeOrganizationDto();
    const { body: createOrgResponse } = await this.post(
      '/organization',
      createOrganizationDto,
      this.superUserCookies,
    ).expect(HttpStatus.CREATED);
    expect(createOrgResponse.id).toBeDefined();

    this.logger.debug('Creating role');
    const createRoleDto = this.roleFactory.createFakeRoleDto(
      createOrgResponse.id,
      role,
    );
    const { body: createRoleResponse } = await this.post(
      '/role',
      createRoleDto,
      this.superUserCookies,
    ).expect(HttpStatus.CREATED);
    expect(createRoleResponse.id).toBeDefined();

    this.logger.debug('Creat a module user and assign an admin role');
    const createModuleUserDto = this.userFactory.createFakeUserDto(
      createRoleResponse.id,
    );
    const { body: createModuleUserResponse } = await this.post(
      '',
      createModuleUserDto,
      this.superUserCookies,
    ).expect(HttpStatus.CREATED);
    expect(createModuleUserResponse.id).toBeDefined();
    expect(createModuleUserResponse.username).toBe(
      createModuleUserDto.username,
    );
    expect(createModuleUserResponse.name).toBe(createModuleUserDto.name);
    expect(createModuleUserResponse.email).toBe(createModuleUserDto.email);
    expect(createModuleUserResponse.userType).toBe(UserTypeOptions.MODULE_USER);

    return {
      loginDto: {
        username: createModuleUserDto.username,
        password: createModuleUserDto.password,
        rememberMe: true,
      },
      organization: createOrgResponse,
      role: createRoleResponse,
    };
  }
}
