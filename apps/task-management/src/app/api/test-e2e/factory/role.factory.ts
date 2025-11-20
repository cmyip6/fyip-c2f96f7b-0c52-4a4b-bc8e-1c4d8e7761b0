import {Injectable} from '@nestjs/common';
import {BaseFactory} from '@test-lib/test-base-library';
import {RoleEntity} from '../../src/model';

@Injectable()
export class RoleFactory extends BaseFactory<RoleEntity> {
    constructor() {
        super(RoleEntity);
    }
}
