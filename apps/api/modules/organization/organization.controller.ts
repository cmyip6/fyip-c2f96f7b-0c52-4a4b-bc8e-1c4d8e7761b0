import {
  Body,
  Controller,
  forwardRef,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RolesGuard } from '@api/guard/roles-guard';
import { GetOrganizationResponseDto } from '@api/dto/get-organization-response.dto';
import { ValidateResponse } from '@api/helper/response-validator';
import { Owner, Viewer } from '@api/decorator/roles.decorator';
import { User } from '@api/decorator/request-user.decorator';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { JwtAuthGuard } from '@api/guard/jwt-auth-guard';
import { CheckPolicies } from '../../decorator/policy-guard.decorator';
import {
  CreateOrganizationDto,
  CreateOrganizationResponseDto,
} from '../../dto/create-organization.dto';
import { PoliciesExecutor } from '../../policies/task.policy';
import { EntityTypeOptions } from '../../../../libs/data/type/entity-type.enum';
import { Audit } from '../../decorator/audit-log.decorator';

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

  @Post()
  @Audit({
    action: 'Create Organization',
    entityType: EntityTypeOptions.ORGANIZATION,
  })
  @CheckPolicies(
    new PoliciesExecutor().SuperUser(),
    new PoliciesExecutor().Create('body.parentOrganizationId', {
      optional: true,
    }),
    new PoliciesExecutor().Create('body.childOrganizationId', {
      optional: true,
    }),
  )
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
  ): Promise<CreateOrganizationResponseDto> {
    return await this.organizationService.create(dto);
  }
}
