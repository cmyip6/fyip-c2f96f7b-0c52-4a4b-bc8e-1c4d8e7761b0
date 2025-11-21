import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger: Logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest();
    const response = host.switchToHttp().getResponse();
    const statusCode =
      (exception.getStatus && exception.getStatus()) ||
      exception.status ||
      (exception.response && exception.response.status) ||
      (exception.rawResponse && exception.rawResponse.status) ||
      HttpStatus.INTERNAL_SERVER_ERROR;

    let message = exception.message || '';
    if (exception?.response?.message) message = exception.response.message;
    if (exception?.response?.data?.error?.message)
      message = exception.response.data.error.message;
    if (exception.label) message = exception.label;
    const responseBody = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };
    exception.statusCode = statusCode;
    exception.url = request.originalUrl;
    exception.method = request.method;
    exception.userId = request.user?.id;
    exception.userEmail = request.user?.email;
    message = String(message);
    const stack = exception instanceof Error ? exception.stack : '';

    this.logger.warn({
      statusCode,
      message: String(message),
      path: request.url,
      method: request.method,
      user: request.user ? request.user.id : 'Anonymous',
      stack: stack,
    });

    response['status'](statusCode).json(responseBody);
  }
}
