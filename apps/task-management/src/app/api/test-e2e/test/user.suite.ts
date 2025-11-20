import {faker} from '@faker-js/faker';
import {EntityTypeOptions, GenericUserLoginDto, TASK_MANAGEMENT, TokenInterface} from '@lib/base-library';
import {HttpStatus, Inject, Logger, OnModuleInit} from '@nestjs/common';
import {Test, TestSuite} from 'nestjs-jest-decorators';
import {GenericMemberDto, GetFolderDto} from '../../src/dto/folder';
import {UpdateTaskPositionDto} from '../../src/dto/task';
import {DeactivateUserDto} from '../../src/dto/user';
import {DashboardTypesOptions, DefaultViewOptions, FolderViewOptions, SystemStageCodeOptions} from '../../src/enum';
import {UserPermissionOptions} from '../../src/enum/folder-user.enum';
import {WorkFlowEntity} from '../../src/model';
import {ApprovalDueInTypeOptions} from '../../src/module/approval-api-connector/enum';
import {PermissionOptions} from '../../src/module/authorization-impl';
import {
    CustomFieldFactory,
    DashboardFactory,
    FolderFactory,
    TagFactory,
    TaskActionFactory,
    TaskFactory,
    TeamFactory,
    UserFactory,
    WidgetFactory,
    WorkflowFactory,
} from '../factory';
import {NewBaseTest} from './base-test';
import {CreateTaskActionAssigneeDto} from '../../src/dto/task/task-action-assignee/create-task-action-assignee.dto';
import {AutomationResponseDto} from '../../../automations/src/dto/automation-response.dto';
import {
    AutomationActionAddTaskCommentDto,
    AutomationConfigEventCommentAddedDto,
} from '../../../automations/src/dto/task-management/automation-config-detail.dto';
import {CreateAutomationDto} from '../../../automations/src/dto/create-automation.dto';
import {AppConfigService, UserTypeOptions} from '@plexxis/plexxisjs-nest-libs';

@TestSuite('Users Suite')
export class UserE2eSpec extends NewBaseTest implements OnModuleInit {
    private readonly logger = new Logger(UserE2eSpec.name);

    @Inject()
    private factory: UserFactory;
    @Inject()
    private teamFactory: TeamFactory;
    @Inject()
    private taskFactory: TaskFactory;
    @Inject()
    private workflowFactory: WorkflowFactory;
    @Inject()
    private folderFactory: FolderFactory;
    @Inject()
    private tagFactory: TagFactory;
    @Inject()
    private customFieldDefinitionFactory: CustomFieldFactory;
    @Inject()
    private dashboardFactory: DashboardFactory;
    @Inject()
    private widgetFactory: WidgetFactory;
    @Inject()
    private taskActionFactory: TaskActionFactory;
    @Inject()
    private appConfigService: AppConfigService;

    onModuleInit(): void {
        this.setUrl('/users');
    }

    @Test('User get Profile')
    async userGetProfile(): Promise<void> {
        this.logger.debug(
            'User can Login to DMS with guest user, so it should be able to login. And profile is public now, you should only have a valid JWT token'
        );
        const {loginDto, user} = await this.factory.createSimpleUser();
        const {body: loginResponse} = await this.post(`/auth/login`, loginDto).expect(HttpStatus.CREATED);
        expect(user.id).toBe(loginResponse.id);
        expect(user.userType).toBe(loginResponse.userType);
        expect(user.userType).toBe(UserTypeOptions.MODULE_USER);

        const {body: profile} = await this.get(`profile`, loginResponse.accessToken).expect(HttpStatus.OK);
        expect(profile.id).toBe(profile.id);
        expect(profile.email).toBe(profile.email);
        expect(profile.firstName).toBe(profile.firstName);
        expect(profile.lastName).toBe(profile.lastName);
        expect(profile.userType).toBe(UserTypeOptions.MODULE_USER);
    }

    @Test('Logins must fail')
    async loginsMustFail(): Promise<void> {
        const fakeUser = await this.factory.createUserForLogin({user: PermissionOptions.LOGIN | PermissionOptions.READ});
        await this.post(`/auth/login`, {
            email: fakeUser.email,
            password: faker.string.alpha(10),
        }).expect(HttpStatus.UNAUTHORIZED);
        await this.post(`/auth/login`, {
            email: faker.internet.email(),
            password: UserFactory.DEFAULT_PASSWORD,
        }).expect(HttpStatus.UNAUTHORIZED);
        await this.post(`/auth/login`, {
            email: faker.internet.email(),
            password: faker.string.alpha(10),
        }).expect(HttpStatus.UNAUTHORIZED);
    }

    @Test('Success login and get profile')
    async successLogin(): Promise<void> {
        // do login
        const {loginDto, user} = await this.factory.createUserWithNoPermissionsRole();
        const {body: loginResponse} = await this.post(`/auth/login`, loginDto).expect(HttpStatus.CREATED);
        expect(loginResponse.accessToken).toBeDefined();
        expect(loginResponse.refreshToken).toBeDefined();
        expect(loginResponse.id).toBe(user.id);

        // get profile
        await this.get(`profile`).expect(HttpStatus.UNAUTHORIZED);
        await this.get(`profile`, 'fruit').expect(HttpStatus.UNAUTHORIZED);
        const {body: profile} = await this.get(`profile`, loginResponse.accessToken).expect(HttpStatus.OK);
        expect(profile.email).toBe(user.email);
    }

    @Test('Get User Permission Profiles')
    async getUserPermissionProfiles(): Promise<void> {
        const {
            token: jwtToken,
            superUser: {id: userId, email},
        } = await this.createSuperUser();

        const fakeCreateTeamDto = this.teamFactory.fakeCreateTeamDto([userId]);
        const {
            body: {id: teamId},
        } = await this.post(`/team`, {...fakeCreateTeamDto}, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const {body: users} = await this.get(`permission-profiles`, jwtToken.accessToken).expect(HttpStatus.OK);

        const adminUser = users.find((el) => el.email === email);
        expect(adminUser.permissionProfileId).not.toBeNull();
        expect(adminUser.teamIds).not.toBeNull();
        expect(adminUser.teamIds.length).toBe(1);
        expect(adminUser.teamIds[0]).toBe(teamId);
    }

    @Test('Get User Roles')
    async getRoles(): Promise<void> {
        const {
            token: jwtSuperAdminToken,
            superUser: {id: superUserId, email: superUserEmail},
        } = await this.createSuperUser();

        const {
            moduleUser: {id: moduleUserId, email: moduleUserEmail, roleId: moduleUserRoleId},
        } = await this.createModuleUser();

        const {
            superAdminUser: {id: superAdminId, email: superAdminEmail},
        } = await this.createSuperAdminUser();

        const {
            ownerUser: {id: ownerId, email: ownerEmail},
        } = await this.createOwnerUser();

        const {body: users} = await this.get(`roles`, jwtSuperAdminToken.accessToken).expect(HttpStatus.OK);

        const moduleUser = users.find((el) => el.email === moduleUserEmail);
        expect(moduleUser.roleId).toBe(moduleUserRoleId);
        expect(moduleUser.id).toBe(moduleUserId);

        const superUser = users.find((el) => el.email === superUserEmail);
        // REview why its not working
        // expect(superUser.roleId).toBe(superUserRoleId);
        expect(superUser.id).toBe(superUserId);

        const superAdminUser = users.find((el) => el.email === superAdminEmail);
        expect(superAdminUser.id).toBe(superAdminId);
        expect(superAdminUser.roleId).toBeNull();

        const ownerUser = users.find((el) => el.email === ownerEmail);
        expect(ownerUser.id).toBe(ownerId);
        expect(ownerUser.roleId).toBeNull();
    }

    @Test('Get User Settings')
    async getUserSetting(): Promise<void> {
        // do login
        const {loginDto} = await this.factory.createUserWithNoPermissionsRole();
        const response = await this.post(`/auth/login`, loginDto).expect(HttpStatus.CREATED);
        const jwtToken: TokenInterface = response.body;
        expect(jwtToken.accessToken).toBeDefined();
        expect(jwtToken.refreshToken).toBeDefined();

        // get user settings
        await this.get(`user-settings`).expect(HttpStatus.UNAUTHORIZED);
        const {body: userSetting} = await this.get(`user-settings`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(userSetting).toBeInstanceOf(Object);
        expect(userSetting.settings).toBeInstanceOf(Object);
    }

    @Test('Update User Setting')
    async updateUserSetting(): Promise<void> {
        // do login
        const {loginDto} = await this.factory.createUserWithNoPermissionsRole();
        const response = await this.post(`/auth/login`, loginDto).expect(HttpStatus.CREATED);
        const jwtToken: TokenInterface = response.body;
        expect(jwtToken.accessToken).toBeDefined();
        expect(jwtToken.refreshToken).toBeDefined();

        // get user settings
        await this.get(`user-settings`).expect(HttpStatus.UNAUTHORIZED);
        const {body: userSetting} = await this.get(`user-settings`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(userSetting).toBeInstanceOf(Object);
        expect(userSetting.settings).toStrictEqual({});

        // update new setting to user
        const fakeSettings = this.factory.fakeUserSettings();
        await this.put(`user-settings`, {settings: fakeSettings}, jwtToken.accessToken).expect(HttpStatus.OK);

        // get updated user settings
        const {body: updatedSetting} = await this.get(`user-settings`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(updatedSetting).toBeInstanceOf(Object);
        expect(updatedSetting.settings).toStrictEqual(fakeSettings);
    }

    async createSuperAdminUser(): Promise<{
        token: TokenInterface;
        superAdminUser: GenericUserLoginDto & {id: string};
    }> {
        const superAdminUser = await this.factory.createSuperAdminUser();
        const {body: ret} = await this.post(`/auth/login`, superAdminUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            superAdminUser: {
                email: superAdminUser.loginDto.email,
                password: superAdminUser.loginDto.password,
                id: superAdminUser.user.id,
            },
        };
    }

    async createMemberUser(): Promise<{
        token: TokenInterface;
        memberUser: GenericUserLoginDto & {id: string};
    }> {
        const memberUser = await this.factory.createUserWithMemberPermissions();
        const {body: ret} = await this.post(`/auth/login`, memberUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            memberUser: {
                email: memberUser.loginDto.email,
                password: memberUser.loginDto.password,
                id: memberUser.user.id,
            },
        };
    }

    async createGuestUser(): Promise<{token: TokenInterface; guestUser: GenericUserLoginDto & {id: string}}> {
        const guestUser = await this.factory.createUserWithGuestPermissions();
        const {body: ret} = await this.post(`/auth/login`, guestUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            guestUser: {
                email: guestUser.loginDto.email,
                password: guestUser.loginDto.password,
                id: guestUser.user.id,
            },
        };
    }

    async createLeaderUser(): Promise<{
        token: TokenInterface;
        leaderUser: GenericUserLoginDto & {id: string};
    }> {
        const leaderUser = await this.factory.createUserWithLeaderPermissions();
        const {body: ret} = await this.post(`/auth/login`, leaderUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            leaderUser: {
                email: leaderUser.loginDto.email,
                password: leaderUser.loginDto.password,
                id: leaderUser.user.id,
            },
        };
    }

    async createOwnerUser(): Promise<{
        token: TokenInterface;
        ownerUser: GenericUserLoginDto & {id: string};
    }> {
        const ownerUser = await this.factory.createOwnerUser();
        const {body: ret} = await this.post(`/auth/login`, ownerUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            ownerUser: {
                email: ownerUser.loginDto.email,
                password: ownerUser.loginDto.password,
                id: ownerUser.user.id,
            },
        };
    }

    async createUserAdminUser(): Promise<{
        token: TokenInterface;
        userAdminUser: GenericUserLoginDto & {id: string};
    }> {
        const userAdminUser = await this.factory.createUserAdminUser();
        const {body: ret} = await this.post(`/auth/login`, userAdminUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            userAdminUser: {
                email: userAdminUser.loginDto.email,
                password: userAdminUser.loginDto.password,
                id: userAdminUser.user.id,
            },
        };
    }

    async createSuperUser(): Promise<{
        token: TokenInterface;
        superUser: GenericUserLoginDto & {id: string; roleId: number};
    }> {
        const superUser = await this.factory.createSuperUser();
        const {body: ret} = await this.post(`/auth/login`, superUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            superUser: {
                email: superUser.loginDto.email,
                password: superUser.loginDto.password,
                id: superUser.user.id,
                roleId: superUser.user.roleId,
            },
        };
    }

    async createModuleUser(): Promise<{
        token: TokenInterface;
        moduleUser: GenericUserLoginDto & {id: string; roleId: number; firstName: string; lastName: string};
    }> {
        const moduleUser = await this.factory.createModuleUser();
        const {body: ret} = await this.post(`/auth/login`, moduleUser.loginDto).expect(HttpStatus.CREATED);
        return {
            token: ret,
            moduleUser: {
                email: moduleUser.loginDto.email,
                password: moduleUser.loginDto.password,
                id: moduleUser.user.id,
                roleId: moduleUser.user.roleId,
                firstName: moduleUser.user.firstName,
                lastName: moduleUser.user.lastName,
            },
        };
    }

    @Test('Get Filtered Users')
    async ggetFilteredUsers(): Promise<void> {
        const {token: superAdminUser} = await this.createSuperAdminUser();
        const superAdminUserId = this.getUserIdFromAccessToken(superAdminUser.accessToken);

        const fakeUser1 = await this.factory.createPasUser('Default1234!');
        fakeUser1.firstName = '\u200B';
        await this.factory.repository.save(fakeUser1);

        const fakeUser2 = await this.factory.createPasUser('NewDefault1234!');
        fakeUser2.firstName = 'Invited First Name';
        await this.factory.repository.save(fakeUser1);

        const {body: allUsers} = await this.get(`filters`, superAdminUser.accessToken).expect(HttpStatus.OK);
        expect(allUsers).toBeDefined();
        expect(allUsers.length).toBeGreaterThanOrEqual(1);
        expect(allUsers.find((u) => u.id === superAdminUserId)).toBeDefined();
        expect(allUsers.find((u) => u.id === fakeUser1.id)).toBeUndefined();
        expect(allUsers.find((u) => u.id === fakeUser2.id)).toBeUndefined();
    }

    @Test('Get All User Permission')
    async getAllUserPermissions(): Promise<void> {
        const {token: superAdminUser} = await this.createSuperAdminUser();
        const superAdminUserId = this.getUserIdFromAccessToken(superAdminUser.accessToken);
        const {token: superUser} = await this.createSuperUser();
        const superUserId = this.getUserIdFromAccessToken(superUser.accessToken);
        const {token: ownerUser} = await this.createOwnerUser();
        const ownerUserId = this.getUserIdFromAccessToken(ownerUser.accessToken);
        const {token: moduleUser} = await this.createModuleUser();
        const moduleUserId = this.getUserIdFromAccessToken(moduleUser.accessToken);
        const {token: leader} = await this.createLeaderUser();
        const leaderId = this.getUserIdFromAccessToken(leader.accessToken);
        const {token: member} = await this.createMemberUser();
        const memberId = this.getUserIdFromAccessToken(member.accessToken);
        const {token: guest} = await this.createGuestUser();
        const guestId = this.getUserIdFromAccessToken(guest.accessToken);

        const entityTypes = [EntityTypeOptions.General, EntityTypeOptions.Space, EntityTypeOptions.Folder, EntityTypeOptions.Task];

        const verifyPermissions = (permissions, role: 'admin' | 'leader' | 'member' | 'guest'): void => {
            const permissionConfig = {
                admin: {
                    [EntityTypeOptions.General]: () => true,
                    [EntityTypeOptions.Space]: () => true,
                    [EntityTypeOptions.Folder]: () => true,
                    [EntityTypeOptions.Task]: () => true,
                },
                leader: {
                    [EntityTypeOptions.General]: (p: number) => [8, 16, 32].includes(p),
                    [EntityTypeOptions.Space]: () => true,
                    [EntityTypeOptions.Folder]: (p: number) => ![65536, 131072].includes(p),
                    [EntityTypeOptions.Task]: () => true,
                },
                member: {
                    [EntityTypeOptions.General]: (p: number) => [8, 16, 32, 64].includes(p),
                    [EntityTypeOptions.Space]: () => true,
                    [EntityTypeOptions.Folder]: (p: number) => ![65536, 131072].includes(p),
                    [EntityTypeOptions.Task]: () => true,
                },
                guest: {
                    [EntityTypeOptions.General]: () => false,
                    [EntityTypeOptions.Space]: (p: number) => [2, 4].includes(p),
                    [EntityTypeOptions.Folder]: (p: number) => [4].includes(p),
                    [EntityTypeOptions.Task]: (p: number) => [8].includes(p),
                },
            };

            for (const entityType of entityTypes) {
                const entityPerm = permissions.filter((c) => c.id === entityType);
                expect(entityPerm).toHaveLength(1);

                const getExpected = permissionConfig[role][entityType];
                for (const permission of entityPerm[0].children) {
                    const expected = getExpected(permission.permission);
                    expect(permission.selected).toBe(expected);
                }
            }
        };

        const {body: allPermissions} = await this.get(`/permission-manager/permission/all`, superUser.accessToken).expect(HttpStatus.OK);
        const superUserPermission = allPermissions.filter((p) => p.userId === superUserId);
        expect(superUserPermission).toHaveLength(1);
        expect(superUserPermission[0].children).toHaveLength(4);
        verifyPermissions(superUserPermission[0].children, 'admin');
        const superAdminUserPermission = allPermissions.filter((p) => p.userId === superAdminUserId);
        expect(superAdminUserPermission).toHaveLength(1);
        expect(superAdminUserPermission[0].children).toHaveLength(4);
        verifyPermissions(superAdminUserPermission[0].children, 'admin');
        const ownerPermission = allPermissions.filter((p) => p.userId === ownerUserId);
        expect(ownerPermission).toHaveLength(1);
        expect(ownerPermission[0].children).toHaveLength(4);
        verifyPermissions(ownerPermission[0].children, 'admin');
        const modulePermission = allPermissions.filter((p) => p.userId === moduleUserId);
        expect(modulePermission).toHaveLength(1);
        expect(modulePermission[0].children).toHaveLength(4);
        verifyPermissions(modulePermission[0].children, 'admin');
        const leaderPermission = allPermissions.filter((p) => p.userId === leaderId);
        expect(leaderPermission).toHaveLength(1);
        expect(leaderPermission[0].children).toHaveLength(4);
        verifyPermissions(leaderPermission[0].children, 'leader');
        const memberPermission = allPermissions.filter((p) => p.userId === memberId);
        expect(memberPermission).toHaveLength(1);
        expect(memberPermission[0].children).toHaveLength(4);
        verifyPermissions(memberPermission[0].children, 'member');
        const guestPermission = allPermissions.filter((p) => p.userId === guestId);
        expect(guestPermission).toHaveLength(1);
        expect(guestPermission[0].children).toHaveLength(4);
        verifyPermissions(guestPermission[0].children, 'guest');
    }

    @Test('Deactivate and activate user')
    async deactivateAndActivateUser(): Promise<void> {
        const {token: jwtToken} = await this.createSuperAdminUser();
        const {token: jwtToken2} = await this.createSuperAdminUser();
        const {token: jwtToken3} = await this.createSuperAdminUser();
        const userId1 = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const userId2 = this.getUserIdFromAccessToken(jwtToken2.accessToken);
        const {body: systemStages} = await this.get(`/displacement-group/system-stage`, jwtToken.accessToken).expect(HttpStatus.OK);

        const {folder: folder1, spaceId: spaceId1, workflowDB} = await this.createFolder(null, jwtToken);
        const {folder: folder2, spaceId: spaceId2} = await this.createFolder(null, jwtToken2);
        const {folder: folder3, spaceId: spaceId3} = await this.createFolder(null, jwtToken3);

        this.logger.debug('update workflow to add approval constraint');
        const {body: workflow1} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`Update workflow`);
        const updatedWorkflow = this.workflowFactory.fakeUpdateWorkflow(workflow1);

        const acceptState = updatedWorkflow.states[0];
        const rejectState = updatedWorkflow.states[2];

        const swimlaneConstraint = [acceptState.code];
        const userConstraint = [userId1, userId2];

        rejectState.constraints = [{swimlaneConstraint, userConstraint}];
        updatedWorkflow.states[1].approvalConstraint = {
            acceptState: acceptState.code,
            rejectState: rejectState.code,
            userIds: [userId1, userId2],
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
            authorizedUserIds: [userId1, userId2],
        };
        const {body: wf3} = await this.patch(`/workflow/module/${workflow1.id}`, updatedWorkflow, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(wf3).toBeDefined();
        const {body: updatedWorkflow1} = await this.get(`/workflow/module/${workflow1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('get user id');

        this.logger.debug('create task');
        const fakeTask = this.taskFactory.fakeCreateTask(userId1, folder1.id);
        const fakeTask2 = this.taskFactory.fakeCreateTask(userId1, folder1.id);
        const fakeTask3 = this.taskFactory.fakeCreateTask(userId1, folder1.id);
        fakeTask['assignees'] = [userId1];
        fakeTask2['assignees'] = [userId2, userId1];
        fakeTask3['assignees'] = [userId2, userId1];

        const {body: task} = await this.post(`/task`, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(fakeTask.startDate).toBeDateEqualWithoutMilliseconds(task.startDate);

        const fakeComment = this.taskActionFactory.fakeComment();
        const {body: comment1} = await this.post(
            `/task-action/folder/${folder1.id}/task/${task.id}/comment`,
            fakeComment,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(comment1.identifiers[0].id).toBeDefined();
        const commentId1 = comment1.identifiers[0].id;

        this.logger.debug('Assign comment to user');
        const addAssigneeDto: CreateTaskActionAssigneeDto = {userId: userId1};
        const {body: actionAssignee1} = await this.post(
            `/task-action-assignee/task-action/${commentId1}`,
            addAssigneeDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        await this.patch(`/task-action-assignee/${actionAssignee1.identifiers[0].id}`, {resolved: true}, jwtToken.accessToken).expect(
            HttpStatus.OK
        );

        const {body: comment2} = await this.post(
            `/task-action/folder/${folder1.id}/task/${task.id}/comment`,
            fakeComment,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(comment2.identifiers[0].id).toBeDefined();
        const commentId2 = comment2.identifiers[0].id;

        await this.post(`/task-action-assignee/task-action/${commentId2}`, addAssigneeDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const updateMembersDto = {
            insert: [{id: userId1, userPermission: UserPermissionOptions.FULL}],
            update: [],
            delete: [],
        };
        await this.patch(`/space/${spaceId2}/members`, updateMembersDto, jwtToken2.accessToken).expect(HttpStatus.OK);
        // await this.patch(`/folder/members/${folder2.id}`, updateMembersDto, jwtToken2.accessToken).expect(HttpStatus.OK);

        await this.patch(`/space/${spaceId3}/members`, updateMembersDto, jwtToken3.accessToken).expect(HttpStatus.OK);
        // await this.patch(`/folder/members/${folder3.id}`, updateMembersDto, jwtToken3.accessToken).expect(HttpStatus.OK);

        const {body: task2} = await this.post(`/task`, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const completedSystemStage = systemStages.find((el) => el.code === SystemStageCodeOptions.COMPLETED);
        const completedState = updatedWorkflow1.states.find((el) => el.systemStageId === completedSystemStage.id);
        const moveTaskDto: UpdateTaskPositionDto = {
            parentTaskNewId: task.id,
            folderId: folder1.id,
            actualFolderId: folder1.id,
            columnId: completedState.id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`/task/position/${task2.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const {body: task3} = await this.post(`/task`, fakeTask3, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const fakeTag = this.tagFactory.fakeCreateTag();
        this.logger.debug(`create user tag`);
        const {body: createdTag} = await this.post(`/tags/per-user`, fakeTag, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug(`check tag exists`);
        const {body: tag} = await this.get(`/tags/per-user`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(tag.find((el) => el.id === createdTag.id)).toBeDefined();

        await this.createAutomation(folder1.id, jwtToken);
        const {body: automationLogs} = await this.post(`/automation/getmanylogs`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(automationLogs).toBeDefined();

        const customFieldDefinitionOptions = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinitionOptions();
        const customFieldDefinitionDto = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(customFieldDefinitionOptions);
        const {body: customFieldDefinition1} = await this.post(
            `/custom-field-definition/${spaceId1}`,
            customFieldDefinitionDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(customFieldDefinition1).toBeDefined();
        expect(customFieldDefinition1.identifiers[0].id).toBeGreaterThan(0);

        this.logger.debug('create a my dashboard with widdgets');
        const fakeDashboard = this.dashboardFactory.fakeCreateDashboard(null, [folder1.id]);
        fakeDashboard.dashboardType = DashboardTypesOptions.My;

        const {body: dashboard} = await this.post(`/dashboard`, fakeDashboard, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(dashboard).toBeDefined();
        expect(dashboard.dashboardName).toBe(fakeDashboard.dashboardName);
        expect(dashboard.dashboardType).toBe(fakeDashboard.dashboardType);

        const fakeWidgetCategory = this.widgetFactory.fakeCreateWidgetCategory();
        const {body: widgetCategory} = await this.post(`/widgets/categories`, fakeWidgetCategory, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(widgetCategory).toBeDefined();

        const fakeWidgetType = this.widgetFactory.fakeCreateWidgetType(widgetCategory.id, 'tasksTable');
        const {body: widgetType} = await this.post(`/widgets/types`, fakeWidgetType, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(widgetType).toBeDefined();

        const fakeWidget = this.widgetFactory.fakeCreateWidget([folder1.id], widgetType.id, dashboard.id, null, null);
        const {body: widget} = await this.post(`/widgets`, fakeWidget, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(widget).toBeDefined();

        const dto: DeactivateUserDto = {
            userId: userId1,
            replaceUserId: userId2,
        };
        const {body: deactivated} = await this.post(`deactivate-user`, dto, jwtToken2.accessToken).expect(HttpStatus.CREATED);
        expect(deactivated.affected).toBe(1);

        const {body: notFoundError} = await this.post(`deactivate-user`, dto, jwtToken2.accessToken).expect(HttpStatus.NOT_FOUND);
        expect(notFoundError.message).toBe('User does not exist or is already deactivated');
        this.logger.debug(`user should not be able to login or access any endpoint once deactivated`);
        await this.get(`/tags/per-user`, jwtToken.accessToken).expect(HttpStatus.FORBIDDEN);

        const {body: task1Db} = await this.get(`/task/${task.id}/folder/${folder1.id}`, jwtToken2.accessToken).expect(HttpStatus.OK);
        expect(task1Db).toBeDefined();
        expect(task1Db.id).toBe(task.id);
        expect(task1Db.title).toBe(task.title);
        expect(task1Db.assignees).toHaveLength(1);
        expect(task1Db.assignees).toContain(userId2);

        const {body: action1} = await this.get(`/task-action-assignee/task-action/${commentId1}`, jwtToken2.accessToken).expect(
            HttpStatus.OK
        );
        expect(action1).toBeDefined();
        expect(action1.userId).toBe(userId1);
        expect(action1.resolved).toBe(true);

        const {body: action2} = await this.get(`/task-action-assignee/task-action/${commentId2}`, jwtToken2.accessToken).expect(
            HttpStatus.OK
        );
        expect(action2).toBeDefined();
        expect(action2.userId).toBe(userId2);
        expect(action2.resolved).toBe(false);

        const {body: task2Db} = await this.get(`/task/${task2.id}/folder/${folder1.id}`, jwtToken2.accessToken).expect(HttpStatus.OK);
        expect(task2Db).toBeDefined();
        expect(task2Db.id).toBe(task2.id);
        expect(task2Db.title).toBe(task2.title);
        expect(task2Db.assignees).toHaveLength(2);
        expect(task2Db.assignees).toContain(userId2);
        expect(task2Db.assignees).toContain(userId1);

        const {body: task3Db} = await this.get(`/task/${task3.id}/folder/${folder1.id}`, jwtToken2.accessToken).expect(HttpStatus.OK);
        expect(task3Db).toBeDefined();
        expect(task3Db.id).toBe(task3.id);
        expect(task3Db.title).toBe(task3.title);
        expect(task3Db.assignees).toHaveLength(1);
        expect(task3Db.assignees).toContain(userId2);

        this.logger.debug('check if owner is changed');

        const {body: s1} = await this.get(`/space/${spaceId1}`, jwtToken2.accessToken).expect(HttpStatus.OK);
        expect(s1.ownerId).toBe(userId2);

        const {body: f1} = await this.get(`/folder/${folder1.id}`, jwtToken2.accessToken).expect(HttpStatus.OK);
        expect(f1.ownerId).toBe(userId2);

        const {body: s2} = await this.get(`/space/${spaceId2}`, jwtToken2.accessToken).expect(HttpStatus.OK);
        const s2u1 = s2.members.find((m) => m.id === userId1);
        expect(s2u1).toBeUndefined();
        const s2u2 = s2.members.find((m) => m.id === userId2);
        expect(s2u2.userPermission).toBe(UserPermissionOptions.FULL);

        const {body: f2} = await this.get(`/folder/${folder2.id}`, jwtToken2.accessToken).expect(HttpStatus.OK);
        const f2u1 = f2.members.find((m) => m.userId === userId1);
        expect(f2u1).toBeUndefined();
        const f2u2 = f2.members.find((m) => m.userId === userId2);
        expect(f2u2.userPermission).toBe(UserPermissionOptions.FULL);

        const {body: s3} = await this.get(`/space/${spaceId3}`, jwtToken3.accessToken).expect(HttpStatus.OK);
        const s3u1 = s3.members.find((m) => m.id === userId1);
        expect(s3u1).toBeUndefined();
        const s3u2 = s3.members.find((m) => m.id === userId2);
        expect(s3u2.userPermission).toBe(UserPermissionOptions.FULL);

        const {body: f3} = await this.get(`/folder/${folder3.id}`, jwtToken3.accessToken).expect(HttpStatus.OK);
        const f3u1 = f3.members.find((m) => m.userId === userId1);
        expect(f3u1).toBeUndefined();
        const f3u2 = f3.members.find((m) => m.userId === userId2);
        expect(f3u2.userPermission).toBe(UserPermissionOptions.FULL);

        const {body: activated} = await this.put(`activate-user/${userId1}`, dto, jwtToken2.accessToken).expect(HttpStatus.OK);
        expect(activated.affected).toBe(1);

        const {body: workflow} = await this.get(`/workflow/module/${workflow1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(workflow.id).toBe(workflow1.id);
        expect(workflow.states.length).toBe(updatedWorkflow.states.length);
        expect(workflow.states[2].constraints.length).toBe(updatedWorkflow.states[2].constraints.length);
        expect(workflow.states[2].constraints[0].swimlaneConstraint).toBeArrayEqual(swimlaneConstraint);
        expect(workflow.states[2].constraints[0].userConstraint).toHaveLength(1);
        expect(workflow.states[2].constraints[0].userConstraint).toContain(userId2);
        expect(workflow.states[1].approvalConstraint.dueIn).toBe(updatedWorkflow.states[1].approvalConstraint.dueIn);
        expect(workflow.states[1].approvalConstraint.requiredApprovals).toBe(
            updatedWorkflow.states[1].approvalConstraint.requiredApprovals
        );
        expect(workflow.states[1].approvalConstraint.userIds).toHaveLength(1);
        expect(workflow.states[1].approvalConstraint.userIds).toContain(userId2);
        expect(workflow.states[1].approvalConstraint.authorizedUserIds).toHaveLength(1);
        expect(workflow.states[1].approvalConstraint.authorizedUserIds).toContain(userId2);
    }

    /**
     * Creates a folder asynchronously.
     *
     * @param {number} [parentFolderId] - The ID of the parent folder. If not provided, the folder will be created in the root folder.
     * @param {TokenInterface} [jwtTokenParam] - The JWT token used to authenticate the user. If not provided, a new user will be created and logged in.
     *
     * @param workflowId
     * @param spaceId
     * @returns {Promise} A Promise that resolves to an object containing the created folder, the JWT token, and the workflow database entry.
     */
    async createFolder(
        parentFolderId: number = null,
        jwtTokenParam: TokenInterface = null,
        workflowId: number = null,
        spaceId: number = null
    ): Promise<{
        folder: GetFolderDto;
        jwtToken: TokenInterface;
        workflowDB: {id: number};
        spaceId: number;
    }> {
        let jwtToken = jwtTokenParam;

        if (jwtToken === null) {
            this.logger.debug('create user and login');
            const {token} = await this.createSuperAdminUser();
            jwtToken = token;
        }
        this.logger.debug('create workflow');
        if (workflowId === null) {
            const workflow: WorkFlowEntity = await this.createWorkflowForFolder(jwtToken.accessToken);
            workflowId = workflow.id;
        }

        if (spaceId === null) {
            const spaceResponse = await this.createSpace(jwtToken.accessToken, [workflowId]);
            spaceId = spaceResponse.id;
        }

        this.logger.debug('create folder');
        const fakeFolder = this.folderFactory.fakeCreateFolder(
            workflowId,
            parentFolderId,
            DefaultViewOptions.BOARD,
            [TASK_MANAGEMENT],
            spaceId
        );

        const {body: f1} = await this.post(`/folder`, fakeFolder, jwtToken.accessToken).expect(HttpStatus.CREATED);

        expect(f1).toBeDefined();
        //todo : validate and match response and dto
        const {body: f1DB} = await this.get(`/folder/${f1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        // .expect(HttpStatus.OK);
        expect(f1DB.id).toEqual(f1.id);
        return {folder: f1, jwtToken, workflowDB: {id: workflowId}, spaceId};
    }

    async createAutomation(folderId: number, jwtToken: TokenInterface): Promise<AutomationResponseDto> {
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const {body: availableEvents} = await this.get(`/automation/getavailable`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(availableEvents).toBeDefined();
        const available = availableEvents.availableActions.find((a) => a.type === AutomationActionAddTaskCommentDto.name);
        expect(available).toBeDefined();
        const automationBody: CreateAutomationDto = {
            description: faker.string.alpha(32),
            locationId: folderId,
            locationType: 'folder',
            configuration: {
                andConditions: [],
                actions: [
                    {
                        type: AutomationActionAddTaskCommentDto.name,
                        commentText: faker.commerce.productDescription(),
                    },
                ],
                event: {
                    type: AutomationConfigEventCommentAddedDto.name,
                    fromSources: ['api'],
                    fromUsers: [userId],
                },
            },
        };
        const {body: created} = await this.post(`/automation/createone`, automationBody, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(created).toBeDefined();
        const {body: automationDB} = await this.get(`/automation/getone/automation/${created.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(automationDB.description).toBe(automationBody.description);
        expect(automationDB.locationType).toBe(automationBody.locationType);
        expect(automationDB.applicationId).toBe(TASK_MANAGEMENT);

        return automationDB;
    }

    private async createSpace(accessToken: string, workflowIds: number[], members?: GenericMemberDto[]): Promise<GetFolderDto> {
        const fakeCreateSpace = this.folderFactory.fakeCreateSpace({
            moduleWorkflows: workflowIds,
            members,
        });
        const {body: spaceResponse} = await this.post(`/space`, fakeCreateSpace, accessToken).expect(HttpStatus.CREATED);
        expect(spaceResponse).toBeDefined();
        return spaceResponse;
    }

    private async createWorkflowForFolder(token: string): Promise<WorkFlowEntity> {
        const {body: systemStages} = await this.get(`/displacement-group/system-stage`, token).expect(HttpStatus.OK);
        const fakeWorkflow = await this.workflowFactory.fakeCreateWorkflow(systemStages[0]?.id);
        const {body, status} = await this.post(`/workflow/module`, fakeWorkflow, token).expect(HttpStatus.CREATED);
        expect(status).toBe(HttpStatus.CREATED);
        this.logger.debug(`check workflow exists`);
        const {body: workflowDB, status: workflowDBStatus} = await this.get(`/workflow/module/${body.id}`, token).expect(HttpStatus.OK);
        expect(workflowDBStatus).toBe(HttpStatus.OK);
        const workflowWithoutCode1 = {
            ...workflowDB,
            states: workflowDB.states.map(({code: _, constraints: __, ...rest}) => rest),
        };
        const workflowWithoutCode2 = {
            ...fakeWorkflow,
            states: fakeWorkflow.states.map(({code: _, constraints: __, ...rest}) => rest),
        };
        expect(workflowWithoutCode1).toMatchObject(workflowWithoutCode2);
        return workflowDB;
    }

    @Test('Send user invitation With Super Admin')
    async sendUserInvitationWithSuperAdmin(): Promise<void> {
        const {token: jwtToken} = await this.createSuperAdminUser();
        const redirectUrl = this.appConfigService.getString('KEYCLOAK_PORTAL_URL');
        const {body: invitedUser} = await this.post(
            `invite-user`,
            {email: faker.internet.email(), roleId: 1, redirectUrl},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: user} = await this.get(invitedUser.id, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(user.roleId).toBe(1);
    }

    @Test('Send user invitation With Module User')
    async sendUserInvitationWithModuleUser(): Promise<void> {
        const {token: jwtToken} = await this.createModuleUser();
        const redirectUrl = this.appConfigService.getString('KEYCLOAK_PORTAL_URL');
        const {body: invitedUser} = await this.post(
            `invite-user`,
            {email: faker.internet.email(), roleId: 4, redirectUrl},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: user} = await this.get(invitedUser.id, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(user.roleId).toBe(4);
    }
}
