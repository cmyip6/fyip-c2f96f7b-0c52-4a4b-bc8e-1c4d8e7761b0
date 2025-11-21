import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { Admin, RolesGuard } from '../../guard';
import { GetRoleResponseDto } from 'src/libs/data/dto';

@ApiTags('RoleEntity')
@UseGuards(RolesGuard)
@ApiBearerAuth()
@Controller('role')
export class RoleController {
  constructor(protected readonly roleService: RoleService) {}

  @Get(':roleId')
  @Admin()
  async getSchema(
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<GetRoleResponseDto> {
    return await this.roleService.findOneById(roleId);
  }
}
