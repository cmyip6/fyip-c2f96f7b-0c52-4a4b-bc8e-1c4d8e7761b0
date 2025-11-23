import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { In, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginDto } from '@api/dto/login.dto';
import { AuthUserResponseDto } from '@api/dto/auth-user.dto';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { UserEntity } from '@api/models/users.entity';
import { OrganizationEntity } from '@api/models/organizations.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepo: Repository<OrganizationEntity>,
  ) {}

  @Transactional()
  async login(loginDto: LoginDto): Promise<AuthUserResponseDto> {
    const { username, password, rememberMe } = loginDto;

    if (rememberMe) {
      // TODO: create refresh token logic
    }

    const userDb = await this.userRepo.findOne({
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        roles: { id: true, name: true, organizationId: true },
      },
      where: { username },
      relations: { roles: true },
    });
    if (!userDb) {
      this.logger.warn('User not found, username: ' + loginDto.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, userDb?.passwordHash);
    if (!isMatch) {
      this.logger.warn('Password mismatched, password: ' + loginDto.password);
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenLifeSeconds = 3600;
    const expiryTimestamp = Math.floor(Date.now() / 1000) + tokenLifeSeconds;

    const organizationsDb = await this.organizationRepo.find({
      where: { roles: { id: In(userDb.roles.map((el) => el.id)) } },
    });

    const authUser: AuthUserInterface = {
      id: userDb.id,
      email: userDb.email,
      name: userDb.name,
      roles:
        userDb?.roles?.map((role) => {
          const organization = organizationsDb.find(
            (el) => el.id === role.organizationId,
          );
          return {
            role: { id: role.id, name: role.name },
            organization,
          };
        }) || [],
      tokenExpiry: expiryTimestamp,
    };

    const payload = { user: authUser };
    const secret = process.env.JWT_SECRET;

    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
    });

    this.logger.log(`New token saved to DB for user: ${username}`);
    await this.userRepo.update(userDb.id, { token });

    return {
      token,
      user: authUser,
    };
  }

  @Transactional()
  async logout(userId: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { token: null });
  }
}
