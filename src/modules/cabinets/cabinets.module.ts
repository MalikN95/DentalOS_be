import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from '../../entities/branch.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { CabinetsController } from './cabinets.controller';
import { CabinetsService } from './cabinets.service';

@Module({
  imports: [TypeOrmModule.forFeature([CabinetEntity, BranchEntity])],
  controllers: [CabinetsController],
  providers: [CabinetsService],
  exports: [CabinetsService],
})
export class CabinetsModule {}
