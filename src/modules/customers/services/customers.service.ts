import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from '../entities/customer.entity';
import { CreateCustomerDto } from '../dto/create-customer.dto';
import { UpdateCustomerDto } from '../dto/update-customer.dto';
import { FilterCustomersDto } from '../dto/filter-customers.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  async findAll(filterDto: FilterCustomersDto) {
    const { search, isActive, page = 1, limit = 50 } = filterDto;

    const query = this.customerRepository.createQueryBuilder('customer');

    if (search) {
      const searchNum = Number(search);
      if (!isNaN(searchNum)) {
        query.andWhere(
          '(customer.code = :searchNum OR LOWER(customer.name) LIKE LOWER(:search) OR customer.phone LIKE :search)',
          { searchNum, search: `%${search}%` },
        );
      } else {
        query.andWhere(
          '(LOWER(customer.name) LIKE LOWER(:search) OR customer.phone LIKE :search)',
          { search: `%${search}%` },
        );
      }
    }

    if (isActive !== undefined) {
      query.andWhere('customer.isActive = :isActive', { isActive });
    }

    query
      .orderBy('customer.code', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();

    const mapped = items.map((c) => ({
      id: c.id,
      code: c.code,
      registrationDate: c.createdAt
        ? new Date(c.createdAt).toLocaleDateString('es-ES')
        : '',
      name: c.name,
      phone: c.phone || 'Sin teléfono',
      address: c.address || 'Sin dirección',
      reference: c.reference ?? null,
      city: c.city ?? null,
      latitude: c.latitude ? Number(c.latitude) : null,
      longitude: c.longitude ? Number(c.longitude) : null,
      gpsUrl:
        c.gpsUrl ||
        (c.latitude && c.longitude
          ? `https://www.google.com/maps?q=${c.latitude},${c.longitude}`
          : ''),
      isActive: c.isActive,
    }));

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

  async findById(id: string): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con ID "${id}" no encontrado.`);
    }

    return customer;
  }

  async findByCode(code: number): Promise<CustomerEntity> {
    const customer = await this.customerRepository.findOne({
      where: { code },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con código "${code}" no encontrado.`);
    }

    return customer;
  }

  async create(createDto: CreateCustomerDto): Promise<CustomerEntity> {
    let gpsUrl = createDto.gpsUrl;
    if (!gpsUrl && createDto.latitude && createDto.longitude) {
      gpsUrl = `https://www.google.com/maps?q=${createDto.latitude},${createDto.longitude}`;
    }

    const customer = this.customerRepository.create({
      name: createDto.name.trim(),
      phone: createDto.phone?.trim() || 'Sin teléfono',
      address: createDto.address?.trim() || 'Sin dirección',
      reference: createDto.reference?.trim() ?? null,
      city: createDto.city?.trim() ?? null,
      latitude: createDto.latitude ?? null,
      longitude: createDto.longitude ?? null,
      gpsUrl: gpsUrl ?? null,
      isActive: createDto.isActive ?? true,
    });

    return await this.customerRepository.save(customer);
  }

  async update(
    id: string,
    updateDto: UpdateCustomerDto,
  ): Promise<CustomerEntity> {
    const customer = await this.findById(id);

    if (updateDto.name !== undefined) customer.name = updateDto.name.trim();
    if (updateDto.phone !== undefined) customer.phone = updateDto.phone.trim();
    if (updateDto.address !== undefined) customer.address = updateDto.address.trim();
    if (updateDto.reference !== undefined) customer.reference = updateDto.reference?.trim() ?? null;
    if (updateDto.city !== undefined) customer.city = updateDto.city?.trim() ?? null;
    if (updateDto.latitude !== undefined) customer.latitude = updateDto.latitude;
    if (updateDto.longitude !== undefined) customer.longitude = updateDto.longitude;
    if (updateDto.isActive !== undefined) customer.isActive = updateDto.isActive;

    if (updateDto.gpsUrl !== undefined) {
      customer.gpsUrl = updateDto.gpsUrl;
    } else if (customer.latitude && customer.longitude && !customer.gpsUrl) {
      customer.gpsUrl = `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`;
    }

    return await this.customerRepository.save(customer);
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    const customer = await this.findById(id);
    await this.customerRepository.softDelete(customer.id);
    return { id, deleted: true };
  }
}
