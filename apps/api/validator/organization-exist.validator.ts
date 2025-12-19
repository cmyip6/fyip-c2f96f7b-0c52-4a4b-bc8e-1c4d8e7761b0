import { forwardRef, Global, Inject, Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { OrganizationService } from '../modules/organization/organization.service';

export function IsValidOrganization(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: OrganizationExist,
    });
  };
}

@Injectable()
@ValidatorConstraint({ name: 'OrganizationExistValidator', async: true })
export class OrganizationExist implements ValidatorConstraintInterface {
  constructor(
    @Inject(forwardRef(() => OrganizationService))
    private readonly orgService: OrganizationService,
  ) {}

  async validate(
    value: number,
    _validationArguments?: ValidationArguments,
  ): Promise<boolean> {
    return await this.orgService.existsById(value);
  }

  defaultMessage?(validationArguments?: ValidationArguments): string {
    return `${validationArguments.property} does not exist in database`;
  }
}
