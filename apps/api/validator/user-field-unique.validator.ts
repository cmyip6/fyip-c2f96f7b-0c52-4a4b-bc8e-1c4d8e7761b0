import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { UserService } from '../modules/user/user.service';

export function IsUserFieldUnique(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: UniqueUserFieldConstraint,
    });
  };
}

@Injectable()
@ValidatorConstraint({ name: 'UniqueUserFieldValidator', async: true })
export class UniqueUserFieldConstraint implements ValidatorConstraintInterface {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    if (value == null) return true;

    const field = args.property;

    return !(await this.userService.existsByField(field, value as string));
  }

  defaultMessage(args: ValidationArguments): string {
    const [field] = args.constraints as [string];
    return `${field} already exists`;
  }
}
