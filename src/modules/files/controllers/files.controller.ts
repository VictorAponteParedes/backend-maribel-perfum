import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from '../services/files.service';
import { UpdateFileDto } from '../dto/update-file.dto';
import {
  MAX_FILE_SIZE,
  imageFileFilter,
  multerDiskStorage,
} from '../helpers/file-upload.helper';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerDiskStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('altText') altText?: string,
  ) {
    return await this.filesService.saveFile(file, altText);
  }

  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multerDiskStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return await this.filesService.saveMultipleFiles(files);
  }

  @Get(':id')
  async getFileMetadata(@Param('id') id: string) {
    return await this.filesService.findById(id);
  }

  @Get('stream/:filename')
  async streamFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const physicalPath = this.filesService.getPhysicalPath(filename);
    res.sendFile(physicalPath);
  }

  @Patch(':id')
  async updateMetadata(
    @Param('id') id: string,
    @Body() updateDto: UpdateFileDto,
  ) {
    return await this.filesService.update(id, updateDto);
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    return await this.filesService.remove(id);
  }
}
