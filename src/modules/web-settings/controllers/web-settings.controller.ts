import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WebSettingsService } from '../services/web-settings.service';
import { UpdateWebSettingsDto } from '../dto/update-web-settings.dto';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';

@Controller('web-settings')
export class WebSettingsController {
  constructor(private readonly webSettingsService: WebSettingsService) {}

  @Get()
  async getSettings() {
    const settings = await this.webSettingsService.getSettings();
    const campaigns = await this.webSettingsService.getCampaigns(true);
    return {
      settings,
      activeCampaigns: campaigns,
    };
  }

  @Patch()
  async updateSettings(@Body() dto: UpdateWebSettingsDto) {
    return await this.webSettingsService.updateSettings(dto);
  }

  @Get('campaigns')
  async getCampaigns(@Query('activeOnly') activeOnly?: string) {
    return await this.webSettingsService.getCampaigns(activeOnly === 'true');
  }

  @Post('campaigns')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return await this.webSettingsService.createCampaign(dto);
  }

  @Patch('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return await this.webSettingsService.updateCampaign(id, dto);
  }

  @Delete('campaigns/:id')
  async deleteCampaign(@Param('id') id: string) {
    return await this.webSettingsService.deleteCampaign(id);
  }
}
