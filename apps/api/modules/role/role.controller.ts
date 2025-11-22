import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { RolesGuard } from '@api/guard/roles-guard';
import { GetRoleResponseDto } from '@api/dto/get-role-response.dto';
import { Admin } from '@libs/auth/decorator/roles.decorator';

@UseGuards(RolesGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get(':roleId')
  @Admin()
  async getSchema(
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<GetRoleResponseDto> {
    return await this.roleService.findOneById(roleId);
  }
}
