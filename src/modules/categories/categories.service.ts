import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand, Category } from './entities/brand.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Brand)
    private brandRepo: Repository<Brand>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async getBrands() {
    return this.brandRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getCategories() {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async createBrand(data: Partial<Brand>) {
    return this.brandRepo.save(this.brandRepo.create(data));
  }

  async createCategory(data: Partial<Category>) {
    return this.categoryRepo.save(this.categoryRepo.create(data));
  }
}
