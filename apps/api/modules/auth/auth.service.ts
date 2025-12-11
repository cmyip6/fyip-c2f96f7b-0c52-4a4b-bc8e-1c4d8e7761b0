import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { In, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginDto } from '@api/dto/login.dto';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { UserEntity } from '@api/models/users.entity';
import { OrganizationEntity } from '@api/models/organizations.entity';
import { hashPassword } from '@api/helper/password-hash';
import { CookieOptions } from 'express';

export interface LoginResult {
  token: string;
  user: AuthUserInterface;
  cookieOptions: CookieOptions;
}

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
  async login(loginDto: LoginDto): Promise<LoginResult> {
    const { username, password, rememberMe } = loginDto;
    console.log(rememberMe);
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

    const tokenLifeSeconds = rememberMe
      ? 30 * 24 * 60 * 60 // one month
      : +process.env.TOKEN_LIFE_SECONDS || 3600;
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + tokenLifeSeconds * 1000);

    const cookieOptions: CookieOptions = {};
    if (rememberMe) {
      cookieOptions.expires = expiryDate;
      cookieOptions.maxAge = tokenLifeSeconds * 1000;
    }

    const organizationsDb = await this.organizationRepo.find({
      where: { roles: { id: In(userDb.roles.map((el) => el.id)) } },
    });
    const authUser: AuthUserInterface = {
      id: userDb.id,
      email: userDb.email,
      name: userDb.name,
      username: userDb.username,
      roles:
        userDb?.roles?.map((role) => {
          const organization = organizationsDb.find(
            (el) => el.id === role.organizationId,
          );
          return {
            role: { id: role.id, name: role.name },
            organization: { id: organization.id, name: organization.name },
          };
        }) || [],
      tokenExpiry: Math.floor(expiryDate.getTime() / 1000),
    };

    const payload = { sub: authUser.id, user: authUser };
    const secret = process.env.JWT_SECRET;

    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn: tokenLifeSeconds,
    });

    this.logger.log(`New token saved to DB for user: ${username}`);
    const hashToken = await hashPassword(token);
    await this.userRepo.update(userDb.id, { token: hashToken });

    return {
      token,
      user: authUser,
      cookieOptions,
    };
  }

  @Transactional()
  async logout(userId: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { token: null });
  }
}
