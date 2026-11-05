import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSettingEntity } from './entities/web-setting.entity';
import { CampaignEntity } from './entities/campaign.entity';
import { WebSettingsService } from './services/web-settings.service';
import { WebSettingsController } from './controllers/web-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebSettingEntity, CampaignEntity]),
  ],
  controllers: [WebSettingsController],
  providers: [WebSettingsService],
  exports: [WebSettingsService, TypeOrmModule],
})
export class WebSettingsModule {}
