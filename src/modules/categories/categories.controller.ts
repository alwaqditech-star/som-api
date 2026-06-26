import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get('brands')
  @ApiOperation({ summary: 'ماركات السيارات' })
  getBrands() {
    return this.categoriesService.getBrands();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'تصنيفات المزادات' })
  getCategories() {
    return this.categoriesService.getCategories();
  }
}
