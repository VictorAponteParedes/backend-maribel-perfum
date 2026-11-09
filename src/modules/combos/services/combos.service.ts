import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ComboEntity } from '../entities/combo.entity';
import { ComboItemEntity } from '../entities/combo-item.entity';
import { ProductEntity } from '../../products/entities/product.entity';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';

@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(ComboEntity)
    private readonly comboRepository: Repository<ComboEntity>,
    @InjectRepository(ComboItemEntity)
    private readonly comboItemRepository: Repository<ComboItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(activeOnly = false): Promise<ComboEntity[]> {
    const where: { isActive?: boolean } = {};
    if (activeOnly) {
      where.isActive = true;
    }

    return await this.comboRepository.find({
      where,
      relations: {
        image: true,
        items: {
          product: {
            brand: true,
            category: true,
          },
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findById(id: string): Promise<ComboEntity> {
    const combo = await this.comboRepository.findOne({
      where: { id },
      relations: {
        image: true,
        items: {
          product: {
            brand: true,
            category: true,
          },
        },
      },
    });

    if (!combo) {
      throw new NotFoundException(`Combo con ID "${id}" no encontrado.`);
    }

    return combo;
  }

  async create(createDto: CreateComboDto): Promise<ComboEntity> {
    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException('El combo debe contener al menos un producto.');
    }

    // Buscar los productos seleccionados para calcular precios
    const productIds = createDto.items.map((i) => i.productId);
    const products = await this.productRepository.findBy({ id: In(productIds) });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos del combo no existen.');
    }

    const productMap = new Map<string, ProductEntity>(products.map((p) => [p.id, p]));

    // Calcular suma individual
    let normalSum = 0;
    const itemsToCreate: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of createDto.items) {
      const prod = productMap.get(item.productId)!;
      const unitPrice = Number(prod.webPrice || prod.sellingPrice || 0);
      normalSum += unitPrice * item.quantity;

      itemsToCreate.push({
        productId: prod.id,
        quantity: item.quantity,
        unitPrice,
      });
    }

    const savingsAmount = Math.max(0, normalSum - createDto.price);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const combo = queryRunner.manager.create(ComboEntity, {
        title: createDto.title.trim(),
        kicker: createDto.kicker?.trim() || '★ FAVORITO BOUTIQUE',
        description: createDto.description?.trim() || null,
        price: createDto.price,
        originalPrice: normalSum,
        savingsAmount,
        imageId: createDto.imageId ?? null,
        imageUrl: createDto.imageUrl?.trim() || null,
        images: createDto.images ?? [],
        isActive: createDto.isActive ?? true,
      });

      const savedCombo = await queryRunner.manager.save(ComboEntity, combo);

      const comboItems = itemsToCreate.map((item) =>
        queryRunner.manager.create(ComboItemEntity, {
          comboId: savedCombo.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      );

      await queryRunner.manager.save(ComboItemEntity, comboItems);
      await queryRunner.commitTransaction();

      return await this.findById(savedCombo.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateDto: UpdateComboDto): Promise<ComboEntity> {
    const combo = await this.findById(id);

    if (updateDto.title !== undefined) combo.title = updateDto.title.trim();
    if (updateDto.kicker !== undefined) combo.kicker = updateDto.kicker.trim();
    if (updateDto.description !== undefined) combo.description = updateDto.description.trim();
    if (updateDto.imageId !== undefined) combo.imageId = updateDto.imageId;
    if (updateDto.imageUrl !== undefined) combo.imageUrl = updateDto.imageUrl.trim();
    if (updateDto.images !== undefined) combo.images = updateDto.images;
    if (updateDto.isActive !== undefined) combo.isActive = updateDto.isActive;

    if (updateDto.price !== undefined) {
      combo.price = updateDto.price;
      combo.savingsAmount = Math.max(0, Number(combo.originalPrice) - updateDto.price);
    }

    // Si cambian los items
    if (updateDto.items && updateDto.items.length > 0) {
      const productIds = updateDto.items.map((i) => i.productId);
      const products = await this.productRepository.findBy({ id: In(productIds) });
      const productMap = new Map<string, ProductEntity>(products.map((p) => [p.id, p]));

      let normalSum = 0;
      for (const item of updateDto.items) {
        const prod = productMap.get(item.productId);
        if (prod) {
          const unitPrice = Number(prod.webPrice || prod.sellingPrice || 0);
          normalSum += unitPrice * item.quantity;
        }
      }

      combo.originalPrice = normalSum;
      combo.savingsAmount = Math.max(0, normalSum - Number(combo.price));

      // Eliminar items antiguos y guardar nuevos
      await this.comboItemRepository.delete({ comboId: id });
      const newItems = updateDto.items.map((item) => {
        const prod = productMap.get(item.productId)!;
        return this.comboItemRepository.create({
          comboId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(prod.webPrice || prod.sellingPrice || 0),
        });
      });
      await this.comboItemRepository.save(newItems);
    }

    await this.comboRepository.save(combo);
    return await this.findById(id);
  }

  async toggleActive(id: string): Promise<ComboEntity> {
    const combo = await this.findById(id);
    combo.isActive = !combo.isActive;
    await this.comboRepository.save(combo);
    return combo;
  }

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    const combo = await this.findById(id);
    await this.comboRepository.softDelete(combo.id);
    return { id, deleted: true };
  }
}
