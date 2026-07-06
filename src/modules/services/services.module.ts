import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceEntity,
      ServiceCategoryEntity,
      CabinetEntity,
    ]),
  ],
  controllers: [ServiceCategoriesController, ServicesController],
  providers: [ServiceCategoriesService, ServicesService],
  exports: [ServicesService, ServiceCategoriesService],
})
export class ServicesModule {}
