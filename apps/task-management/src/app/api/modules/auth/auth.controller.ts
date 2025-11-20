import { Body, Controller, Inject, Logger, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../../../../libs/data/dto';
import { AuthUserResponseDto } from '../../../../libs/data/dto/auth-user.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  @Inject()
  private readonly authService: AuthService;

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthUserResponseDto> {
    return await this.authService.login(dto);
  }
}
