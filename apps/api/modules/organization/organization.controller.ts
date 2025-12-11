import {
  Controller,
  forwardRef,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RolesGuard } from '@api/guard/roles-guard';
import { GetOrganizationResponseDto } from '@api/dto/get-organization-response.dto';
import { ValidateResponse } from '@api/helper/response-validator';
import { Viewer } from '@api/decorator/roles.decorator';
import { User } from '@api/decorator/request-user.decorator';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { JwtAuthGuard } from '@api/guard/jwt-auth-guard';

@UseGuards(RolesGuard, JwtAuthGuard)
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(
    @Inject(forwardRef(() => OrganizationService))
    protected readonly organizationService: OrganizationService,
  ) {}

  @Get()
  @ValidateResponse(GetOrganizationResponseDto, { isArray: true })
  async findAll(
    @User() user: AuthUserInterface,
  ): Promise<GetOrganizationResponseDto[]> {
    return await this.organizationService.findAll(user.id);
  }

  @Get(':organizationId')
  @Viewer('params.organizationId')
  @ValidateResponse(GetOrganizationResponseDto)
  async findOne(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<GetOrganizationResponseDto> {
    return await this.organizationService.findOneById(organizationId);
  }
}
