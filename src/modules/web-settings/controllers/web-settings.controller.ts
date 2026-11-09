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
import { Public } from '../../../common/decorators/public.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../../common/enums/permission.enum';

@Controller('web-settings')
export class WebSettingsController {
  constructor(private readonly webSettingsService: WebSettingsService) {}

  @Public()
  @Get()
  async getSettings() {
    const settings = await this.webSettingsService.getSettings();
    const campaigns = await this.webSettingsService.getCampaigns(true);
    return {
      settings,
      activeCampaigns: campaigns,
    };
  }

  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @Patch()
  async updateSettings(@Body() dto: UpdateWebSettingsDto) {
    return await this.webSettingsService.updateSettings(dto);
  }

  @Public()
  @Get('campaigns')
  async getCampaigns(@Query('activeOnly') activeOnly?: string) {
    return await this.webSettingsService.getCampaigns(activeOnly === 'true');
  }

  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @Post('campaigns')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return await this.webSettingsService.createCampaign(dto);
  }

  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @Patch('campaigns/:id')
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return await this.webSettingsService.updateCampaign(id, dto);
  }

  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @Delete('campaigns/:id')
  async deleteCampaign(@Param('id') id: string) {
    return await this.webSettingsService.deleteCampaign(id);
  }
}
