import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import { OrderLocationEntity } from '../entities/order-location.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { FilterOrdersDto } from '../dto/filter-orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepository: Repository<OrderItemEntity>,
    @InjectRepository(OrderLocationEntity)
    private readonly locationRepository: Repository<OrderLocationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filterDto: FilterOrdersDto) {
    const { search, status, page = 1, limit = 50 } = filterDto;

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.location', 'location')
      .leftJoinAndSelect('order.items', 'items');

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        `(
          LOWER(order.orderNumber) LIKE LOWER(:search) OR
          LOWER(order.customerName) LIKE LOWER(:search) OR
          order.customerPhone LIKE :search OR
          LOWER(location.address) LIKE LOWER(:search) OR
          EXISTS (
            SELECT 1 FROM order_items oi
            WHERE oi.order_id = order.id AND (
              LOWER(oi.name) LIKE LOWER(:search) OR
              LOWER(oi.brand) LIKE LOWER(:search) OR
              oi.barcode LIKE :search
            )
          )
        )`,
        { search: `%${search}%` },
      );
    }

    query
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await query.getManyAndCount();

    const mapped = orders.map((o) => this.mapToFrontendOrder(o));

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

  async findById(id: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        items: true,
        location: true,
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con ID "${id}" no encontrado.`);
    }

    return order;
  }

  async create(createDto: CreateOrderDto): Promise<OrderEntity> {
    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderNumber = await this.generateOrderNumber();

      let subtotal = 0;
      let totalQuantity = 0;

      const orderItems: OrderItemEntity[] = [];

      for (const item of createDto.items) {
        const itemSubtotal = item.unitPrice * item.quantity;
        subtotal += itemSubtotal;
        totalQuantity += item.quantity;

        const orderItem = queryRunner.manager.create(OrderItemEntity, {
          barcode: item.barcode,
          brand: item.brand,
          name: item.name,
          size: item.size ?? null,
          variant: item.variant ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
          productId: item.productId ?? null,
        });

        orderItems.push(orderItem);
      }

      const deliveryFee = createDto.deliveryFee ?? 0;
      const total = subtotal + deliveryFee;

      const order = queryRunner.manager.create(OrderEntity, {
        orderNumber,
        customerId: createDto.customerId ?? null,
        customerName: createDto.customerName,
        customerPhone: createDto.customerPhone,
        deliveryType: createDto.deliveryType,
        totalQuantity,
        subtotal,
        deliveryFee,
        total,
        paymentMethod: createDto.paymentMethod,
        paymentStatus: createDto.paymentStatus,
        status: createDto.status ?? OrderStatus.PENDING,
        notes: createDto.notes ?? null,
      });

      const savedOrder = await queryRunner.manager.save(OrderEntity, order);

      // Guardar items
      for (const oi of orderItems) {
        oi.orderId = savedOrder.id;
        await queryRunner.manager.save(OrderItemEntity, oi);
      }

      // Guardar ubicación si fue provista
      if (createDto.location) {
        const loc = queryRunner.manager.create(OrderLocationEntity, {
          orderId: savedOrder.id,
          latitude: createDto.location.latitude ?? null,
          longitude: createDto.location.longitude ?? null,
          address: createDto.location.address ?? null,
          reference: createDto.location.reference ?? null,
          city: createDto.location.city ?? null,
        });
        await queryRunner.manager.save(OrderLocationEntity, loc);
      }

      await queryRunner.commitTransaction();

      return await this.findById(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: string, status: OrderStatus): Promise<OrderEntity> {
    const order = await this.findById(id);
    order.status = status;
    await this.orderRepository.save(order);
    return await this.findById(id);
  }

  async getMetrics() {
    const [
      totalCount,
      pendingCount,
      preparingCount,
      shippedCount,
      deliveredCount,
    ] = await Promise.all([
      this.orderRepository.count(),
      this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.orderRepository.count({ where: { status: OrderStatus.PREPARING } }),
      this.orderRepository.count({ where: { status: OrderStatus.SHIPPED } }),
      this.orderRepository.count({ where: { status: OrderStatus.DELIVERED } }),
    ]);

    return {
      totalCount,
      pendingCount,
      preparingCount,
      shippedCount,
      deliveredCount,
    };
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    const order = await this.findById(id);
    await this.orderRepository.softDelete(order.id);
    return { id, deleted: true };
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.orderRepository.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `ORD-${year}-${sequence}`;
  }

  private mapToFrontendOrder(o: OrderEntity) {
    const dateFormatted = o.createdAt
      ? new Date(o.createdAt).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      date: dateFormatted,
      rawDate: o.createdAt ? o.createdAt.toISOString() : '',
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryType: o.deliveryType,
      location: o.location
        ? {
            latitude: o.location.latitude ? Number(o.location.latitude) : 0,
            longitude: o.location.longitude ? Number(o.location.longitude) : 0,
            address: o.location.address ?? '',
            reference: o.location.reference ?? '',
            city: o.location.city ?? '',
          }
        : undefined,
      items: (o.items || []).map((it) => ({
        barcode: it.barcode,
        brand: it.brand,
        name: it.name,
        size: it.size ?? undefined,
        variant: it.variant ?? undefined,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        subtotal: Number(it.subtotal),
      })),
      totalQuantity: o.totalQuantity,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.deliveryFee),
      total: Number(o.total),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.status,
      notes: o.notes ?? undefined,
    };
  }
}
