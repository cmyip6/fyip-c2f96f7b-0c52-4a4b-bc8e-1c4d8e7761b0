import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';

interface CustomResponse extends Response {
  message?: string;
  data?: { error: Error };
}

interface ExtendedException extends Partial<HttpException> {
  getStatus?: () => number;
  status?: number | string;
  response?: CustomResponse;
  rawResponse?: CustomResponse;
  label?: string;
  statusCode?: number | ((code: number) => CustomResponse);
  url?: string;
  method?: string;
  userId?: string | number;
  userEmail?: string;
}

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: ExtendedException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const statusCode =
      Number(exception.getStatus?.()) ||
      Number(exception.status) ||
      exception.response?.status ||
      exception.rawResponse?.status ||
      HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      exception.response?.message ??
      exception.response?.data?.error?.message ??
      exception.label ??
      exception.message ??
      'Internal server error';

    exception.statusCode = statusCode;
    exception.url = req.originalUrl;
    exception.method = req.method;
    exception.userId = req.user?.id;
    exception.userEmail = req.user?.email;

    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.warn({
      statusCode,
      message,
      path: req.url,
      method: req.method,
      user: req.user?.id ?? 'Anonymous',
      stack,
    });

    const responseBody = {
      statusCode,
      message: String(message),
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode as number).json(responseBody);
  }
}
