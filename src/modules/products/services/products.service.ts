import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { BrandEntity } from '../entities/brand.entity';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import { StockEntryEntity } from '../entities/stock-entry.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { FilterProductsDto } from '../dto/filter-products.dto';
import { CreateStockEntryDto } from '../dto/create-stock-entry.dto';
import { BulkImportProductsDto } from '../dto/bulk-import-products.dto';
import { CreateBrandDto } from '../dto/create-brand.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(BrandEntity)
    private readonly brandRepository: Repository<BrandEntity>,
    @InjectRepository(InventoryStockEntity)
    private readonly stockRepository: Repository<InventoryStockEntity>,
    @InjectRepository(StockEntryEntity)
    private readonly stockEntryRepository: Repository<StockEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filterDto: FilterProductsDto) {
    const {
      search,
      brand,
      category,
      isActive,
      lowStockOnly,
      page = 1,
      limit = 50,
    } = filterDto;

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.image', 'image')
      .leftJoinAndSelect('product.stock', 'stock');

    if (search) {
      query.andWhere(
        '(LOWER(product.name) LIKE LOWER(:search) OR LOWER(product.barcode) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (brand) {
      query.andWhere('LOWER(brand.name) = LOWER(:brand)', { brand });
    }

    if (category) {
      query.andWhere('product.category = :category', { category });
    }

    if (isActive !== undefined) {
      query.andWhere('product.isActive = :isActive', { isActive });
    }

    if (lowStockOnly) {
      query.andWhere('stock.currentStock <= stock.minStock');
    }

    query
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();

    // Mapear al formato amigable del frontend
    const mapped = items.map((p) => {
      const cost = p.costPrice ? Number(p.costPrice) : 0;
      const price = p.sellingPrice ? Number(p.sellingPrice) : 0;
      const profit = price > 0 && cost > 0 ? price - cost : 0;

      return {
        id: p.id,
        barcode: p.barcode,
        brand: p.brand?.name ?? '',
        name: p.name,
        size: p.size,
        totalIn: p.stock?.totalIn ?? 0,
        totalSold: p.stock?.totalSold ?? 0,
        stock: p.stock?.currentStock ?? 0,
        costPrice: cost,
        price,
        profit,
        receptionDate: p.receptionDate
          ? new Date(p.receptionDate).toLocaleDateString('es-ES')
          : '',
        isActive: p.isActive,
        imageUrl: p.image?.url ?? null,
      };
    });

    return {
      items: mapped,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: {
        brand: true,
        image: true,
        stock: true,
        stockEntries: true,
      },
      order: {
        stockEntries: {
          createdAt: 'DESC',
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID "${id}" no encontrado.`);
    }

    return product;
  }

  async findByBarcode(barcode: string): Promise<ProductEntity | null> {
    return await this.productRepository.findOne({
      where: { barcode },
      relations: {
        brand: true,
        image: true,
        stock: true,
      },
    });
  }

  async create(createDto: CreateProductDto): Promise<ProductEntity> {
    // 1. Validar unicidad de barcode
    const existing = await this.findByBarcode(createDto.barcode);
    if (existing) {
      throw new ConflictException(
        `Ya existe un producto con el código de barras "${createDto.barcode}".`,
      );
    }

    // 2. Buscar o crear la Marca
    const brand = await this.findOrCreateBrand(createDto.brandName);

    // 3. Crear en transacción atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const initialStock = createDto.initialStock ?? 0;

      const product = queryRunner.manager.create(ProductEntity, {
        barcode: createDto.barcode,
        name: createDto.name,
        size: createDto.size ?? '100 ml',
        description: createDto.description ?? null,
        category: createDto.category ?? null,
        costPrice: createDto.costPrice ?? null,
        sellingPrice: createDto.sellingPrice ?? null,
        brandId: brand.id,
        imageId: createDto.imageId ?? null,
        isActive: createDto.isActive ?? true,
        receptionDate: createDto.receptionDate ? new Date(createDto.receptionDate) : null,
      });

      const savedProduct = await queryRunner.manager.save(ProductEntity, product);

      // Crear inventario asociado
      const stock = queryRunner.manager.create(InventoryStockEntity, {
        productId: savedProduct.id,
        totalIn: initialStock,
        totalSold: 0,
        currentStock: initialStock,
        minStock: createDto.minStock ?? 5,
        lastEntryDate: initialStock > 0 ? new Date() : null,
      });
      await queryRunner.manager.save(InventoryStockEntity, stock);

      // Si hubo stock inicial, registrar la primera entrada
      if (initialStock > 0) {
        const entry = queryRunner.manager.create(StockEntryEntity, {
          productId: savedProduct.id,
          quantity: initialStock,
          unitCost: createDto.costPrice ?? null,
          totalCost: createDto.costPrice ? createDto.costPrice * initialStock : null,
          entryDate: new Date(),
          notes: 'Inventario inicial al crear producto',
        });
        await queryRunner.manager.save(StockEntryEntity, entry);
      }

      await queryRunner.commitTransaction();

      return await this.findById(savedProduct.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateDto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findById(id);

    // Si cambia código de barras, validar unicidad
    if (updateDto.barcode && updateDto.barcode !== product.barcode) {
      const existing = await this.findByBarcode(updateDto.barcode);
      if (existing) {
        throw new ConflictException(
          `Ya existe otro producto con el código de barras "${updateDto.barcode}".`,
        );
      }
      product.barcode = updateDto.barcode;
    }

    // Si cambia de marca
    if (updateDto.brandName) {
      const brand = await this.findOrCreateBrand(updateDto.brandName);
      product.brandId = brand.id;
    }

    if (updateDto.name !== undefined) product.name = updateDto.name;
    if (updateDto.size !== undefined) product.size = updateDto.size;
    if (updateDto.description !== undefined) product.description = updateDto.description;
    if (updateDto.category !== undefined) product.category = updateDto.category;
    if (updateDto.costPrice !== undefined) product.costPrice = updateDto.costPrice;
    if (updateDto.sellingPrice !== undefined) product.sellingPrice = updateDto.sellingPrice;
    if (updateDto.imageId !== undefined) product.imageId = updateDto.imageId;
    if (updateDto.isActive !== undefined) product.isActive = updateDto.isActive;
    if (updateDto.receptionDate !== undefined) {
      product.receptionDate = updateDto.receptionDate ? new Date(updateDto.receptionDate) : null;
    }

    if (updateDto.minStock !== undefined && product.stock) {
      product.stock.minStock = updateDto.minStock;
      await this.stockRepository.save(product.stock);
    }

    await this.productRepository.save(product);
    return await this.findById(id);
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    const product = await this.findById(id);
    await this.productRepository.softDelete(product.id);
    return { id, deleted: true };
  }

  async addStockEntry(
    productId: string,
    dto: CreateStockEntryDto,
  ): Promise<StockEntryEntity> {
    const product = await this.findById(productId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const unitCost = dto.unitCost ?? (product.costPrice ? Number(product.costPrice) : null);
      const totalCost = unitCost ? unitCost * dto.quantity : null;

      const entry = queryRunner.manager.create(StockEntryEntity, {
        productId: product.id,
        quantity: dto.quantity,
        unitCost,
        totalCost,
        batchNumber: dto.batchNumber ?? null,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        notes: dto.notes ?? null,
      });

      const savedEntry = await queryRunner.manager.save(StockEntryEntity, entry);

      // Actualizar stock
      await queryRunner.manager.increment(
        InventoryStockEntity,
        { productId: product.id },
        'totalIn',
        dto.quantity,
      );
      await queryRunner.manager.increment(
        InventoryStockEntity,
        { productId: product.id },
        'currentStock',
        dto.quantity,
      );
      await queryRunner.manager.update(
        InventoryStockEntity,
        { productId: product.id },
        { lastEntryDate: new Date() },
      );

      await queryRunner.commitTransaction();
      return savedEntry;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async bulkImport(bulkDto: BulkImportProductsDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let inserted = 0;
    let updated = 0;
    const errors: Array<{ barcode: string; error: string }> = [];

    try {
      for (const item of bulkDto.items) {
        try {
          const brand = await this.findOrCreateBrand(item.brandName);
          const existing = await queryRunner.manager.findOne(ProductEntity, {
            where: { barcode: item.barcode },
            relations: { stock: true },
          });

          const quantity = item.quantity ?? 0;

          if (existing) {
            // Producto ya existe: actualizar stock y precio si se provieron
            if (item.costPrice !== undefined) existing.costPrice = item.costPrice;
            if (item.sellingPrice !== undefined) existing.sellingPrice = item.sellingPrice;
            await queryRunner.manager.save(ProductEntity, existing);

            if (quantity > 0) {
              await queryRunner.manager.increment(
                InventoryStockEntity,
                { productId: existing.id },
                'totalIn',
                quantity,
              );
              await queryRunner.manager.increment(
                InventoryStockEntity,
                { productId: existing.id },
                'currentStock',
                quantity,
              );
              await queryRunner.manager.update(
                InventoryStockEntity,
                { productId: existing.id },
                { lastEntryDate: new Date() },
              );

              // Registrar entrada
              const entry = queryRunner.manager.create(StockEntryEntity, {
                productId: existing.id,
                quantity,
                unitCost: item.costPrice ?? null,
                totalCost: item.costPrice ? item.costPrice * quantity : null,
                entryDate: item.receptionDate ? new Date(item.receptionDate) : new Date(),
                notes: 'Carga masiva - Reposición de stock',
              });
              await queryRunner.manager.save(StockEntryEntity, entry);
            }
            updated++;
          } else {
            // Producto nuevo
            const newProduct = queryRunner.manager.create(ProductEntity, {
              barcode: item.barcode,
              name: item.name,
              size: item.size ?? '100 ml',
              category: item.category ?? null,
              costPrice: item.costPrice ?? null,
              sellingPrice: item.sellingPrice ?? null,
              brandId: brand.id,
              isActive: true,
              receptionDate: item.receptionDate ? new Date(item.receptionDate) : null,
            });
            const saved = await queryRunner.manager.save(ProductEntity, newProduct);

            const stock = queryRunner.manager.create(InventoryStockEntity, {
              productId: saved.id,
              totalIn: quantity,
              totalSold: 0,
              currentStock: quantity,
              minStock: 5,
              lastEntryDate: quantity > 0 ? new Date() : null,
            });
            await queryRunner.manager.save(InventoryStockEntity, stock);

            if (quantity > 0) {
              const entry = queryRunner.manager.create(StockEntryEntity, {
                productId: saved.id,
                quantity,
                unitCost: item.costPrice ?? null,
                totalCost: item.costPrice ? item.costPrice * quantity : null,
                entryDate: item.receptionDate ? new Date(item.receptionDate) : new Date(),
                notes: 'Carga masiva - Stock inicial',
              });
              await queryRunner.manager.save(StockEntryEntity, entry);
            }
            inserted++;
          }
        } catch (itemError: any) {
          errors.push({
            barcode: item.barcode,
            error: itemError.message || 'Error al procesar producto',
          });
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        summary: {
          totalProcessed: bulkDto.items.length,
          inserted,
          updated,
          errorsCount: errors.length,
          errors,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // --- Métodos de Marcas (Brands) ---
  async findAllBrands(): Promise<BrandEntity[]> {
    return await this.brandRepository.find({
      order: { name: 'ASC' },
    });
  }

  async createBrand(createBrandDto: CreateBrandDto): Promise<BrandEntity> {
    const existing = await this.brandRepository.findOne({
      where: { name: createBrandDto.name.trim() },
    });

    if (existing) {
      return existing;
    }

    const brand = this.brandRepository.create({
      name: createBrandDto.name.trim(),
      description: createBrandDto.description ?? null,
    });

    return await this.brandRepository.save(brand);
  }

  private async findOrCreateBrand(brandName: string): Promise<BrandEntity> {
    const trimmed = brandName?.trim() || 'Generica';
    let brand = await this.brandRepository.findOne({
      where: { name: trimmed },
    });

    if (!brand) {
      brand = this.brandRepository.create({ name: trimmed });
      brand = await this.brandRepository.save(brand);
    }

    return brand;
  }
}
