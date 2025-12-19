import {
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../../guard/jwt-auth-guard';
import { User } from '../../decorator/request-user.decorator';
import { AuthUserInterface } from '../../../../libs/data/type/auth-user.interface';

@Controller('audit-log')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async findAll(@User() user: AuthUserInterface) {
    return this.auditLogService.findAll(user.id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.auditLogService.delete(id);
  }
}
