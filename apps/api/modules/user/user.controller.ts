import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { RefreshTokenDto } from '../../../../libs/data/dto';
import { AuthUserDto } from '../../../../libs/data/dto/auth-user.dto';
import { RolesGuard, NoPolicies } from '../../../../libs/auth/guard';

@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  private logger: Logger;

  constructor(private readonly usersService: UserService) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('/refresh-token')
  @NoPolicies()
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthUserDto> {
    return await this.usersService.refreshAuthToken(dto);
  }
}
