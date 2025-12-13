import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from '../../dto/create-organization.dto';
import { faker } from '@faker-js/faker';
import { PropertyLength } from '@libs/data/const/length.const';

type CreateOrganizationDtoParams = {
  parentOrganizationId?: number;
  childOrganizationId?: number;
};

@Injectable()
export class OrganizationFactory {
  createFakeOrganizationDto(
    option?: CreateOrganizationDtoParams,
  ): CreateOrganizationDto {
    return {
      name: faker.company.name(),
      description: faker.lorem.sentence({
        min: 1,
        max: 10,
      }),
      parentOrganizationId: option?.parentOrganizationId,
      childOrganizationId: option?.childOrganizationId,
    };
  }
}
