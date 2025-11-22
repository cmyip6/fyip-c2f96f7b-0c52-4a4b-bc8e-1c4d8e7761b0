import {
  Body,
  Controller,
  forwardRef,
  Inject,
  Logger,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUserResponseDto } from '@api/dto/auth-user.dto';
import { LoginDto } from '@api/dto/login.dto';
import { User } from '@api/decorator/request-user.decorator';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';

@Controller('auth')
export class AuthController {
  private logger: Logger;
  constructor(
    @Inject(forwardRef(() => AuthService))
    protected readonly authService: AuthService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthUserResponseDto> {
    this.logger.verbose('Request login received, username: ' + dto.username);
    return await this.authService.login(dto);
  }

  @Post('logout')
  async logout(@User() user: AuthUserInterface): Promise<void> {
    this.logger.verbose('Logging out user: ' + user.id);
    await this.authService.logout(user.id);
  }
}
