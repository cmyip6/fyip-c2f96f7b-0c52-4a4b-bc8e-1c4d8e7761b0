import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { RolesGuard } from '@api/guard/roles-guard';
import { GetRoleResponseDto } from '@api/dto/get-role-response.dto';
import { Admin, Owner } from '@api/decorator/roles.decorator';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { UpdateRoleDto } from '../../dto/update-role.dto';

@UseGuards(RolesGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get(':roleId/organization/:organizationId')
  @Admin('params.organizationId')
  async getRole(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<GetRoleResponseDto> {
    return await this.roleService.findOneById(roleId, organizationId);
  }

  @Post()
  @Owner('body.organizationId')
  async createRole(@Body() body: CreateRoleDto): Promise<GetRoleResponseDto> {
    return await this.roleService.createRole(body);
  }

  @Patch(':roleId/permission')
  @Owner('body.organizationId')
  async updateRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<GetRoleResponseDto> {
    return await this.roleService.updateRolePermissions(roleId, dto);
  }
}
