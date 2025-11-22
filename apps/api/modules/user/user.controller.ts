import { Body, Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto } from '@api/dto/auth-user.dto';
import { RefreshTokenDto } from '@api/dto/refresh-token.dto';
import { NoPolicies } from '@libs/auth/decorator/policy-guard.decorator';
import { RolesGuard } from '@api/guard/roles-guard';

@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  private logger: Logger;

  constructor(private readonly usersService: UserService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Get('/refresh-token')
  @NoPolicies()
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthUserDto> {
    return await this.usersService.refreshAuthToken(dto);
  }
}
