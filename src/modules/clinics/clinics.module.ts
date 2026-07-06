import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { EquipmentEntity } from '../../entities/equipment.entity';
import { ClinicsController } from './clinics.controller';
import { ClinicsService } from './clinics.service';
import { TenantMiddleware } from './tenant.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicEntity,
      BranchEntity,
      CabinetEntity,
      EquipmentEntity,
    ]),
  ],
  controllers: [ClinicsController],
  providers: [ClinicsService, TenantMiddleware],
  exports: [TypeOrmModule, ClinicsService],
})
export class ClinicsModule {}
