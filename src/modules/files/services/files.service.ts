import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from '../entities/file.entity';
import { UpdateFileDto } from '../dto/update-file.dto';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { UPLOAD_DESTINATION } from '../helpers/file-upload.helper';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async saveFile(
    file: Express.Multer.File,
    altText?: string,
  ): Promise<FileEntity> {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo.');
    }

    const baseUrl =
      process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const publicUrl = `${baseUrl}/api/v1/files/stream/${file.filename}`;

    const newFile = this.fileRepository.create({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: publicUrl,
      altText: altText ?? null,
    });

    return await this.fileRepository.save(newFile);
  }

  async saveMultipleFiles(
    files: Express.Multer.File[],
  ): Promise<FileEntity[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han subido archivos.');
    }

    const savedFiles: FileEntity[] = [];
    for (const file of files) {
      const saved = await this.saveFile(file);
      savedFiles.push(saved);
    }

    return savedFiles;
  }

  async findById(id: string): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID "${id}" no encontrado.`);
    }

    return file;
  }

  async findByFilename(filename: string): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({
      where: { filename },
    });

    if (!file) {
      throw new NotFoundException(`Archivo "${filename}" no encontrado.`);
    }

    return file;
  }

  getPhysicalPath(filename: string): string {
    const absolutePath = join(process.cwd(), UPLOAD_DESTINATION, filename);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException(`El archivo físico "${filename}" no existe en el servidor.`);
    }
    return absolutePath;
  }

  async update(id: string, updateDto: UpdateFileDto): Promise<FileEntity> {
    const file = await this.findById(id);

    if (updateDto.altText !== undefined) {
      file.altText = updateDto.altText;
    }

    return await this.fileRepository.save(file);
  }

  async remove(id: string): Promise<{ id: string; deleted: boolean }> {
    const file = await this.findById(id);

    // Intentar eliminar del disco físico
    try {
      const fullPath = join(process.cwd(), file.path);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
    } catch {
      // Si ya no existe en disco, continuamos con el borrado en BD
    }

    await this.fileRepository.remove(file);

    return { id, deleted: true };
  }
}
