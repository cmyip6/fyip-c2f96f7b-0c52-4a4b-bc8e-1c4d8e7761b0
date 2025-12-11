import {
  Body,
  Controller,
  forwardRef,
  Get,
  Inject,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto } from '@api/dto/auth-user.dto';
import { RefreshTokenDto } from '@api/dto/refresh-token.dto';
import { NoPolicies } from '@api/decorator/policy-guard.decorator';
import { RolesGuard } from '@api/guard/roles-guard';
import { User } from '@api/decorator/request-user.decorator';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { JwtAuthGuard } from '@api/guard/jwt-auth-guard';
import { PoliciesGuard } from '@api/guard/policy-guard';

@Controller('user')
@UseGuards(RolesGuard, JwtAuthGuard, PoliciesGuard)
export class UserController {
  private logger: Logger;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly usersService: UserService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get()
  @NoPolicies()
  getCurrentUser(@User() user: AuthUserInterface): AuthUserInterface {
    this.logger.log('User token is valid, returning user' + user.id);
    return user;
  }

  @Get('/refresh-token')
  @NoPolicies()
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthUserDto> {
    return await this.usersService.refreshAuthToken(dto);
  }
}
