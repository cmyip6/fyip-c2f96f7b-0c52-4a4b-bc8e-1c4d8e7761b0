import { HttpStatus, INestApplication, Logger } from '@nestjs/common';
import { Test as TestResponse } from 'supertest';
import { DataSource } from 'typeorm';
import { UserEntity } from '@api/models/users.entity';
import { UserTypeOptions } from '../../../../libs/data/type/user-type.enum';
import { hashPassword } from '../../helper/password-hash';
const request = require('supertest');

export class BaseTest {
  private _app: INestApplication | null = null;
  public url: string = '';

  private readonly baseLogger = new Logger(BaseTest.name);

  public setApp(app: INestApplication): void {
    this._app = app;
  }

  public setUrl(url: string): void {
    this.url = url;
  }

  protected get dataSource(): DataSource {
    return this.app.get<DataSource>(DataSource);
  }
  private get app(): INestApplication {
    if (!this._app) {
      this.baseLogger.error(
        'Application instance is not set in the test class',
      );
      throw new Error('Application instance is not set in the test class');
    }
    return this._app;
  }

  protected async createSuperUser(): Promise<{
    user: UserEntity;
    cookies: { [key: string]: string };
  }> {
    const userRepo = this.dataSource.getRepository(UserEntity);

    const user = await userRepo.save({
      username: 'superuser',
      passwordHash: await hashPassword('superuser'),
      name: 'superuser',
      email: 'superuser@example.com',
      userType: UserTypeOptions.SUPER_USER,
    });

    const cookies = await this.login({
      username: 'superuser',
      password: 'superuser',
    });

    return { user, cookies };
  }

  public async login(credentials: {
    username: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<{ [key: string]: string }> {
    const response = await this.post('/auth/login', credentials).expect(
      HttpStatus.CREATED,
    );

    const setCookieHeader = response.headers['set-cookie'];
    if (!setCookieHeader) {
      return {};
    }

    const cookies: { [key: string]: string } = {};
    if (Array.isArray(setCookieHeader)) {
      setCookieHeader.forEach((cookie: string) => {
        const [nameValue] = cookie.split(';');
        const [name, ...valueParts] = nameValue.split('=');
        if (name && valueParts.length > 0) {
          cookies[name] = decodeURIComponent(valueParts.join('='));
        }
      });
    }

    return cookies;
  }

  /**
   * Helper to attach cookies to the SuperTest request.
   */
  private attachCookies(
    req: TestResponse,
    cookies?: { [key: string]: string },
  ) {
    if (cookies) {
      const cookieString = Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
      req.set('Cookie', cookieString);
    }
  }

  public get(
    url: string,
    jwtToken?: string,
    cookies?: { [key: string]: string },
  ): TestResponse {
    const ret = request(this.app.getHttpServer()).get(
      '/api' + this.formatUrl(url),
    );
    if (jwtToken) {
      ret.set('Authorization', 'Bearer ' + jwtToken);
    }
    this.attachCookies(ret, cookies);
    return ret;
  }

  public post(
    url: string,
    body: object = {},
    cookies?: { [key: string]: string },
    attachments: { name: string; buffer: Buffer; path: string }[] = [],
  ): TestResponse {
    const ret = request(this.app.getHttpServer()).post(
      '/api' + this.formatUrl(url),
    );

    if (body) {
      if (attachments.length > 0) {
        Object.entries(body).forEach(([key, value]) => ret.field(key, value));
      } else {
        ret.send(body);
      }
    }

    if (attachments.length > 0) {
      for (const attachment of attachments) {
        ret.attach(attachment.name, attachment.buffer, attachment.path);
      }
    }
    this.attachCookies(ret, cookies);
    return ret;
  }

  public put(
    url: string,
    data?: object,
    cookies?: { [key: string]: string },
  ): TestResponse {
    const ret = request(this.app.getHttpServer()).put(
      '/api' + this.formatUrl(url),
    );

    if (data) {
      ret.send(data);
    }

    this.attachCookies(ret, cookies);
    return ret;
  }

  public patch(
    url: string,
    data?: object,
    cookies?: { [key: string]: string },
  ): TestResponse {
    const ret = request(this.app.getHttpServer()).patch(
      '/api' + this.formatUrl(url),
    );

    if (data) {
      ret.send(data);
    }

    this.attachCookies(ret, cookies);
    return ret;
  }

  public delete(
    url: string,
    cookies?: { [key: string]: string },
  ): TestResponse {
    const ret = request(this.app.getHttpServer()).delete(this.formatUrl(url));

    this.attachCookies(ret, cookies);
    return ret;
  }

  private formatUrl(url: string): string {
    if (url.startsWith('/')) {
      return url;
    }
    if (url.length > 0) {
      return `${this.url}/${url}`;
    }
    return this.url;
  }
}
