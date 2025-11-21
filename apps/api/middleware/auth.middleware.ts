import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthUserInterface } from '../../../libs/data/type';

declare module 'express' {
  interface Request {
    user?: AuthUserInterface;
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  logger = new Logger(AuthMiddleware.name);

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return next();
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer === 'Bearer' && token) {
      const secret = this.configService.get<string>('JWT_SECRET');

      try {
        this.logger.verbose('Decoding token');
        const decoded: { user: AuthUserInterface } = jwt.verify(token, secret);

        if (decoded.user && this.validateUserStructure(decoded.user)) {
          req.user = decoded.user;
        }
      } catch (err) {
        this.logger.warn(
          'Something went wrong when decoding token from header',
        );
      }
    }

    next();
  }

  private validateUserStructure(user: any): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return (
      user.id &&
      user.email &&
      user.role &&
      user.tokenExpiry &&
      user.tokenExpiry > currentTime
    );
  }
}
