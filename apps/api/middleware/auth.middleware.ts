import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

declare module 'express' {
  interface Request {
    user?: AuthUserInterface;
    token?: string;
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  logger = new Logger(AuthMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    let token = null;

    if (req.cookies && req.cookies['token']) {
      token = req.cookies['token'];
    } else {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const [bearer, extractedToken] = authHeader.split(' ');
        if (bearer === 'Bearer') {
          token = extractedToken;
        }
      }
    }

    if (!token) {
      this.logger.warn(
        `Request without authentication token accessing ${req.path}`,
      );
      return next();
    }

    const secret = process.env.JWT_SECRET;

    try {
      const decoded: { user: AuthUserInterface } = jwt.verify(token, secret);
      if (decoded.user && this.validateUserStructure(decoded.user)) {
        this.logger.verbose(
          `User ${decoded.user.username} verified via middleware.`,
        );
        req.user = decoded.user;
        req.token = token;
      }
    } catch (err) {
      this.logger.warn(`Invalid or expired token detected for ${req.path}`);
    }

    next();
  }

  private validateUserStructure(user: AuthUserInterface): boolean {
    return Boolean(user.id && user.email);
  }
}
