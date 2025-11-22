import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RolesGuard } from '@api/guard/roles-guard';
import { GetOrganizationResponseDto } from '@api/dto/get-organization-response.dto';
import { ValidateResponse } from '@api/helper/response-validator';
import { Viewer } from '@libs/auth/decorator/roles.decorator';

@UseGuards(RolesGuard)
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(protected readonly organizationService: OrganizationService) {}

  @Get(':organizationId')
  @Viewer()
  @ValidateResponse(GetOrganizationResponseDto)
  async getSchema(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<GetOrganizationResponseDto> {
    return await this.organizationService.findOneById(organizationId);
  }
}
