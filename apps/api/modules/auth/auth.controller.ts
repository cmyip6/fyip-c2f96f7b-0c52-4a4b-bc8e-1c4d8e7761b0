import {
  Body,
  Controller,
  forwardRef,
  Inject,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthUserResponseDto } from '@api/dto/auth-user.dto';
import { LoginDto } from '@api/dto/login.dto';
import { User } from '@api/decorator/request-user.decorator';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { Response } from 'express';

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
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthUserResponseDto> {
    const result = await this.authService.login(dto);

    response.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      ...result.cookieOptions,
    });

    return {
      user: result.user,
    };
  }

  @Post('logout')
  async logout(
    @User() user: AuthUserInterface,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    response.clearCookie('token');

    this.logger.verbose('Logging out user: ' + user.id);
    await this.authService.logout(user.id);
  }
}
