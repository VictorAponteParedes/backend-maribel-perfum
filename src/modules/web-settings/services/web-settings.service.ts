import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSettingEntity } from '../entities/web-setting.entity';
import { CampaignEntity } from '../entities/campaign.entity';
import { UpdateWebSettingsDto } from '../dto/update-web-settings.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';

@Injectable()
export class WebSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(WebSettingEntity)
    private readonly settingsRepository: Repository<WebSettingEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>,
  ) {}

  async onModuleInit() {
    // Inicializar configuración general si no existe
    let setting = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (!setting) {
      setting = this.settingsRepository.create({
        id: 1,
        announcementText:
          'Envíos a todo el país · Caja de lujo de obsequio con tarjeta dedicatoria en compras desde Gs. 250.000',
        announcementActive: true,
        freeShippingThreshold: 250000,
        whatsappNumber: '0981445892',
        storeAddress: 'Asunción, Paraguay',
        bankDetails: [
          {
            bank: 'Banco Itaú Paraguay',
            accountType: 'Cuenta Corriente',
            accountNumber: '720019283',
            holder: 'Maribel Perfumería S.A.',
            ruc: '80045231-8',
          },
          {
            bank: 'Banco Continental',
            accountType: 'Caja de Ahorro',
            accountNumber: '01-294819-02',
            holder: 'Maribel Perfumería S.A.',
            ruc: '80045231-8',
          },
        ],
        deliveryRates: [
          { city: 'Asunción', cost: 25000 },
          {
            city: 'Gran Asunción (Luque, San Lorenzo, Lambaré, Fernando, Mariano)',
            cost: 30000,
          },
          { city: 'Interior del país (Transportadora)', cost: 40000 },
        ],
      });
      await this.settingsRepository.save(setting);
    }

    // Inicializar campaña principal si no existe
    const campaignCount = await this.campaignRepository.count();
    if (campaignCount === 0) {
      const defaultCampaign = this.campaignRepository.create({
        tag: 'EDICIÓN ESPECIAL ✨',
        title: 'Regalos que enamoran · Fragancias Exclusivas',
        subtitle:
          'Envío gratis desde Gs. 250.000 + Caja de lujo Maribel con tarjeta dedicatoria de obsequio.',
        buttonText: 'Ver Colección Especial ✨',
        buttonLink: '/combos',
        isActive: true,
        displayOrder: 1,
      });
      await this.campaignRepository.save(defaultCampaign);
    }
  }

  async getSettings(): Promise<WebSettingEntity> {
    let setting = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (!setting) {
      setting = this.settingsRepository.create({ id: 1 });
      await this.settingsRepository.save(setting);
    }
    return setting;
  }

  async updateSettings(dto: UpdateWebSettingsDto): Promise<WebSettingEntity> {
    const setting = await this.getSettings();

    if (dto.announcementText !== undefined) setting.announcementText = dto.announcementText;
    if (dto.announcementActive !== undefined) setting.announcementActive = dto.announcementActive;
    if (dto.freeShippingThreshold !== undefined) setting.freeShippingThreshold = dto.freeShippingThreshold;
    if (dto.whatsappNumber !== undefined) setting.whatsappNumber = dto.whatsappNumber;
    if (dto.storeAddress !== undefined) setting.storeAddress = dto.storeAddress;
    if (dto.bankDetails !== undefined) setting.bankDetails = dto.bankDetails;
    if (dto.deliveryRates !== undefined) setting.deliveryRates = dto.deliveryRates;

    return await this.settingsRepository.save(setting);
  }

  async getCampaigns(activeOnly = false): Promise<CampaignEntity[]> {
    const where: { isActive?: boolean } = {};
    if (activeOnly) {
      where.isActive = true;
    }
    return await this.campaignRepository.find({
      where,
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async createCampaign(dto: CreateCampaignDto): Promise<CampaignEntity> {
    const campaign = this.campaignRepository.create({
      title: dto.title.trim(),
      tag: dto.tag?.trim() || 'EDICIÓN ESPECIAL ✨',
      subtitle: dto.subtitle?.trim() || '',
      buttonText: dto.buttonText?.trim() || 'Ver Colección Especial ✨',
      buttonLink: dto.buttonLink?.trim() || '/combos',
      imageUrl: dto.imageUrl?.trim() || null,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? 1,
    });
    return await this.campaignRepository.save(campaign);
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto): Promise<CampaignEntity> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaña con ID "${id}" no encontrada.`);
    }

    if (dto.title !== undefined) campaign.title = dto.title.trim();
    if (dto.tag !== undefined) campaign.tag = dto.tag.trim();
    if (dto.subtitle !== undefined) campaign.subtitle = dto.subtitle.trim();
    if (dto.buttonText !== undefined) campaign.buttonText = dto.buttonText.trim();
    if (dto.buttonLink !== undefined) campaign.buttonLink = dto.buttonLink.trim();
    if (dto.imageUrl !== undefined) campaign.imageUrl = dto.imageUrl.trim();
    if (dto.isActive !== undefined) campaign.isActive = dto.isActive;
    if (dto.displayOrder !== undefined) campaign.displayOrder = dto.displayOrder;

    return await this.campaignRepository.save(campaign);
  }

  async deleteCampaign(id: string): Promise<{ id: string; deleted: boolean }> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaña con ID "${id}" no encontrada.`);
    }
    await this.campaignRepository.delete(id);
    return { id, deleted: true };
  }
}
