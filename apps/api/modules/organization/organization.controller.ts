import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RolesGuard, Viewer } from '../../../../libs/auth/guard';
import { GetOrganizationResponseDto } from '../../../../libs/data/dto/get-organization-response.dto';
import { ValidateResponse } from '../../helper';

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
