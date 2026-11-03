import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const UPLOAD_DESTINATION = './uploads/images';

export const multerDiskStorage = diskStorage({
  destination: (req, file, callback) => {
    if (!existsSync(UPLOAD_DESTINATION)) {
      mkdirSync(UPLOAD_DESTINATION, { recursive: true });
    }
    callback(null, UPLOAD_DESTINATION);
  },
  filename: (req, file, callback) => {
    const fileExtension = extname(file.originalname).toLowerCase();
    const uniqueFilename = `${Date.now()}-${randomUUID()}${fileExtension}`;
    callback(null, uniqueFilename);
  },
});

export const imageFileFilter = (
  req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Formatos aceptados: jpg, png, webp, gif, svg.`,
      ),
      false,
    );
  }

  callback(null, true);
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
