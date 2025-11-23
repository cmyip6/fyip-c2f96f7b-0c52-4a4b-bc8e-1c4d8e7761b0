import {
  applyDecorators,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

interface OptionsInterface {
  isArray?: boolean;
  forbidUnknownValues?: boolean;
  nullable?: boolean;
}

@Injectable()
export class ValidateDtoInterceptor<T extends object>
  implements NestInterceptor
{
  constructor(
    private readonly classType: Type<T>,
    private readonly options?: OptionsInterface,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Promise<T>> {
    const {
      isArray = false,
      forbidUnknownValues = true,
      nullable = false,
    } = this.options || {};
    return next.handle().pipe(
      map(async (data) => {
        if (nullable === true && data == null) {
          return data;
        }
        if (nullable === false && data == null) {
          const url = context.switchToHttp().getRequest().originalUrl;
          throw new ConflictException(
            `Response data should NOT be null in URL ${url}`,
          );
        }
        const response = plainToClass(this.classType, data);
        const objectsToValidate = isArray ? (response as Array<T>) : [response];
        for (const objectToValidate of objectsToValidate) {
          const errors = await validate(objectToValidate, {
            forbidUnknownValues,
          });
          if (errors.length > 0) {
            throw new ConflictException(this.extractConstraints(errors));
          }
        }
        return response;
      }),
    );
  }

  private extractConstraints(
    validationErrors: ValidationError[],
  ): Array<string> {
    const constraints: string[] = [];

    function findConstraints(error: ValidationError): void {
      if (error.constraints) {
        constraints.push(...Object.values(error.constraints));
      }

      if (error.children && Array.isArray(error.children)) {
        error.children.forEach(findConstraints);
      }
    }

    validationErrors.forEach(findConstraints);
    return constraints;
  }
}

export function ValidateResponse(
  dto: Type,
  options?: OptionsInterface,
): MethodDecorator {
  return applyDecorators(
    UseInterceptors(new ValidateDtoInterceptor(dto, options)),
  );
}
