// import { INestApplication, Logger } from '@nestjs/common';
// import * as request from 'supertest';
// import { Test as TestResponse } from 'supertest';
// import './expect-extender';

// export class BaseTest {
//   public app: INestApplication | null = null;
//   public url: string = '';

//   private readonly logger = new Logger(BaseTest.name);

//   public setApp(app: INestApplication): void {
//     this.app = app;
//   }

//   public setUrl(url: string): void {
//     this.url = url;
//   }

//   // public getDataSource(): EntityManager {
//   //     return this.entityManager;
//   // }

//   public get(
//     url: string,
//     jwtToken?: string,
//     cookies?: { [key: string]: string },
//   ): TestResponse {
//     const ret = request(this.app.getHttpServer()).get(this.formatUrl(url));
//     if (jwtToken) {
//       void ret.set('Authorization', 'Bearer ' + jwtToken);
//     }
//     if (cookies) {
//       const cookieString = Object.entries(cookies)
//         .map(([key, value]) => `${key}=${value}`)
//         .join('; ');
//       void ret.set('Cookie', cookieString);
//     }
//     return ret;
//   }

//   public post(
//     url: string,
//     body: object = {},
//     jwtToken: string | null = null,
//     attachments: { name: string; buffer: Buffer; path: string }[] = [],
//   ): TestResponse {
//     const ret = request(this.app.getHttpServer()).post(this.formatUrl(url));

//     if (body) {
//       if (attachments.length > 0) {
//         void Object.entries(body).forEach(([key, value]) =>
//           ret.field(key, value),
//         );
//       } else {
//         void ret.send(body);
//       }
//     }
//     if (jwtToken) {
//       void ret.set('Authorization', 'Bearer ' + jwtToken);
//     }
//     if (attachments.length > 0) {
//       for (const attachment of attachments) {
//         void ret.attach(attachment.name, attachment.buffer, attachment.path);
//       }
//     }
//     return ret;
//   }

//   public put(url: string, data?: object, jwtToken?: string): TestResponse {
//     const ret = request(this.app.getHttpServer()).put(this.formatUrl(url));

//     if (data) {
//       void ret.send(data);
//     }
//     if (jwtToken) {
//       void ret.set('Authorization', 'Bearer ' + jwtToken);
//     }
//     return ret;
//   }

//   public patch(url: string, data?: object, jwtToken?: string): TestResponse {
//     const ret = request(this.app.getHttpServer()).patch(this.formatUrl(url));

//     if (data) {
//       void ret.send(data);
//     }
//     if (jwtToken) {
//       void ret.set('Authorization', 'Bearer ' + jwtToken);
//     }
//     return ret;
//   }

//   public delete(url: string, jwtToken?: string): TestResponse {
//     const ret = request(this.app.getHttpServer()).delete(this.formatUrl(url));

//     if (jwtToken) {
//       void ret.set('Authorization', 'Bearer ' + jwtToken);
//     }
//     return ret;
//   }

//   protected getUserIdFromAccessToken(accessToken: string): string {
//     const [header, payload] = accessToken.split('.');
//     const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
//     const decodedHeader = Buffer.from(header, 'base64').toString('utf-8');
//     this.logger.verbose(decodedHeader);
//     this.logger.verbose(decodedPayload);
//     const sub = JSON.parse(decodedPayload).sub;
//     this.logger.verbose(sub);
//     return sub;
//   }

//   private formatUrl(url: string): string {
//     if (url.startsWith('/')) {
//       return url;
//     }
//     if (url.length > 0) {
//       return `${this.url}/${url}`;
//     }
//     return this.url;
//   }
// }
