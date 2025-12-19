import { forwardRef, Global, Inject, Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { RoleService } from '../modules/role/role.service';

export function IsValidRole(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: RoleExist,
    });
  };
}

@Injectable()
@ValidatorConstraint({ name: 'RoleExistValidator', async: true })
export class RoleExist implements ValidatorConstraintInterface {
  constructor(
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
  ) {}

  async validate(
    value: number,
    _validationArguments?: ValidationArguments,
  ): Promise<boolean> {
    return await this.roleService.checkRoleById(value);
  }

  defaultMessage?(validationArguments?: ValidationArguments): string {
    return `${validationArguments.property} does not exist in database`;
  }
}
