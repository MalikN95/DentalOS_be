import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { InvoiceEntity } from '../../entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import {
  InvoicesService,
  InvoiceWithPayments,
  PaginatedInvoices,
} from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListInvoicesQueryDto,
  ): Promise<PaginatedInvoices> {
    return this.invoicesService.list(clinic.id, query);
  }

  @Get(':id')
  getById(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceWithPayments> {
    return this.invoicesService.getById(clinic.id, id);
  }

  @Post()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.RECEPTIONIST,
  )
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceEntity> {
    return this.invoicesService.create(clinic.id, dto);
  }

  @Patch(':id/cancel')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.RECEPTIONIST,
  )
  cancel(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceEntity> {
    return this.invoicesService.cancel(clinic.id, id);
  }
}
