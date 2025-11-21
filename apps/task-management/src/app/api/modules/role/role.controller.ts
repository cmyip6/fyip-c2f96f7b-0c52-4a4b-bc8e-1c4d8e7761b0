import {
  CheckPolicies,
  CreateRoleDto,
  PoliciesGuard,
  RoleResponseDto,
  RoleSchemaDto,
  UpdateRoleDto,
  ValidateResponse,
  contructorLogger,
} from '@lib/base-library';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DeleteResult, UpdateResult } from 'typeorm';
import { RoleService } from './role.service';
import { rolePolicies } from '../../policy/access-level-policy/policy-consts';

@ApiTags('RoleEntity')
@UseGuards(PoliciesGuard)
@ApiBearerAuth()
@Controller('role')
export class RoleController {
  constructor(protected readonly roleService: RoleService) {
    contructorLogger(this);
  }

  @Get(`schema`)
  @ApiOperation({ description: `Get role permissions schema` })
  @ApiOkResponse({ type: RoleSchemaDto })
  @CheckPolicies(rolePolicies.Read())
  getSchema(): RoleSchemaDto {
    return RoleService.getSchema();
  }

  @Post()
  @CheckPolicies(rolePolicies.Create())
  @ApiBody({
    isArray: false,
    type: CreateRoleDto,
    description: 'Create a role',
  })
  @ApiOkResponse({ isArray: false, type: RoleResponseDto, description: 'Role' })
  @ApiOperation({ description: 'Create a role' })
  @ValidateResponse(RoleResponseDto)
  async createRole(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return await this.roleService.createRole(dto);
  }

  @Get()
  @CheckPolicies(rolePolicies.Read())
  @ApiOkResponse({
    isArray: true,
    type: RoleResponseDto,
    description: 'List of RoleEntity',
  })
  @ApiOperation({ description: 'Get roles' })
  @ValidateResponse(RoleResponseDto, { isArray: true })
  async getAllRoles(): Promise<RoleResponseDto[]> {
    return await this.roleService.getAllRoles();
  }

  @Patch('/:role_id')
  @CheckPolicies(rolePolicies.Update())
  @ApiParam({
    name: 'role_id',
    required: true,
    type: Number,
    description: 'Role id',
  })
  @ApiBody({
    isArray: false,
    type: UpdateRoleDto,
    description: 'Update a role',
  })
  @ApiOkResponse({ isArray: false, type: UpdateResult, description: '' })
  @ApiOperation({ description: 'Get roles' })
  async updateRole(
    @Param('role_id') roleId: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return await this.roleService.updateRole(roleId, dto);
  }

  @Delete('/:role_id')
  @CheckPolicies(rolePolicies.Delete())
  @ApiParam({
    name: 'role_id',
    required: true,
    type: Number,
    description: 'Role id to delete',
  })
  @ApiOkResponse({ isArray: false, type: DeleteResult, description: '' })
  @ApiOperation({ description: 'Delete a role' })
  async deleteRole(@Param('role_id') roleId: number): Promise<DeleteResult> {
    return await this.roleService.deleteRole(roleId);
  }

  @Get('/:role_id')
  @CheckPolicies(rolePolicies.Read())
  @ApiParam({
    name: 'role_id',
    required: true,
    type: Number,
    description: 'Role id',
  })
  @ApiOkResponse({ isArray: false, type: RoleResponseDto, description: 'Role' })
  @ApiOperation({ description: 'Get roles' })
  @ValidateResponse(RoleResponseDto)
  async getOneRole(@Param('role_id') roleId: number): Promise<RoleResponseDto> {
    return await this.roleService.getOneRole(roleId);
  }
}
