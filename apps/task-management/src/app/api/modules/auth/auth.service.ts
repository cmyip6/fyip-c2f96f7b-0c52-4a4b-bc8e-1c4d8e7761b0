import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { DataSource, Repository } from 'typeorm';
import { PermissionEntity, TaskEntity, UserEntity } from '../../models';
import { LoginDto } from '../../../../libs/data/dto';
import { AuthUserResponseDto } from '../../../../libs/data/dto/auth-user.dto';
import { AuthUserInterface } from '../../../../libs/data/type';
import { ConfigService } from '@nestjs/config';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  @Inject() private readonly userService: UserService;
  @Inject() private readonly configService: ConfigService;

  constructor(@Inject() private readonly dataSource: DataSource) {}

  get permissionRepo(): Repository<PermissionEntity> {
    return this.dataSource.getRepository(PermissionEntity);
  }

  get taskRepo(): Repository<TaskEntity> {
    return this.dataSource.getRepository(TaskEntity);
  }

  get userRepo(): Repository<UserEntity> {
    return this.dataSource.getRepository(UserEntity);
  }

  async userIsAuthorized(
    userId: string,
    taskId: number | null,
  ): Promise<boolean> {
    this.logger.verbose('Checking permission...');
    this.logger.verbose('Getting user by id' + userId);
    const userDb = await this.userService.findUserById(userId);
    if (!userDb) return false;

    this.logger.verbose('Getting task' + taskId);
    const taskDb = await this.taskRepo.findOneBy({ id: taskId });
    if (!taskDb) return false;
    const isTaskOwner = taskDb.userId === userId;

    if (isTaskOwner) {
      this.logger.verbose('User is owner of the task, access granted');
      return true;
    }

    return this.permissionRepo.existsBy({ taskId, roleId: userDb.roleId });
  }

  async hashPassword(rawPassword: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(rawPassword, saltRounds);
  }

  @Transactional()
  async login(loginDto: LoginDto): Promise<AuthUserResponseDto> {
    const { username, password } = loginDto;

    const userDb = await this.userRepo.findOne({
      where: { username },
      relations: { role: true },
    });
    const isMatch = await bcrypt.compare(password, userDb.passwordHash);

    if (!userDb || !isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenLifeSeconds = 3600;
    const expiryTimestamp = Math.floor(Date.now() / 1000) + tokenLifeSeconds;

    const authUser: AuthUserInterface = {
      id: userDb.id,
      email: userDb.email,
      role: userDb?.role?.name || null,
      tokenExpiry: expiryTimestamp,
    };

    const payload = { user: authUser };
    const secret = this.configService.get<string>('JWT_SECRET');

    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
    });

    this.logger.log(`New token saved to DB for user: ${username}`);
    await this.userRepo.update(userDb.id, { token });

    return {
      token,
    };
  }
}
