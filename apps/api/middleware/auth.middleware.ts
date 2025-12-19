import { AuthUserInterface } from '@libs/data/type/auth-user.interface';
import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { ClsService } from 'nestjs-cls';

declare module 'express' {
  interface Request {
    user?: AuthUserInterface;
    token?: string;
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  @Inject(ClsService) private readonly cls: ClsService;

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
          `User ${decoded.user.email} verified via middleware.`,
        );
        req.user = decoded.user;
        req.token = token;
        this.cls.set('userId', decoded.user.id);
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
