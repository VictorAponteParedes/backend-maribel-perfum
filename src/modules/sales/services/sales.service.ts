import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SaleEntity, SaleStatus } from '../entities/sale.entity';
import { SaleItemEntity } from '../entities/sale-item.entity';
import { CreateSaleDto } from '../dto/create-sale.dto';
import { FilterSalesDto } from '../dto/filter-sales.dto';
import { ProductEntity } from '../../products/entities/product.entity';
import { InventoryStockEntity } from '../../products/entities/inventory-stock.entity';
import { OrderEntity, OrderStatus, PaymentStatus } from '../../orders/entities/order.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SaleEntity)
    private readonly saleRepository: Repository<SaleEntity>,
    @InjectRepository(SaleItemEntity)
    private readonly saleItemRepository: Repository<SaleItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filterDto: FilterSalesDto) {
    const { search, status, page = 1, limit = 50 } = filterDto;

    const query = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoinAndSelect('sale.items', 'items');

    if (status) {
      query.andWhere('sale.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        `(
          LOWER(sale.saleNumber) LIKE LOWER(:search) OR
          LOWER(sale.customerName) LIKE LOWER(:search) OR
          sale.customerPhone LIKE :search OR
          sale.customerCode LIKE :search OR
          EXISTS (
            SELECT 1 FROM sale_items si
            WHERE si.sale_id = sale.id AND (
              LOWER(si.name) LIKE LOWER(:search) OR
              LOWER(si.brand) LIKE LOWER(:search) OR
              si.barcode LIKE :search
            )
          )
        )`,
        { search: `%${search}%` },
      );
    }

    query
      .orderBy('sale.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [sales, total] = await query.getManyAndCount();

    const mapped = sales.map((s) => this.mapToFrontendSale(s));

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

  async findById(id: string): Promise<SaleEntity> {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: {
        items: true,
        customer: true,
        order: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID "${id}" no encontrada.`);
    }

    return sale;
  }

  async create(createDto: CreateSaleDto): Promise<SaleEntity> {
    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException('La venta debe incluir al menos un producto.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const saleNumber = await this.generateSaleNumber();

      let total = 0;
      let totalQuantity = 0;

      const saleItems: SaleItemEntity[] = [];

      for (const item of createDto.items) {
        const itemSubtotal = item.unitPrice * item.quantity;
        total += itemSubtotal;
        totalQuantity += item.quantity;

        // 1. Buscar producto por código de barras si no viene productId
        let productId = item.productId ?? null;
        if (!productId) {
          const product = await queryRunner.manager.findOne(ProductEntity, {
            where: { barcode: item.barcode },
          });
          if (product) {
            productId = product.id;
          }
        }

        const saleItem = queryRunner.manager.create(SaleItemEntity, {
          barcode: item.barcode,
          brand: item.brand,
          name: item.name,
          size: item.size ?? '100 ml',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
          productId,
        });

        saleItems.push(saleItem);

        // 2. Descontar stock de inventario automáticamente
        if (productId) {
          const stock = await queryRunner.manager.findOne(InventoryStockEntity, {
            where: { productId },
          });

          if (stock) {
            stock.currentStock -= item.quantity;
            stock.totalSold += item.quantity;
            await queryRunner.manager.save(InventoryStockEntity, stock);
          }
        }
      }

      // 3. Crear cabecera de venta
      const sale = queryRunner.manager.create(SaleEntity, {
        saleNumber,
        orderId: createDto.orderId ?? null,
        customerId: createDto.customerId ?? null,
        customerCode: createDto.customerCode ?? null,
        customerName: createDto.customerName,
        customerPhone: createDto.customerPhone ?? null,
        customerAddress: createDto.customerAddress ?? null,
        totalQuantity,
        total,
        status: createDto.status ?? SaleStatus.CONFIRMED,
        paymentMethod: createDto.paymentMethod ?? null,
      });

      const savedSale = await queryRunner.manager.save(SaleEntity, sale);

      // 4. Guardar items de venta
      for (const si of saleItems) {
        si.saleId = savedSale.id;
        await queryRunner.manager.save(SaleItemEntity, si);
      }

      // 5. Si la venta proviene de un pedido, actualizar el pedido a DELIVERED y PAID
      if (createDto.orderId) {
        const linkedOrder = await queryRunner.manager.findOne(OrderEntity, {
          where: { id: createDto.orderId },
        });

        if (linkedOrder) {
          linkedOrder.status = OrderStatus.DELIVERED;
          linkedOrder.paymentStatus = PaymentStatus.PAID;
          await queryRunner.manager.save(OrderEntity, linkedOrder);
        }
      }

      await queryRunner.commitTransaction();

      return await this.findById(savedSale.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getMetrics() {
    const totalCount = await this.saleRepository.count({
      where: { status: SaleStatus.CONFIRMED },
    });

    const sumResult = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.total)', 'totalAmount')
      .addSelect('SUM(sale.totalQuantity)', 'totalUnits')
      .where('sale.status = :status', { status: SaleStatus.CONFIRMED })
      .getRawOne();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayResult = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.total)', 'todayAmount')
      .where('sale.status = :status', { status: SaleStatus.CONFIRMED })
      .andWhere('sale.createdAt >= :today', { today })
      .getRawOne();

    return {
      totalCount,
      totalAmount: Number(sumResult?.totalAmount || 0),
      totalUnits: Number(sumResult?.totalUnits || 0),
      todayAmount: Number(todayResult?.todayAmount || 0),
    };
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    const sale = await this.findById(id);
    await this.saleRepository.softDelete(sale.id);
    return { id, deleted: true };
  }

  private async generateSaleNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.saleRepository.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `VTA-${year}-${sequence}`;
  }

  private mapToFrontendSale(s: SaleEntity) {
    const dateFormatted = s.createdAt
      ? new Date(s.createdAt).toLocaleDateString('es-ES')
      : '';
    const timeFormatted = s.createdAt
      ? new Date(s.createdAt).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return {
      id: s.id,
      saleNumber: s.saleNumber,
      date: dateFormatted,
      time: timeFormatted,
      customerCode: s.customerCode ?? undefined,
      customerName: s.customerName,
      customerPhone: s.customerPhone ?? undefined,
      customerAddress: s.customerAddress ?? undefined,
      items: (s.items || []).map((it) => ({
        barcode: it.barcode,
        brand: it.brand,
        name: it.name,
        size: it.size,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
      totalQuantity: s.totalQuantity,
      total: Number(s.total),
      status: s.status,
    };
  }
}
