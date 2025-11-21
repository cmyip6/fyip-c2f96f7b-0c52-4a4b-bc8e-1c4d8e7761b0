import {contructorLogger} from '@lib/base-library';
import {Module} from '@nestjs/common';
import {RoleController} from './role.controller';
import {RoleService} from './role.service';
import {AuthorizationImplModule} from '../authorization-impl';
import {NotificationModule} from '../notification/notification.module';

@Module({
    imports: [AuthorizationImplModule, NotificationModule],
    controllers: [RoleController],
    providers: [RoleService],
    exports: [RoleService],
})
export class RoleModule {
    constructor() {
        contructorLogger(this);
    }
}
