import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { BrandEntity } from '../entities/brand.entity';
import { CategoryEntity } from '../entities/category.entity';
import { InventoryStockEntity } from '../entities/inventory-stock.entity';
import { StockEntryEntity } from '../entities/stock-entry.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { FilterProductsDto } from '../dto/filter-products.dto';
import { CreateStockEntryDto } from '../dto/create-stock-entry.dto';
import { BulkImportProductsDto } from '../dto/bulk-import-products.dto';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    @InjectRepository(BrandEntity)
    private readonly brandRepository: Repository<BrandEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(InventoryStockEntity)
    private readonly stockRepository: Repository<InventoryStockEntity>,
    @InjectRepository(StockEntryEntity)
    private readonly stockEntryRepository: Repository<StockEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const count = await this.categoryRepository.count();
    if (count === 0) {
      const defaults = [
        { name: 'Femenino', slug: 'femenino', displayOrder: 1 },
        { name: 'Masculino', slug: 'masculino', displayOrder: 2 },
        { name: 'Árabe', slug: 'arabe', displayOrder: 3 },
        { name: 'Unisex', slug: 'unisex', displayOrder: 4 },
      ];
      for (const d of defaults) {
        await this.categoryRepository.save(
          this.categoryRepository.create({ ...d, isActive: true }),
        );
      }
    }
  }

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
      .leftJoinAndSelect('product.category', 'category')
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
      query.andWhere(
        '(LOWER(category.slug) = LOWER(:category) OR LOWER(category.name) = LOWER(:category))',
        { category },
      );
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
      const marginPercent = price > 0 ? Math.round((profit / price) * 100) : 0;

      return {
        id: p.id,
        barcode: p.barcode,
        brand: p.brand?.name ?? '',
        name: p.name,
        size: p.size,
        category: p.category?.name ?? '',
        categoryId: p.categoryId ?? null,
        categorySlug: p.category?.slug ?? null,
        totalIn: p.stock?.totalIn ?? 0,
        totalSold: p.stock?.totalSold ?? 0,
        stock: p.stock?.currentStock ?? 0,
        costPrice: cost,
        price,
        profit,
        marginPercent,
        isWebVisible: p.isWebVisible ?? false,
        webBadge: p.webBadge ?? null,
        webPrice: p.webPrice ? Number(p.webPrice) : null,
        receptionDate: p.receptionDate
          ? new Date(p.receptionDate).toLocaleDateString('es-ES')
          : '',
        isActive: p.isActive,
        imageId: p.imageId ?? null,
        imageUrl: p.imageUrl ?? p.image?.url ?? (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null),
        images: Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : (p.imageUrl || p.image?.url ? [p.imageUrl || p.image?.url] : []),
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
        category: true,
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

    const resolvedImageUrl =
      product.imageUrl ??
      product.image?.url ??
      (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null);

    const resolvedImages =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : (resolvedImageUrl ? [resolvedImageUrl] : []);

    product.imageUrl = resolvedImageUrl;
    product.images = resolvedImages;

    return product;
  }

  async findByBarcode(barcode: string): Promise<ProductEntity | null> {
    return await this.productRepository.findOne({
      where: { barcode },
      relations: {
        brand: true,
        category: true,
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

    // 2. Buscar o crear la Marca y Categoría
    const brand = await this.findOrCreateBrand(createDto.brandName);
    let categoryId = createDto.categoryId ?? null;
    if (!categoryId && (createDto.categoryName || createDto.category)) {
      const cat = await this.findOrCreateCategory(
        createDto.categoryName || createDto.category!,
      );
      categoryId = cat.id;
    }

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
        categoryId,
        costPrice: createDto.costPrice ?? null,
        sellingPrice: createDto.sellingPrice ?? null,
        brandId: brand.id,
        imageId: createDto.imageId ?? null,
        imageUrl: createDto.imageUrl ?? (createDto.images?.[0] ?? null),
        images: createDto.images ?? (createDto.imageUrl ? [createDto.imageUrl] : []),
        isActive: createDto.isActive ?? true,
        isWebVisible: createDto.isWebVisible ?? false,
        webBadge: createDto.webBadge ?? null,
        webPrice: createDto.webPrice ?? null,
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
        const initialCost = createDto.costPrice ? Number(createDto.costPrice) : null;
        const entry = queryRunner.manager.create(StockEntryEntity, {
          productId: savedProduct.id,
          quantity: initialStock,
          unitCost: initialCost,
          totalCost: initialCost ? initialCost * initialStock : null,
          previousAverageCost: null,
          newAverageCost: initialCost,
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
    if (updateDto.categoryId !== undefined) {
      product.categoryId = updateDto.categoryId;
    } else if (updateDto.categoryName || updateDto.category) {
      const cat = await this.findOrCreateCategory(
        updateDto.categoryName || updateDto.category!,
      );
      product.categoryId = cat.id;
    }
    if (updateDto.costPrice !== undefined) product.costPrice = updateDto.costPrice;
    if (updateDto.sellingPrice !== undefined) product.sellingPrice = updateDto.sellingPrice;
    if (updateDto.imageId !== undefined) product.imageId = updateDto.imageId;
    if (updateDto.imageUrl !== undefined) product.imageUrl = updateDto.imageUrl;
    if (updateDto.images !== undefined) {
      product.images = updateDto.images;
      if (updateDto.images.length > 0 && !product.imageUrl) {
        product.imageUrl = updateDto.images[0];
      }
    }
    if (updateDto.isActive !== undefined) product.isActive = updateDto.isActive;
    if (updateDto.isWebVisible !== undefined) product.isWebVisible = updateDto.isWebVisible;
    if (updateDto.webBadge !== undefined) product.webBadge = updateDto.webBadge;
    if (updateDto.webPrice !== undefined) product.webPrice = updateDto.webPrice;
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
      const unitCost = dto.unitCost !== undefined && dto.unitCost !== null
        ? Number(dto.unitCost)
        : (product.costPrice ? Number(product.costPrice) : null);
      const totalCost = unitCost !== null ? unitCost * dto.quantity : null;

      // 1. Cálculo de Costo Promedio Ponderado (PPP)
      const currentStock = Number(product.stock?.currentStock ?? 0);
      const previousAverageCost = product.costPrice ? Number(product.costPrice) : null;
      let newAverageCost: number | null = null;

      if (unitCost !== null) {
        if (currentStock > 0 && previousAverageCost !== null && previousAverageCost > 0) {
          const currentTotalValue = currentStock * previousAverageCost;
          const newEntryValue = dto.quantity * unitCost;
          const totalUnits = currentStock + dto.quantity;
          newAverageCost = totalUnits > 0
            ? Math.round((currentTotalValue + newEntryValue) / totalUnits)
            : unitCost;
        } else {
          newAverageCost = unitCost;
        }
      } else {
        newAverageCost = previousAverageCost;
      }

      const entry = queryRunner.manager.create(StockEntryEntity, {
        productId: product.id,
        quantity: dto.quantity,
        unitCost,
        totalCost,
        previousAverageCost,
        newAverageCost,
        batchNumber: dto.batchNumber ?? null,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        notes: dto.notes ?? null,
      });

      const savedEntry = await queryRunner.manager.save(StockEntryEntity, entry);

      // 2. Actualizar el costo promedio ponderado en ProductEntity
      if (newAverageCost !== null) {
        await queryRunner.manager.update(
          ProductEntity,
          { id: product.id },
          { costPrice: newAverageCost },
        );
      }

      // 3. Actualizar stock
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
          let categoryId: string | null = null;
          if (item.category) {
            const cat = await this.findOrCreateCategory(item.category);
            categoryId = cat.id;
          }

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
              const safeEntryDate = item.receptionDate ? this.parseSafeDate(item.receptionDate) : new Date();
              const entry = queryRunner.manager.create(StockEntryEntity, {
                productId: existing.id,
                quantity,
                unitCost: item.costPrice ?? null,
                totalCost: item.costPrice ? item.costPrice * quantity : null,
                previousAverageCost: existing.costPrice ? Number(existing.costPrice) : null,
                newAverageCost: item.costPrice ? Number(item.costPrice) : null,
                entryDate: safeEntryDate,
                batchNumber: (item as { batchNumber?: string }).batchNumber ?? null,
                notes: 'Carga masiva - Reposición de stock',
              });
              await queryRunner.manager.save(StockEntryEntity, entry);
            }
            updated++;
          } else {
            // Producto nuevo
            const safeReceptionDate = item.receptionDate ? this.parseSafeDate(item.receptionDate) : null;
            const newProduct = queryRunner.manager.create(ProductEntity, {
              barcode: item.barcode,
              name: item.name,
              size: item.size ?? '100 ml',
              categoryId,
              costPrice: item.costPrice ?? null,
              sellingPrice: item.sellingPrice ?? null,
              brandId: brand.id,
              isActive: true,
              receptionDate: safeReceptionDate,
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
                previousAverageCost: null,
                newAverageCost: item.costPrice ? Number(item.costPrice) : null,
                entryDate: safeReceptionDate || new Date(),
                batchNumber: (item as { batchNumber?: string }).batchNumber ?? null,
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

  // --- Métodos de Categorías (Categories) ---
  async findAllCategories(): Promise<CategoryEntity[]> {
    const categories = await this.categoryRepository.find({
      relations: { products: true },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
    return categories.map((cat) => ({
      ...cat,
      productCount: cat.products ? cat.products.length : 0,
    })) as unknown as CategoryEntity[];
  }

  async createCategory(createCategoryDto: CreateCategoryDto): Promise<CategoryEntity> {
    const trimmed = createCategoryDto.name.trim();
    const existing = await this.categoryRepository.findOne({
      where: [{ name: trimmed }],
    });

    if (existing) {
      return existing;
    }

    const slug =
      createCategoryDto.slug ||
      trimmed
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const category = this.categoryRepository.create({
      name: trimmed,
      slug,
      description: createCategoryDto.description ?? null,
      displayOrder: createCategoryDto.displayOrder ?? 0,
      isActive: createCategoryDto.isActive ?? true,
    });

    return await this.categoryRepository.save(category);
  }

  async findCategoryById(id: string): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoría con ID "${id}" no encontrada.`);
    }
    return category;
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    const category = await this.findCategoryById(id);

    if (updateCategoryDto.name !== undefined) {
      category.name = updateCategoryDto.name.trim();
    }
    if (updateCategoryDto.slug !== undefined) {
      category.slug = updateCategoryDto.slug.trim().toLowerCase();
    }
    if (updateCategoryDto.description !== undefined) {
      category.description = updateCategoryDto.description.trim();
    }
    if (updateCategoryDto.displayOrder !== undefined) {
      category.displayOrder = updateCategoryDto.displayOrder;
    }
    if (updateCategoryDto.isActive !== undefined) {
      category.isActive = updateCategoryDto.isActive;
    }

    return await this.categoryRepository.save(category);
  }

  async deleteCategory(id: string): Promise<{ id: string; deleted: boolean }> {
    await this.findCategoryById(id);

    // Desvincular productos antes de eliminar para no violar integridad referencial
    await this.productRepository.update(
      { categoryId: id },
      { categoryId: null },
    );

    await this.categoryRepository.delete(id);
    return { id, deleted: true };
  }

  private async findOrCreateCategory(categoryName: string): Promise<CategoryEntity> {
    const trimmed = categoryName?.trim() || 'Unisex';
    let category = await this.categoryRepository.findOne({
      where: [{ name: trimmed }, { slug: trimmed.toLowerCase() }],
    });

    if (!category) {
      const slug = trimmed
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      category = this.categoryRepository.create({
        name: trimmed,
        slug: slug || 'general',
        isActive: true,
      });
      category = await this.categoryRepository.save(category);
    }

    return category;
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

  async findAllStockEntries(limit = 100) {
    const entries = await this.stockEntryRepository.find({
      relations: { product: { brand: true } },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return entries.map((e) => {
      const sellingPrice = e.product?.sellingPrice ? Number(e.product.sellingPrice) : 0;
      const unitCost = Number(e.unitCost || 0);
      const lotMargin = sellingPrice > 0 && unitCost > 0 ? sellingPrice - unitCost : 0;
      const lotMarginPercent =
        sellingPrice > 0 && unitCost > 0 ? Math.round((lotMargin / sellingPrice) * 100) : 0;

      return {
        id: e.id,
        productId: e.productId,
        barcode: e.product?.barcode || '',
        brand: e.product?.brand?.name || '',
        name: e.product?.name || '',
        size: e.product?.size || '',
        quantity: e.quantity,
        date: e.entryDate
          ? new Date(e.entryDate).toLocaleDateString('es-ES')
          : new Date(e.createdAt).toLocaleDateString('es-ES'),
        unitCost,
        totalCost: Number(e.totalCost || (unitCost * e.quantity)),
        sellingPrice,
        lotMargin,
        lotMarginPercent,
        previousAverageCost: e.previousAverageCost ? Number(e.previousAverageCost) : null,
        newAverageCost: e.newAverageCost ? Number(e.newAverageCost) : null,
        batchNumber: e.batchNumber ?? undefined,
        notes: e.notes ?? undefined,
      };
    });
  }

  async findStockEntriesByProductId(productId: string) {
    const product = await this.findById(productId);
    const sellingPrice = product.sellingPrice ? Number(product.sellingPrice) : 0;

    const entries = await this.stockEntryRepository.find({
      where: { productId: product.id },
      order: { entryDate: 'DESC', createdAt: 'DESC' },
    });

    return entries.map((e) => {
      const unitCost = Number(e.unitCost || 0);
      const lotMargin = sellingPrice > 0 && unitCost > 0 ? sellingPrice - unitCost : 0;
      const lotMarginPercent =
        sellingPrice > 0 && unitCost > 0 ? Math.round((lotMargin / sellingPrice) * 100) : 0;

      return {
        id: e.id,
        productId: e.productId,
        quantity: e.quantity,
        entryDate: e.entryDate,
        date: e.entryDate
          ? new Date(e.entryDate).toLocaleDateString('es-ES')
          : new Date(e.createdAt).toLocaleDateString('es-ES'),
        dateFormatted: e.entryDate
          ? new Date(e.entryDate).toLocaleDateString('es-ES')
          : new Date(e.createdAt).toLocaleDateString('es-ES'),
        unitCost,
        totalCost: Number(e.totalCost || (unitCost * e.quantity)),
        sellingPrice,
        lotMargin,
        lotMarginPercent,
        batchNumber: e.batchNumber ?? null,
        previousAverageCost: e.previousAverageCost ? Number(e.previousAverageCost) : null,
        newAverageCost: e.newAverageCost ? Number(e.newAverageCost) : null,
        notes: e.notes ?? null,
        createdAt: e.createdAt,
      };
    });
  }

  async getProfitabilitySummary() {
    const products = await this.productRepository.find({
      relations: { brand: true, category: true, stock: true },
      order: { createdAt: 'DESC' },
    });

    const report = products.map((p) => {
      const sellingPrice = p.sellingPrice ? Number(p.sellingPrice) : 0;
      const costPrice = p.costPrice ? Number(p.costPrice) : 0;
      const margin = sellingPrice > 0 && costPrice > 0 ? sellingPrice - costPrice : 0;
      const marginPercent = sellingPrice > 0 ? Math.round((margin / sellingPrice) * 100) : 0;
      const currentStock = p.stock?.currentStock ?? 0;
      const totalInventoryCost = currentStock * costPrice;
      const totalInventorySale = currentStock * sellingPrice;
      const projectedProfit = currentStock * margin;

      return {
        id: p.id,
        barcode: p.barcode,
        name: p.name,
        brand: p.brand?.name ?? '',
        category: p.category?.name ?? '',
        currentStock,
        costPrice,
        sellingPrice,
        margin,
        marginPercent,
        totalInventoryCost,
        totalInventorySale,
        projectedProfit,
      };
    });

    return report.sort((a, b) => b.marginPercent - a.marginPercent);
  }

  private parseSafeDate(dateInput?: string | Date | null): Date {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? new Date() : dateInput;
    const str = String(dateInput).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
}
