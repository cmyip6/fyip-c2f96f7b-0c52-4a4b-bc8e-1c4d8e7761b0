import {faker} from '@faker-js/faker';
import {ABSTRACT_AUTHORIZATION_SERVICE, EntityTypeOptions, GenericUserLoginDto, KeycloakClientService, makeid} from '@lib/base-library';
import {Inject, Injectable} from '@nestjs/common';
import {BaseFactory} from '@test-lib/test-base-library';
import {CreatePasUserDto} from '../../src/dto/user';
import {RoleEntity, TeamEntity, UserEntity} from '../../src/model';
import {AuthorizationImplService, PermissionOptions} from '../../src/module/authorization-impl';
import {PermissionProfileFactory} from './permission-profile.factory';
import {RestrictionProfileFactory} from './restriction-profile.factory';
import {RoleFactory} from './role.factory';
import {AppConfigService, UserTypeOptions} from '@plexxis/plexxisjs-nest-libs';
import {RoleNameOptions} from '../../src/module/notifications-subscription/enum';

export type PermissionsType = Partial<Record<EntityTypeOptions, PermissionOptions>>;

@Injectable()
export class UserFactory extends BaseFactory<UserEntity> {
    public static DEFAULT_PASSWORD = 'Default1234!';

    @Inject()
    private readonly permissionProfileFactory: PermissionProfileFactory;

    @Inject()
    private readonly restrictionProfileFactory: RestrictionProfileFactory;

    @Inject()
    private readonly roleFactory: RoleFactory;

    @Inject()
    readonly appConfigService: AppConfigService;

    @Inject()
    readonly keycloakClientService: KeycloakClientService;

    constructor(@Inject(ABSTRACT_AUTHORIZATION_SERVICE) protected readonly authorizationService: AuthorizationImplService) {
        super(UserEntity);
    }

    fakeUserId(): string {
        return faker.string.uuid();
    }

    fakeCreatePASUserDTO(): CreatePasUserDto {
        return {
            password: faker.string.alphanumeric({length: {min: 10, max: 20}}),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email(),
        };
    }

    fakeUserSettings(): {[string: string]: boolean} {
        return {
            [faker.string.fromCharacters('settings', {min: 5, max: 10})]: faker.datatype.boolean(),
        };
    }

    static fakeUserId(): string {
        return faker.string.uuid();
    }

    fakeTeam(): TeamEntity {
        const r = new TeamEntity();
        r.code = makeid(8);
        r.description = faker.string.uuid();
        return r;
    }

    async createTeam(team: TeamEntity): Promise<TeamEntity> {
        const repo = this.dataSource.getRepository<TeamEntity>(TeamEntity);
        return await repo.save(team);
    }

    async createUserForLogin(permissions: PermissionsType, password: string = UserFactory.DEFAULT_PASSWORD): Promise<GenericUserLoginDto> {
        const fakeUser = await this.createPasUser(password);
        // const fakeUser = this.fakeUser(password);
        const userDB = await this.repository.save(fakeUser);
        await this.authorizationService.grantToUser(
            PermissionOptions.LOGIN | PermissionOptions.READ,
            EntityTypeOptions.User,
            userDB.id,
            null
        );
        for (const key of Object.keys(permissions)) {
            await this.authorizationService.grantToUser(permissions[key], key as EntityTypeOptions, userDB.id, null);
        }
        return {
            email: userDB.email,
            password: password,
        };
    }

    async createUserWithRole(
        role: RoleEntity,
        userType: UserTypeOptions,
        password: string = UserFactory.DEFAULT_PASSWORD,
        banned = false
    ): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const fakeUser = await this.createPasUser(password, userType);
        let roleId: number = null;
        fakeUser.userType = userType;
        switch (userType) {
            case UserTypeOptions.SUPER_ADMIN:
            case UserTypeOptions.OWNER:
            case UserTypeOptions.USER_ADMIN:
                // do nothing
                break;
            case UserTypeOptions.MODULE_USER:
                roleId = role.id;
                break;
            case UserTypeOptions.SYSTEM_USER:
                const permissionProfile = await this.permissionProfileFactory.repository.save({
                    permissionProfileId: faker.string.uuid(),
                    permissionProfileName: faker.string.uuid(),
                    roleId: role.id,
                });

                let restrictionProfile = null;
                if (banned === true) {
                    restrictionProfile = await this.restrictionProfileFactory.repository.save({
                        restrictionProfileId: faker.string.uuid(),
                        restrictionProfileName: faker.string.uuid(),
                        isEnabled: true,
                    });
                }

                fakeUser.permissionProfileId = permissionProfile?.id;
                fakeUser.restrictionProfileId = restrictionProfile?.id;
                break;
        }
        const user = await this.repository.save({...fakeUser, roleId});

        return {
            user,
            loginDto: {email: user.email, password},
        };
    }

    async createSuperAdminUser(
        password: string = UserFactory.DEFAULT_PASSWORD
    ): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        return await this.createUserWithRole(null /*adminRole*/, UserTypeOptions.SUPER_ADMIN, password);
    }

    async createUserAdminUser(password: string = UserFactory.DEFAULT_PASSWORD): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        return await this.createUserWithRole(null /*adminRole*/, UserTypeOptions.USER_ADMIN, password);
    }

    async createOwnerUser(password: string = UserFactory.DEFAULT_PASSWORD): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        return await this.createUserWithRole(null /*adminRole*/, UserTypeOptions.OWNER, password);
    }

    async createSuperUser(password: string = UserFactory.DEFAULT_PASSWORD): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const adminRole = await this.roleFactory.repository.findOneOrFail({where: {name: 'Admin'}});
        return await this.createUserWithRole(adminRole, UserTypeOptions.SYSTEM_USER, password);
    }

    async createModuleUser(password: string = UserFactory.DEFAULT_PASSWORD): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const adminRole = await this.roleFactory.repository.findOneOrFail({where: {name: 'Admin'}});
        return await this.createUserWithRole(adminRole, UserTypeOptions.MODULE_USER, password);
    }

    async createUserWithMemberPermissions(
        password: string = UserFactory.DEFAULT_PASSWORD
    ): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const memberRole = await this.roleFactory.repository.findOneOrFail({where: {name: 'Member'}});
        return await this.createUserWithRole(memberRole, UserTypeOptions.MODULE_USER, password);
    }

    async createUserWithLeaderPermissions(
        password: string = UserFactory.DEFAULT_PASSWORD
    ): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const leaderRole = await this.roleFactory.repository.findOneOrFail({where: {name: 'Leader'}});
        return await this.createUserWithRole(leaderRole, UserTypeOptions.MODULE_USER, password);
    }

    async createUserWithGuestPermissions(
        password: string = UserFactory.DEFAULT_PASSWORD
    ): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const guestRole = await this.roleFactory.repository.findOneOrFail({where: {name: RoleNameOptions.GUEST}});
        return await this.createUserWithRole(guestRole, UserTypeOptions.MODULE_USER, password);
    }

    async createUserWithNoPermissionsRole(
        password: string = UserFactory.DEFAULT_PASSWORD,
        banned = false
    ): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const noPermissionsRole = await this.roleFactory.repository.save({name: faker.string.uuid()});
        return await this.createUserWithRole(noPermissionsRole, UserTypeOptions.SYSTEM_USER, password, banned);
    }

    async createSimpleUser(
        password: string = UserFactory.DEFAULT_PASSWORD,
        userType = UserTypeOptions.MODULE_USER
    ): Promise<{loginDto: GenericUserLoginDto; user: UserEntity}> {
        const user = await this.createUser(password, userType);
        return {user, loginDto: {email: user.email, password}};
    }

    public async createUser(password: string = UserFactory.DEFAULT_PASSWORD, userType = UserTypeOptions.MODULE_USER): Promise<UserEntity> {
        const user = await this.createPasUser(password, userType);
        return await this.repository.save(user);
    }

    async createPasUser(
        password: string,
        userType = UserTypeOptions.MODULE_USER
    ): Promise<{
        id: string;
        password: string;
        userType: UserTypeOptions;
        firstName: string;
        lastName: string;
        permissionProfileId?: number;
        restrictionProfileId?: number;
    }> {
        return await this.keycloakClientService.createUser(password, userType);
    }

    getPasServiceUserLoginDto(): GenericUserLoginDto {
        return {
            email: this.appConfigService.getString('KEYCLOAK_REALM_INTERNAL_USERNAME'),
            password: this.appConfigService.getString('KEYCLOAK_REALM_INTERNAL_PASSWORD'),
        };
    }
}
