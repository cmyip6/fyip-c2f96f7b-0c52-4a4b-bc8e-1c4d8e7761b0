import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';
import { InjectRepository } from '@nestjs/typeorm';
import { LoginDto } from '@api/dto/login.dto';
import { AuthUserResponseDto } from '@api/dto/auth-user.dto';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { UserEntity } from '@api/models/users.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  @Transactional()
  async login(loginDto: LoginDto): Promise<AuthUserResponseDto> {
    const { username, password, rememberMe } = loginDto;

    if (rememberMe) {
      // TODO: create refresh token logic
    }

    const userDb = await this.userRepo.findOne({
      select: { id: true, email: true, passwordHash: true, role: true },
      where: { username },
      relations: { role: true },
    });
    if (!userDb) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, userDb?.passwordHash);
    if (!isMatch) {
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
    const secret = process.env.JWT_SECRET;

    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
    });

    this.logger.log(`New token saved to DB for user: ${username}`);
    await this.userRepo.update(userDb.id, { token });

    return {
      token,
    };
  }

  @Transactional()
  async logout(userId: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { token: null });
  }
}
