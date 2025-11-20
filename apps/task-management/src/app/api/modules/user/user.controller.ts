import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UpdateResult } from 'typeorm';
import { UserService } from './user.service';
import { NoPolicies } from '../../guard/policy-guard.decorator';
import { RolesGuard } from '../../guard';
import { RefreshTokenDto } from '../../../../libs/data/dto';
import { AuthUserDto } from '../../../../libs/data/dto/auth-user.dto';

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
