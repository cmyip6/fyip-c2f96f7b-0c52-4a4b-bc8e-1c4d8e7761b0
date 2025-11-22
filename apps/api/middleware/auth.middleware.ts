import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

declare module 'express' {
  interface Request {
    user?: AuthUserInterface;
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  logger = new Logger(AuthMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      this.logger.warn(
        `Request without authorization header is accessing ${req.path}`,
      );
      return next();
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer === 'Bearer' && token) {
      const secret = process.env.JWT_SECRET;

      try {
        this.logger.verbose('Decoding token');
        const decoded: { user: AuthUserInterface } = jwt.verify(token, secret);

        if (decoded.user && this.validateUserStructure(decoded.user)) {
          this.logger.verbose('User verified, setting user to header.');
          this.logger.verbose(JSON.stringify(decoded.user, null, 10));
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

  private validateUserStructure(user: AuthUserInterface): boolean {
    return Boolean(user.id && user.email && user.role && user.tokenExpiry);
  }
}
