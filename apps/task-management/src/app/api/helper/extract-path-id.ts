import { Request } from 'express';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

export const getEntityValue = (request: Request, path: string): number => {
  if (path !== null && path !== undefined) {
    const split = path.split('.');
    for (const str of split) {
      if (!request) {
        break;
      }
      request = request[str];
    }
    if (request === null || request === undefined) {
      throw new BadRequestException(`Path "${path}" is invalid!`);
    }

    if (typeof request === 'string' && !Number.isNaN(parseInt(request))) {
      return parseInt(request);
    }

    throw new InternalServerErrorException(
      'Incorrect path passed into policay check: ' + path,
    );
  }
};
