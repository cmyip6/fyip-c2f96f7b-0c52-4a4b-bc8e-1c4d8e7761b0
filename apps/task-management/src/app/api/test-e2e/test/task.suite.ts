import {faker} from '@faker-js/faker';
import {EntityTypeOptions, FINANCIAL_OUTLOOK, TASK_MANAGEMENT, TokenInterface} from '@lib/base-library';
import {HttpStatus, Inject, Logger, OnModuleInit} from '@nestjs/common';
import {Test, TestSuite} from 'nestjs-jest-decorators';
import {COOKIE_KEY} from '../../src/const/constants';

import {
    BoardResponseElementDto,
    FolderTaskFilterDto,
    FolderTreeDto,
    GenericMemberDto,
    GetFolderDto,
    ProjectWorkFlowResponseDto,
    TaskTreeDto,
    UpdateFolderDto,
} from '../../src/dto/folder';
import {
    CreateDependencyDto,
    CreateTaskActionDto,
    MoveManyTasksDto,
    MoveOneTaskDto,
    ReplicateTaskDto,
    TaskAssigneePositionDto,
    TaskAssigneesDto,
    TaskResponseDto,
    TaskSharedDto,
    UpdateManyTaskDto,
    UpdateTaskPositionDto,
} from '../../src/dto/task';
import {
    CustomFieldDefinitionTypeOptions,
    DefaultViewOptions,
    FolderTypeOptions,
    FolderViewOptions,
    FolderViewTypeOptions,
    RelationTypeOptions,
    SystemStageCodeOptions,
    TagTaskFolderTypeOptions,
    TaskActionOptions,
} from '../../src/enum';
import {
    ApprovalConstraintInstanceEntity,
    CustomFieldDefinitionEntity,
    CustomFieldValueEntity,
    CustomFieldValuePositionEntity,
    ImportanceEntity,
    TagEntity,
    TagTaskFolderEntity,
    TaskActionEntity,
    TaskAttachmentEntity,
    TaskEntity,
    TaskPositionEntity,
    TaskRelationEntity,
} from '../../src/model';
import {
    ApprovalFactory,
    CustomFieldFactory,
    FolderFactory,
    TagFactory,
    TaskActionFactory,
    TaskAttachmentFactory,
    TaskFactory,
    UserFactory,
    WorkflowFactory,
    WorkflowStateFactory,
} from '../factory';
import {NewBaseTest} from './base-test';
import {sleep} from '@nestjs/terminus/dist/utils';
import {UserE2eSpec} from './user.suite';
import {UserPermissionOptions} from '../../src/enum/folder-user.enum';
import * as moment from 'moment';
import {TaskTypeOptions} from '@lib/base-library';
import {In, QueryFailedError} from 'typeorm';
import {MoveOneTaskToSpaceDto} from '../../src/dto/task/move-one-task-to-space.dto';
import {CreateWorkFlowDto, CreateWorkFlowStateDto, UpdateWorkflowColumnDto, WorkFlowResponseDto} from '../../src/dto/workflow';
import {RestoreTaskDto} from '../../src/dto/task/restore-task.dto';
import {ApprovalDueInTypeOptions, ApprovalEntityTypesOptions, ApprovalStatusOptions} from '../../src/module/approval-api-connector/enum';
import {CreateTaskActionAssigneeDto} from '../../src/dto/task/task-action-assignee/create-task-action-assignee.dto';
import {MoveManyTasksToSpaceDto} from '../../src/dto/task/move-many-tasks-to-space.dto';
import {AppConfigService, enqueueEventAndGetPromise, getQueueName, UserTypeOptions} from '@plexxis/plexxisjs-nest-libs';
import {APPROVAL_RETURN_CREATE_INSTANCE_JOB, APPROVAL_RETURN_QUEUE} from '../../src/module/approval-queue-handler/constants';
import {Queue} from 'bullmq';
import {ApprovalApiConnectorService} from '../../src/module/approval-api-connector';
import {ApprovalQueueHandlerService} from '../../src/module/approval-queue-handler';
import {NotificationApiConnectorService} from '../../src/module/notifications-api-connector';
import {TaskEventNameOptions} from '../../src/module/notifications-subscription/enum';

@TestSuite('Task Suite')
export class TaskE2eSpec extends NewBaseTest implements OnModuleInit {
    private readonly logger = new Logger(TaskE2eSpec.name);

    @Inject()
    private factory: TaskFactory;
    @Inject()
    private userFactory: UserFactory;
    @Inject()
    private workflowFactory: WorkflowFactory;
    @Inject()
    private workflowStateFactory: WorkflowStateFactory;
    @Inject()
    private folderFactory: FolderFactory;
    @Inject()
    private tagFactory: TagFactory;
    @Inject()
    private taskAttachmentFactory: TaskAttachmentFactory;
    // @Inject()
    // private customFieldCollectionFactory: CustomFieldCollectionFactory;
    @Inject()
    private customFieldDefinitionFactory: CustomFieldFactory;
    @Inject()
    private approvalFactory: ApprovalFactory;
    @Inject()
    private taskActionFactory: TaskActionFactory;
    @Inject()
    private approvalsFactory: ApprovalFactory;
    @Inject()
    private userSuite: UserE2eSpec;
    @Inject()
    private readonly appConfigService: AppConfigService;
    @Inject()
    private approvalApiConnectorService: ApprovalApiConnectorService;
    @Inject()
    private notificationApiConnectorService: NotificationApiConnectorService;
    @Inject()
    private approvalQueueHandlerService: ApprovalQueueHandlerService;

    onModuleInit(): void {
        this.setUrl('/task');
    }

    /**
     * Checks inherited permissions
     *
     * @return {Promise<void>}
     */
    @Test('Check inherited permissions')
    async checkInheritedPermissions(): Promise<void> {
        this.logger.debug('generate user token');
        const {token: jwtToken} = await this.userSuite.createSuperAdminUser();

        const {token: fakeJwtToken1} = await this.userSuite.createSuperAdminUser();
        const fakeUser1Id = this.getUserIdFromAccessToken(fakeJwtToken1.accessToken);

        const {token: fakeJwtToken2} = await this.userSuite.createSuperAdminUser();
        const fakeUser2Id = this.getUserIdFromAccessToken(fakeJwtToken2.accessToken);

        this.logger.debug('create space');
        const workflow = await this.createWorkflowForFolder(jwtToken.accessToken);
        const spaceResponse = await this.createSpace(
            jwtToken.accessToken,
            [workflow.id],
            [
                {id: fakeUser1Id, userPermission: UserPermissionOptions.FULL},
                {id: fakeUser2Id, userPermission: UserPermissionOptions.FULL},
            ]
        );
        this.logger.debug('create user and folder');
        const {folder, spaceId} = await this.createFolder(null, jwtToken, workflow.id, spaceResponse.id);

        this.logger.debug('Create a sub folder of level 1');
        const {folder: subFolder} = await this.createFolder(folder.id, jwtToken, workflow.id, spaceResponse.id);
        this.logger.debug('Create a sub folder of level 2', subFolder);
        const {folder: subSubFolder} = await this.createFolder(subFolder.id, jwtToken, workflow.id, spaceResponse.id);
        this.logger.debug('Create a sub folder of level 3', subSubFolder);

        // await this.patch(
        //     `/folder/members/${folder.id}`,
        //     {insert: [{id: fakeUser1Id, userPermission: UserPermissionOptions.FULL}], delete: [], update: []},
        //     jwtToken.accessToken
        // ).expect(HttpStatus.OK);

        this.logger.debug('get folder tree');
        let folderTree = (await this.get(`/folder/folder-tree`, jwtToken.accessToken)).body as FolderTreeDto[];

        // get inherited permissions of folder (fakeUserId should be there)
        //folder
        let hasInheritedPermission: boolean = folderTree[0].children[0].members?.some(
            (member) => member.userId === fakeUser1Id && member.inherit
        );
        expect(hasInheritedPermission).toBe(true);

        // get inherited permissions of subfolder (fakeUserId should be there)
        hasInheritedPermission = folderTree[0].children[0].children[0].members?.some(
            (member) => member.userId === fakeUser1Id && member.inherit
        );
        expect(hasInheritedPermission).toBe(true);

        //last child
        hasInheritedPermission = folderTree[0].children[0].children[0].children[0].members?.some(
            (member) => member.userId === fakeUser1Id && member.inherit
        );
        expect(hasInheritedPermission).toBe(true);

        // make parent private (has the effect of clearing all inherited permissions from subfolders)
        await this.patch(`/folder/${folder.id}/space/${spaceId}`, {viewType: FolderViewTypeOptions.PRIVATE}, jwtToken.accessToken).expect(
            HttpStatus.OK
        );

        this.logger.debug('get folder tree');
        folderTree = (await this.get(`/folder/folder-tree?space-ids=${spaceResponse.id}`, jwtToken.accessToken)).body as FolderTreeDto[];

        // get inherited permissions of subfolder1 (fakeUserId shouldn't be there)
        hasInheritedPermission = folderTree[0].children[0].members?.some((member) => member.userId === fakeUser1Id && member.inherit);
        expect(hasInheritedPermission).toBe(false);

        // get inherited permissions of subfolder2 (fakeUserId shouldn't be there)
        hasInheritedPermission = folderTree[0].children[0].children[0].members?.some(
            (member) => member.userId === fakeUser1Id && member.inherit
        );
        expect(hasInheritedPermission).toBe(false);
    }

    @Test('Add Multiple followers in tasks')
    async multipleTasksFollowers(): Promise<void> {
        this.logger.debug('create user and login');
        const {token: jwtToken} = await this.userSuite.createSuperAdminUser();
        const workflow = await this.createWorkflowForFolder(jwtToken.accessToken),
            workflowId = workflow.id;
        this.logger.debug('Members of space');
        const {token: fakeJwtToken1} = await this.userSuite.createSuperAdminUser();
        const fakeUser1Id = this.getUserIdFromAccessToken(fakeJwtToken1.accessToken);

        const {token: fakeJwtToken2} = await this.userSuite.createSuperAdminUser();
        const fakeUser2Id = this.getUserIdFromAccessToken(fakeJwtToken2.accessToken);

        const membersDto = [
            {id: fakeUser1Id, userPermission: UserPermissionOptions.FULL},
            {id: fakeUser2Id, userPermission: UserPermissionOptions.FULL},
        ];
        const spaceResponse = await this.createSpace(jwtToken.accessToken, [workflowId], membersDto),
            spaceId = spaceResponse.id;

        this.logger.debug('create folder');
        const fakeFolder = this.folderFactory.fakeCreateFolder(workflowId, null, DefaultViewOptions.BOARD, [TASK_MANAGEMENT], spaceId);

        const {body: f1} = await this.post(
            `/folder`,
            {
                ...fakeFolder,
                // members: membersDto,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        // this.logger.debug('Make these members followers of the folder as well');
        // await this.patch(
        //     `/folder/members/${f1.id}`,
        //     {
        //         insert: membersDto,
        //         delete: [],
        //         update: [],
        //     },
        //     jwtToken.accessToken
        // ).expect(HttpStatus.OK);

        expect(f1).toBeDefined();
        const {body: f1DB} = await this.get(`/folder/${f1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(f1DB.id).toEqual(f1.id);

        const {body: response} = await this.post(`/folder/follow/${f1.id}/${fakeUser1Id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(response.userId).toBe(fakeUser1Id);
        expect(response.folderId).toBe(f1.id);

        const {body: response1} = await this.post(`/folder/follow/${f1.id}/${fakeUser2Id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(response1.userId).toBe(fakeUser2Id);
        expect(response1.folderId).toBe(f1.id);

        const fakeTask = this.factory.fakeCreateTask(fakeUser1Id, f1.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Followers of folders should be added to task followers list');
        const {body: taskFollowers} = await this.get(`follow/${task.id}/folder/${f1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('Check both followers are in the task followers list');
        expect(taskFollowers.some((tf) => tf.userId === fakeUser1Id)).toBe(true);
        expect(taskFollowers.some((tf) => tf.userId === fakeUser2Id)).toBe(true);
    }

    @Test('create financial outlook source task')
    async createFOSourceTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(
            ``,
            {...fakeTask, source: FINANCIAL_OUTLOOK, assignees: [userId], taskType: TaskTypeOptions.FINANCIAL},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.source).toBe(FINANCIAL_OUTLOOK);
        expect(task.taskType).toBe(TaskTypeOptions.FINANCIAL);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());
    }

    @Test('create task and fetch task by folder id')
    async createTaskAndFetchByFolderId(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.assignees = [userId];
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.source).toBe(fakeTask.source);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());

        const {body: tasksList} = await this.post(
            `folder/${folder.id}?show-on=${TASK_MANAGEMENT}`,
            {pagination: {limit: 10, offset: 0}},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(tasksList).toBeDefined();
        expect(tasksList.metadata).toBeDefined();
        expect(tasksList.metadata.totalRecords).toBe(1);
        expect(tasksList.data).toBeDefined();
        expect(tasksList.data).toHaveLength(1);
        expect(tasksList.data[0].id).toBe(task.id);
    }

    /**
     * Updates the assignee list for a task.
     *
     * @return {Promise<void>} Promise that resolves once the assignee update is complete.
     */
    @Test('Update Task Assignee List')
    async updateTaskAssignee(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());

        //check if a user can add and removed from an assignee list for a task
        this.logger.debug('add owner as assignee to task');
        let data: TaskAssigneesDto = {
            folderId: folder.id,
            assignees: [userId],
        };
        await this.patch(`assignees/${task.id}`, data, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('get task with new assignees');
        const {body: taskWithAssignee} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskWithAssignee.assignees.length).toBe(1);
        expect(taskWithAssignee.assignees[0]).toBe(userId);

        this.logger.debug('validate we have task action with the added assignee');
        const {body: taskActionAssigneeAdded} = await this.post(
            `/task-action/folder/${folder.id}/task/${task.id}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(taskActionAssigneeAdded.metadata.totalRecords).toBe(2);
        expect(taskActionAssigneeAdded.metadata.unreadRecords).toBe(2);
        const assigneeAdded = taskActionAssigneeAdded.data.find(
            (a) => a.action === 'assign' && a.parameters.assignees.added.length === 1 && a.parameters.assignees.added.includes(userId)
        );
        expect(assigneeAdded).toBeDefined();
        expect(assigneeAdded.parameters.assignees.removed).toHaveLength(0);

        this.logger.debug('remove owner as assignee from task');
        data = {
            folderId: folder.id,
            assignees: [],
        };
        await this.patch(`assignees/${task.id}`, data, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: taskWithoutAssignee} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskWithoutAssignee.assignees.length).toBe(0);

        this.logger.debug('validate we have task action with the added assignee');
        const {body: taskActionAssigneeRemoved} = await this.post(
            `/task-action/folder/${folder.id}/task/${task.id}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(taskActionAssigneeRemoved.metadata.totalRecords).toBe(3);
        expect(taskActionAssigneeRemoved.metadata.unreadRecords).toBe(3);
        const assigneeRemoved = taskActionAssigneeRemoved.data.find(
            (a) => a.action === 'assign' && a.parameters.assignees.removed.length === 1 && a.parameters.assignees.removed.includes(userId)
        );
        expect(assigneeRemoved).toBeDefined();
        expect(assigneeRemoved.parameters.assignees.added).toHaveLength(0);

        this.logger.debug('send 1000 aassignees to assign to task, should fail');
        const randomUUIDsArray = Array.from({length: 1001}, () => faker.string.uuid());
        data = {
            folderId: folder.id,
            assignees: randomUUIDsArray,
        };
        await this.patch(`assignees/${task.id}`, data, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
    }

    /**
     * Updates the assignee list for a task.
     *
     * @return {Promise<void>} Promise that resolves once the assignee update is complete.
     */
    @Test('Create Task and Check Action')
    async CreateTaskAndCheckAction(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask['assignees'] = [];
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());
        expect(task.taskType).toBe(fakeTask.taskType);

        this.logger.debug('validate we have task action with the added assignee');
        const {body: taskAction} = await this.post(`/task-action/folder/${folder.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(taskAction).toBeDefined();
        expect(taskAction.data.length).toBe(1);
        const exists = taskAction.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.CREATE && x.taskId === task.id
        );
        expect(exists).toBeDefined();
        const taskFound = exists.parameters?.create;
        expect(taskFound.title).toBe(task.title);
        expect(taskFound.description).toBe(task.description);
        expect(taskFound.assignees.length).toBe(0);
    }

    /**
     * Create Task and check space id
     *
     * @return {Promise<void>} Promise that resolves once the get one task.
     */
    @Test('Create Task and Check Space Id')
    async CreateTaskAndCheckSpaceId(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());
        expect(task.taskType).toBe(fakeTask.taskType);

        this.logger.debug('validate we have task action with the added assignee');
        const {body: getOneTask} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(getOneTask).toBeDefined();
        expect(getOneTask.id).toBe(task.id);
        expect(getOneTask.title).toBe(task.title);
        expect(getOneTask.spaceId).toBe(spaceId);
    }

    public async getSingleTask(taskId: number, folderId: number, jwtToken: TokenInterface): Promise<TaskResponseDto> {
        const {body: task} = await this.get(`${taskId}/folder/${folderId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(task).toBeDefined();
        expect(task.id).toBe(taskId);

        return task;
    }

    // /**
    //  * Add Custom Field Collection To Task
    //  *
    //  * @return {Promise<void>} Promise that resolves
    //  */
    // @Test('Add Custom Field Collection To Task')
    // async addCustomFieldCollectionToTask(): Promise<void> {
    //     this.logger.debug('create user and folder');
    //     const {folder, spaceId, jwtToken} = await this.createFolder();
    //     this.logger.debug('create custom field collection ');
    //     const customFieldCollection = await this.createSpaceCustomFieldCollection(jwtToken.accessToken, 1);
    //     this.logger.debug('assign custom field collection to space');
    //     const {body: updatedSpace} = await this.patch(
    //         `/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //     expect(updatedSpace.affected).toBe(1);
    //     const {body: foundSpace} = await this.get(`/space/${spaceId}`, jwtToken.accessToken).expect(HttpStatus.OK);
    //     expect(foundSpace).toBeDefined();
    //     expect(foundSpace.id).toBe(spaceId);
    //     const scfc = foundSpace.customFieldsCollections.find((cfc) => cfc.id === customFieldCollection.id);
    //     expect(scfc.id).toBe(customFieldCollection.id);
    //
    //     this.logger.debug('assign custom field collection to folder');
    //     const {body: updatedFolder} = await this.patch(
    //         `/folder/${folder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //     expect(updatedFolder.affected).toBe(1);
    //     const {body: foundFolder} = await this.get(`/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
    //     expect(foundFolder.id).toBe(folder.id);
    //     expect(foundFolder.title).toBe(folder.title);
    //     const fcfc = foundFolder.customFieldsCollections.find((cfc) => cfc.id === customFieldCollection.id);
    //     expect(fcfc.id).toBe(customFieldCollection.id);
    //
    //     this.logger.debug('create task');
    //     const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
    //     const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
    //     const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
    //     expect(task.description).toBe(fakeTask.description);
    //     expect(task.title).toBe(fakeTask.title);
    //
    //     this.logger.debug('check assignned custom field collection to task');
    //     const {body: board} = await this.post(`/folder-workflow/project/${folder.id}/board`, {}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     expect(board).toBeDefined();
    //     expect(board[0].columns[0].tasks).toHaveLength(1);
    //
    //     const foundTask = board[0].columns[0].tasks.find((t) => t.id === task.id);
    //     expect(foundTask.title).toBe(task.title);
    //     expect(foundTask.customFields).toHaveLength(1);
    //
    //     const foundCF = foundTask.customFields.find((cf) => cf.customFieldDefinitionId === customFieldCollection.customFields[0].id);
    //     expect(foundCF.customFieldDefinitionId).toBe(customFieldCollection.customFields[0].id);
    // }
    //
    // /**
    //  * Add Custom Field Collection To Task And Folder Already Created
    //  *
    //  * @return {Promise<void>} Promise that resolves
    //  */
    // @Test('Add Custom Field Collection To Task Already Created')
    // async addCustomFieldCollectionToTaskAlreadyCreated(): Promise<void> {
    //     this.logger.debug('create user and folder');
    //     const {folder, spaceId, jwtToken} = await this.createFolder();
    //     this.logger.debug('create custom field collection ');
    //     const {body: foundSpace} = await this.get(`/space/${spaceId}`, jwtToken.accessToken).expect(HttpStatus.OK);
    //     expect(foundSpace).toBeDefined();
    //     expect(foundSpace.id).toBe(spaceId);
    //     expect(foundSpace.customFieldsCollections).toHaveLength(0);
    //
    //     const {body: foundFolder} = await this.get(`/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
    //     expect(foundFolder.id).toBe(folder.id);
    //     expect(foundFolder.title).toBe(folder.title);
    //     expect(foundFolder.customFieldsCollections).toHaveLength(0);
    //
    //     this.logger.debug('create task');
    //     const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
    //     const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
    //     const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
    //     expect(task.description).toBe(fakeTask.description);
    //     expect(task.title).toBe(fakeTask.title);
    //
    //     this.logger.debug('check assignned custom field collection to task');
    //     const {body: board} = await this.post(`/folder-workflow/project/${folder.id}/board`, {}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     expect(board).toBeDefined();
    //     expect(board[0].columns[0].tasks).toHaveLength(1);
    //     const foundTask = board[0].columns[0].tasks.find((t) => t.id === task.id);
    //     expect(foundTask.title).toBe(task.title);
    //     expect(foundTask.customFields).toHaveLength(0);
    //
    //     this.logger.debug('assign custom field collection to space and folder');
    //     const customFieldCollection = await this.createSpaceCustomFieldCollection(jwtToken.accessToken, 2);
    //     this.logger.debug('assign custom field collection to space');
    //     const {body: updatedSpace} = await this.patch(
    //         `/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //     expect(updatedSpace.affected).toBe(1);
    //     const {body: foundSpaceUpdated} = await this.get(`/space/${spaceId}`, jwtToken.accessToken).expect(HttpStatus.OK);
    //     expect(foundSpaceUpdated).toBeDefined();
    //     expect(foundSpaceUpdated.id).toBe(spaceId);
    //     const scfc = foundSpaceUpdated.customFieldsCollections.find((cfc) => cfc.id === customFieldCollection.id);
    //     expect(scfc.id).toBe(customFieldCollection.id);
    //
    //     this.logger.debug('assign custom field collection to folder');
    //     const {body: updatedFolder} = await this.patch(
    //         `/folder/${folder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //     expect(updatedFolder.affected).toBe(1);
    //     const {body: foundFolderUpdated} = await this.get(`/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
    //     expect(foundFolderUpdated.id).toBe(folder.id);
    //     expect(foundFolderUpdated.title).toBe(folder.title);
    //     const fcfc = foundFolderUpdated.customFieldsCollections.find((cfc) => cfc.id === customFieldCollection.id);
    //     expect(fcfc.id).toBe(customFieldCollection.id);
    //
    //     this.logger.debug('check assignned custom field collection to task');
    //     const {body: boardUpdated} = await this.post(`/folder-workflow/project/${folder.id}/board`, {}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     expect(boardUpdated).toBeDefined();
    //     expect(boardUpdated[0].columns[0].tasks).toHaveLength(1);
    //
    //     const foundTaskUpdated = boardUpdated[0].columns[0].tasks.find((t) => t.id === task.id);
    //     expect(foundTaskUpdated.title).toBe(task.title);
    //     expect(foundTaskUpdated.customFields).toHaveLength(2);
    //
    //     const foundCF1 = foundTaskUpdated.customFields.find(
    //         (cf) => cf.customFieldDefinitionId === customFieldCollection.customFields[0].id
    //     );
    //     expect(foundCF1.customFieldDefinitionId).toBe(customFieldCollection.customFields[0].id);
    //     const foundCF2 = foundTaskUpdated.customFields.find(
    //         (cf) => cf.customFieldDefinitionId === customFieldCollection.customFields[1].id
    //     );
    //     expect(foundCF2.customFieldDefinitionId).toBe(customFieldCollection.customFields[1].id);
    //
    //     this.logger.debug('(delete) update a folder with custom field collection ');
    //     await this.patch(
    //         `/folder/${folder.id}/space/${spaceId}`,
    //         {customFieldCollections: {delete: [customFieldCollection.id]}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     const {body: updateResponse} = await this.get(`/folder/${folder.id}?show-on=${TASK_MANAGEMENT}`, jwtToken.accessToken).expect(
    //         HttpStatus.OK
    //     );
    //     expect(updateResponse).toBeDefined();
    //     expect(updateResponse.customFieldsCollections.length).toBe(0);
    //
    //     const {body: boardDeleted} = await this.post(`/folder-workflow/project/${folder.id}/board`, {}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     expect(boardDeleted).toBeDefined();
    //     expect(boardDeleted[0].columns[0].tasks).toHaveLength(1);
    //
    //     const taskDeleted = boardDeleted[0].columns[0].tasks.find((t) => t.id === task.id);
    //     expect(taskDeleted.title).toBe(task.title);
    //     expect(taskDeleted.customFields).toHaveLength(0);
    //
    //     this.logger.debug('send 1000 insertIds for collections, should fail with Bad Request');
    //
    //     await this.patch(
    //         `/folder/${folder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [...Array(1001).keys()]}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.BAD_REQUEST);
    //
    //     this.logger.debug('send 1000 deleteIds for collections, should fail with Bad Request');
    //
    //     await this.patch(
    //         `/folder/${folder.id}/space/${spaceId}`,
    //         {customFieldCollections: {delete: [...Array(1001).keys()]}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.BAD_REQUEST);
    // }
    //
    // @Test('Remove and Add back a custom field that is part of collection')
    // async customFieldFromCollection(): Promise<void> {
    //     this.logger.debug('create user and folder');
    //     const {folder, spaceId, jwtToken} = await this.createFolder();
    //     const customFieldCollection = await this.createSpaceCustomFieldCollection(jwtToken.accessToken, 1);
    //     await this.patch(
    //         `/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `/folder/${folder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     // Create task in folder
    //     const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
    //     const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
    //     const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
    //     expect(task.title).toBe(fakeTask.title);
    //     expect(task.description).toBe(fakeTask.description);
    //
    //     this.logger.debug('check assignned custom field collection to task');
    //     const {body: board1} = await this.post(`/folder-workflow/project/${folder.id}/board`, {}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     expect(board1).toBeDefined();
    //     expect(board1[0].columns[0].tasks).toHaveLength(1);
    //
    //     const foundTask1 = board1[0].columns[0].tasks.find(({id}) => id === task.id);
    //     expect(foundTask1.title).toBe(task.title);
    //     expect(foundTask1.customFields).toHaveLength(1);
    //
    //     const [customField] = customFieldCollection.customFields;
    //
    //     const foundCF1 = foundTask1.customFields.find(({customFieldDefinitionId}) => customFieldDefinitionId === customField.id);
    //     expect(foundCF1.customFieldDefinitionId).toBe(customField.id);
    //
    //     // Remove the custom field from the task
    //     await this.post(`custom-field/space/${spaceId}/folder/${folder.id}/task/${task.id}`, {delete: [customField.id]}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     const {body: board2} = await this.post(`/folder-workflow/project/${folder.id}/board`, {}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     expect(board2).toBeDefined();
    //     expect(board2[0].columns[0].tasks).toHaveLength(1);
    //
    //     const foundTask2 = board2[0].columns[0].tasks.find(({id}) => id === task.id);
    //     expect(foundTask2.customFields).toHaveLength(0);
    //
    //     // Add back the custom field to the task
    //     await this.post(`custom-field/space/${spaceId}/folder/${folder.id}/task/${task.id}`, {insert: [customField.id]}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     const {body: board3} = await this.post(`/folder-workflow/project/${folder.id}/board`, {}, jwtToken.accessToken).expect(
    //         HttpStatus.CREATED
    //     );
    //     expect(board3).toBeDefined();
    //     expect(board3[0].columns[0].tasks).toHaveLength(1);
    //
    //     const foundTask3 = board3[0].columns[0].tasks.find(({id}) => id === task.id);
    //     expect(foundTask3.title).toBe(task.title);
    //     expect(foundTask3.customFields).toHaveLength(1);
    //
    //     const foundCF2 = foundTask3.customFields.find(({customFieldDefinitionId}) => customFieldDefinitionId === customField.id);
    //     expect(foundCF2.customFieldDefinitionId).toBe(customField.id);
    // }

    /**
     * Checks if the auto child task assignee is functioning correctly.
     *
     * @returns {Promise<void>} A promise that resolves when the check is complete.
     */
    @Test('Check Auto Child Task Assignee')
    async CheckAutoChildTaskAssignee(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeChildTask = this.factory.fakeCreateTask(userId, folder.id, task.id);
        const {body: childTask} = await this.post(``, fakeChildTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('add owner as assignee to task');
        const data: TaskAssigneesDto = {
            folderId: folder.id,
            assignees: [userId],
        };
        await this.patch(`assignees/${task.id}`, data, jwtToken.accessToken).expect(HttpStatus.OK);

        const taskWithAssignee = await this.getSingleTask(task.id, folder.id, jwtToken);
        expect(taskWithAssignee.assignees.length).toBe(1);
        expect(taskWithAssignee.assignees[0]).toBe(userId);
        const childTaskResponse = await this.getSingleTask(childTask.id, folder.id, jwtToken);
        expect(childTaskResponse.assignees.length).toBe(0);
    }

    /**
     * Verifies that tasks are correctly associated with their child and grandchild tasks.
     *
     * @returns {Promise<void>} A promise that resolves when the check is complete.
     */
    @Test('Fetch task with all its children')
    async fetchTaskWithAllChildren(): Promise<void> {
        this.logger.debug('Creating user and folder...');
        const {folder, jwtToken} = await this.createFolder();

        this.logger.debug('Extracting user ID from JWT...');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        this.logger.debug('Creating parent task...');
        const parentTaskPayload = this.factory.fakeCreateTask(userId, folder.id);
        const {body: parentTask} = await this.post('', parentTaskPayload, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Creating child task...');
        const childTaskPayload = this.factory.fakeCreateTask(userId, folder.id, parentTask.id);
        const {body: childTask} = await this.post('', childTaskPayload, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('Creating child task...');
        const childTaskPayload2 = this.factory.fakeCreateTask(userId, folder.id, parentTask.id);
        const {body: childTask2} = await this.post('', childTaskPayload2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Creating grandchild task...');
        const grandChildTaskPayload = this.factory.fakeCreateTask(userId, folder.id, childTask.id);
        const {body: grandChildTask} = await this.post('', grandChildTaskPayload, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Fetching task with all associated children from database...');
        const {body: fetchedTask} = await this.get(
            `${parentTask.id}/folder/${folder.id}?show-all-children=true`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        this.logger.debug('Verifying fetched task structure and relationships...');
        expect(fetchedTask).toBeDefined();
        expect(fetchedTask.children).toBeDefined();
        expect(fetchedTask.children.length).toBe(2);
        fetchedTask.children.map((child) => expect(child.importanceId).toBeDefined());

        this.logger.debug(`Asserting child task ID: Expected ${childTask.id}`);
        const child1 = fetchedTask.children.filter((c) => c.id === childTask.id);
        expect(child1.length).toBe(1);
        expect(child1[0].id).toBe(childTask.id);
        const child2 = fetchedTask.children.filter((c) => c.id === childTask2.id);
        expect(child2.length).toBe(1);
        expect(child1[0].id).toBe(childTask.id);

        this.logger.debug(`Asserting grandchild task ID: Expected ${grandChildTask.id}`);
        expect(child1[0].children).toBeDefined();
        expect(child1[0].children.length).toBe(1);
        expect(child1[0].children[0].id).toBe(grandChildTask.id);

        this.logger.debug('Test completed successfully.');
        this.logger.debug('Check when show-all-children = false');
        const {body: fetchedTask2} = await this.get(
            `${parentTask.id}/folder/${folder.id}?show-all-children=false`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(fetchedTask2).toBeDefined();
        expect(fetchedTask2.children).toBeDefined();
        expect(fetchedTask2.children.length).toBe(2);

        const child3 = fetchedTask2.children.filter((c) => c.id === childTask.id);
        expect(child3.length).toBe(1);
        expect(child3[0].id).toBe(childTask.id);

        this.logger.debug(`Asserting grandchilds length to be 0`);
        expect(child3[0].children).toBeDefined();
        expect(child3[0].children.length).toBe(0);
    }

    /**
     * Get assigned tasks for the current user.
     *
     * @returns {Promise<void>}
     */
    @Test('Get Assigned to me Tasks')
    async getAssignedTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken: myJwtToken, spaceId, workflowDB} = await this.createFolder();

        const {folder: folder2, spaceId: spaceId2} = await this.createFolder(null, myJwtToken);
        this.logger.debug('get user id');
        const myUserId = this.getUserIdFromAccessToken(myJwtToken.accessToken);
        this.logger.debug('create task');
        const myFakeTask = this.factory.fakeCreateTask(myUserId, folder.id);
        const {body: task} = await this.post(``, myFakeTask, myJwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('add user as assignee to task');
        // await this.auth.grantToUser(PermissionOptions.READ, EntityTypeOptions.Folder, myUserId, task.id);
        let data: TaskAssigneesDto = {
            folderId: folder.id,
            assignees: [myUserId],
        };
        await this.patch(`assignees/${task.id}`, data, myJwtToken.accessToken).expect(HttpStatus.OK);

        const myFakeTask2 = this.factory.fakeCreateTask(myUserId, folder2.id);
        const {body: task2} = await this.post(``, myFakeTask2, myJwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('add user as assignee to task');
        // await this.auth.grantToUser(PermissionOptions.READ, EntityTypeOptions.Folder, myUserId, task.id);
        const data2: TaskAssigneesDto = {
            folderId: folder2.id,
            assignees: [myUserId],
        };
        await this.patch(`assignees/${task2.id}`, data2, myJwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('validate my task');
        const {body: taskWithAssignee} = await this.get(`${task.id}/folder/${folder.id}`, myJwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskWithAssignee.assignees.length).toBe(1);
        expect(taskWithAssignee.assignees[0]).toBe(myUserId);
        const workflowStates = await this.workflowStateFactory.repository.find({where: {workflowId: workflowDB.id}});

        this.logger.debug('validate my task 2');
        const {body: taskWithAssigneeF2} = await this.get(`${task2.id}/folder/${folder2.id}`, myJwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskWithAssigneeF2.assignees.length).toBe(1);
        expect(taskWithAssigneeF2.assignees[0]).toBe(myUserId);

        this.logger.debug('create user and login');
        const {token: fakeJwtToken} = await this.userSuite.createSuperAdminUser();
        const fakeUserId = this.getUserIdFromAccessToken(fakeJwtToken.accessToken);

        this.logger.debug('add member to space');
        const updateMembersDto = {
            insert: [{id: fakeUserId, userPermission: UserPermissionOptions.FULL}],
            update: [],
            delete: [],
        };
        await this.patch(`/space/${spaceId}/members`, updateMembersDto, myJwtToken.accessToken).expect(HttpStatus.OK);

        // this.logger.debug('add member to folder');
        // await this.patch(
        //     `/folder/members/${folder.id}`,
        //     {insert: [{id: fakeUserId, userPermission: UserPermissionOptions.FULL}], delete: [], update: []},
        //     myJwtToken.accessToken
        // ).expect(HttpStatus.OK);

        this.logger.debug('add another task to folder with different assignee to folder ');
        const fakeChildTaskData = this.factory.fakeCreateTask(fakeUserId, folder.id);
        const {body: fakeChildTask} = await this.post(``, fakeChildTaskData, fakeJwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('add user as assignee to task');
        // await this.auth.grantToUser(PermissionOptions.READ, EntityTypeOptions.Folder, fakeUserId, fakeChildTask.id);
        data = {
            folderId: folder.id,
            assignees: [fakeUserId],
        };
        await this.patch(`assignees/${fakeChildTask.id}`, data, fakeJwtToken.accessToken).expect(HttpStatus.OK);
        const {body: taskWithAssignee2} = await this.get(`${fakeChildTask.id}/folder/${folder.id}`, fakeJwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(taskWithAssignee2.assignees.length).toBe(1);
        expect(taskWithAssignee2.assignees[0]).toBe(fakeUserId);

        const stateIds = workflowStates.map((s) => s.id);
        const {body: taskAssignedToMe} = await this.post(
            `assigned`,
            {
                filter: {
                    folderId: folder.id,
                    endDateFrom: task.startDate,
                    endDateTo: faker.date.future({years: 1, refDate: task.endDate}),
                    stateIds,
                    importanceId: task.importanceId,
                },
                sort: {key: 'id', order: 'ASC'},
            },
            myJwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(taskAssignedToMe.tasks.length).toBe(1);
        expect(taskAssignedToMe.tasks[0].assignees[0]).toBe(myUserId);
        expect(taskAssignedToMe.tasks.every((el) => el.spaceId)).toBeTruthy();

        const {body: taskAssignedToMeSpace} = await this.post(
            `assigned`,
            {
                filter: {
                    spaceId: spaceId2,
                },
                sort: {key: 'id', order: 'ASC'},
            },
            myJwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(taskAssignedToMeSpace.tasks.length).toBe(1);
        expect(taskAssignedToMeSpace.tasks[0].id).toBe(task2.id);
        expect(taskAssignedToMe.tasks[0].assignees.length).toBe(1);
        expect(taskAssignedToMe.tasks[0].assignees[0]).toBe(myUserId);
        expect(taskAssignedToMeSpace.tasks.every((el) => el.spaceId === spaceId2)).toBeTruthy();

        this.logger.debug('try all sort keys and it should not fail');
        await this.post(
            `assigned`,
            {
                filter: {},
                sort: {key: 'title', order: 'ASC'},
            },
            myJwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `assigned`,
            {
                filter: {},
                sort: {key: 'folderTitle', order: 'ASC'},
            },
            myJwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `assigned`,
            {
                filter: {},
                sort: {key: 'stateTitle', order: 'ASC'},
            },
            myJwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `assigned`,
            {
                filter: {},
                sort: {key: 'importanceId', order: 'ASC'},
            },
            myJwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('send 1000 stateIds to get tasks, should fail with Bad Request');
        await this.post(
            `assigned`,
            {
                filter: {
                    stateIds: [...Array(1001).keys()],
                },
                sort: {key: 'id', order: 'ASC'},
            },
            myJwtToken.accessToken
        ).expect(HttpStatus.BAD_REQUEST);
    }

    /**
     * Performs an automated user task of adding a comment to a task in a folder.
     *
     * @returns {Promise<void>} - A Promise that resolves when the automation is completed successfully.
     */
    @Test('Automation User Add Comment')
    async automationUserAddComment(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());
        this.logger.debug('get folder tree');
        const {body: folderTree} = await this.get(`/folder/folder-tree`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(folderTree[0].children[0]).toMatchObject({id: folder.id, title: folder.title});
        this.logger.debug('get folder task tree');
        const {body: folderTaskTree} = await this.post(
            `/folder-workflow/project/${folder.id}/${folder.defaultView}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(folderTaskTree[0].columns[0].tasks[0].id).toBe(task.id);
        expect(folderTaskTree[0].columns[0].tasks[0].title).toBe(task.title);
        expect(folderTaskTree[0].columns[0].tasks[0].folderId).toBe(folder.id);
        const automationUser = await this.logUser(this.userFactory.getPasServiceUserLoginDto(), UserTypeOptions.MODULE_USER);
        const commentDto: CreateTaskActionDto = {comment: 'this is a test comment', mentionMembers: [userId]};
        const {body: respComment} = await this.post(
            `/task-action/folder/${folder.id}/task/${task.id}/comment`,
            commentDto,
            automationUser.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: commentGet} = await this.post(`/task-action/folder/${folder.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(commentGet.metadata.totalRecords).toBe(2);
        expect(commentGet.metadata.unreadRecords).toBe(2);
        const commentAction = commentGet.data.find((a) => a.action === 'comment' && a.id === respComment.identifiers[0].id);
        expect(commentAction).toBeDefined();
        expect(commentAction.taskId).toBe(task.id);
    }

    /**
     * Performs an automated user task of adding a comment to a task in a folder.
     *
     * @returns {Promise<void>} - A Promise that resolves when the automation is completed successfully.
     */
    @Test('Get Automations Tasks By Folder')
    async getAutomationsTmDueByFolder(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());
        this.logger.debug('get folder tree');
        await this.post(`automationstmduetasks`, {folderId: folder.id}, jwtToken.accessToken).expect(HttpStatus.CREATED);
    }

    // Test case for custom field value validation on a task
    /**
     * Creates a custom field on a task.
     *
     * @returns {Promise<void>} - a Promise that resolves when the custom field is created successfully
     */
    @Test('Custom Field of Task')
    async createCustomFieldOnTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());

        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id, task.id);
        await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const customFieldDefinitionDto = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(
            [],
            CustomFieldDefinitionTypeOptions.WEBSITE
        );
        const customFieldDefinitionDto2 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(
            [],
            CustomFieldDefinitionTypeOptions.TEXT
        );

        this.logger.debug('create custom field definition');
        const {body: customField} = await this.post(
            `/custom-field-definition/${spaceId}`,
            customFieldDefinitionDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: customFields} = await this.get(`/custom-field-definition/${spaceId}?show-inactive=false`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(customFields.length).toBe(1);
        const createdCF = customFields.find((cf: {id: number}) => cf.id === customField.identifiers[0].id);
        expect(createdCF.type).toBe(CustomFieldDefinitionTypeOptions.WEBSITE);
        this.logger.debug('create custom field definition 2');
        const {body: customField2} = await this.post(
            `/custom-field-definition/${spaceId}`,
            customFieldDefinitionDto2,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: customFields2DB} = await this.get(
            `/custom-field-definition/${spaceId}?show-inactive=false`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(customFields2DB.length).toBeGreaterThanOrEqual(2);
        const createdCF2 = customFields2DB.find((cf: {id: number}) => cf.id === customField2.identifiers[0].id);
        expect(createdCF2.type).toBe(CustomFieldDefinitionTypeOptions.TEXT);

        // this.logger.debug('assign custom field to space');
        // await this.post(
        //     `/space/${spaceId}/custom-field-value`,
        //     {
        //         insert: [
        //             {id: customField.identifiers[0].id, value: ''},
        //             {id: customField2.identifiers[0].id, value: ''},
        //         ],
        //     },
        //     jwtToken.accessToken
        // ).expect(HttpStatus.CREATED);

        this.logger.debug('assign custom field to folder');
        await this.post(
            `/folder/custom-field-value/${folder.id}/space/${spaceId}`,
            {
                insert: [
                    {id: customField.identifiers[0].id, value: ''},
                    {id: customField2.identifiers[0].id, value: ''},
                ],
                delete: [],
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('create custom field value');
        const customFieldValue = 'www.google.com';
        await this.patch(
            `custom-field/${customField.identifiers[0].id}/folder/${folder.id}/task/${task.id}?value=${customFieldValue}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        const {body: taskCustomFields} = await this.get(`custom-field/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        const customFieldWithValue = taskCustomFields.customFields.find((cf: {value: string}) => cf.value === customFieldValue);
        expect(customFieldWithValue).toBeDefined();
        expect(taskCustomFields.customFields.some((cf) => cf.customFieldDefinitionId === customField2.identifiers[0].id)).toBe(true);

        await this.post(`custom-field/${customFieldWithValue.id}/folder/${folder.id}/task/${task.id}/pin`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        const {body: taskCustomFields2} = await this.get(`custom-field/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        const {isPinned} = taskCustomFields2.customFields.find((cf: {value: string}) => cf.value === customFieldValue) ?? {};
        expect(isPinned).toBe(true);

        await this.post(
            `custom-field/${customFieldWithValue.id}/folder/${folder.id}/task/${task.id}/unpin`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        const {body: taskCustomFields3} = await this.get(`custom-field/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        const {isPinned: isPinned2} = taskCustomFields3.customFields.find((cf: {value: string}) => cf.value === customFieldValue) ?? {};
        expect(isPinned2).toBe(false);

        const validUrls = [
            'https://www.example.com',
            'https://example.com',
            'http://example.com',
            'www.example.com',
            'www.abc.ads',
            'https://example.com/some/path',
            'https://example.com/path/page.html',
            'https://example.com/search?q=query',
            'https://example.com:8080',
            'https://subdomain.example.co.uk',
            'http://192.168.1.1',
            'https://prod.plexxis-ext.software/web/tasks/home/main',
        ];
        for (const url of validUrls) {
            await this.patch(
                `custom-field/${customField.identifiers[0].id}/folder/${folder.id}/task/${task.id}?value=${url}`,
                {},
                jwtToken.accessToken
            ).expect(HttpStatus.OK);
        }

        const invalidUrls = [
            'https://www.example',
            'https://.com',
            'htp://example.com',
            'https://example.com/my path',
            'https://ex@mple.com',
            'https://-example.com',
        ];
        for (const url of invalidUrls) {
            await this.patch(
                `custom-field/${customField.identifiers[0].id}/folder/${folder.id}/task/${task.id}?value=${url}`,
                {},
                jwtToken.accessToken
            ).expect(HttpStatus.BAD_REQUEST);
        }

        await this.post(
            `custom-field/space/${spaceId}/folder/${folder.id}/task/${task.id}`,
            {insert: [], delete: [customField.identifiers[0].id]},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
    }

    /**
     * Creates a custom field on a task.
     *
     * @returns {Promise<void>} - a Promise that resolves when the custom field is created successfully
     */
    @Test('Add multi user Custom Field of Task')
    async addMultiUserCustomFieldOnTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const {token} = await this.userSuite.createSuperUser();
        const userId2 = this.getUserIdFromAccessToken(token.accessToken);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());

        const customFieldDefinitionDto = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(
            [],
            CustomFieldDefinitionTypeOptions.USER
        );

        this.logger.debug('create custom field definition');
        const {body: customField} = await this.post(
            `/custom-field-definition/${spaceId}`,
            customFieldDefinitionDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: customFields} = await this.get(`/custom-field-definition/${spaceId}?show-inactive=false`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(customFields.length).toBe(1);
        const createdCF = customFields.find((cf: {id: number}) => cf.id === customField.identifiers[0].id);
        expect(createdCF.type).toBe(CustomFieldDefinitionTypeOptions.USER);

        this.logger.debug('assign custom field to folder');
        await this.post(
            `/folder/custom-field-value/${folder.id}/space/${spaceId}`,
            {
                insert: [{id: customField.identifiers[0].id, value: ''}],
                delete: [],
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('create single user custom field value');
        const customFieldValue1 = `${userId}`;
        await this.patch(
            `custom-field/${customField.identifiers[0].id}/folder/${folder.id}/task/${task.id}?value=${customFieldValue1}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        const {body: taskCustomFields1} = await this.get(`custom-field/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        const customFieldWithValue1 = taskCustomFields1.customFields.find((cf: {value: string}) => cf.value === customFieldValue1);
        expect(customFieldWithValue1).toBeDefined();

        this.logger.debug('create multi custom field value');
        const customFieldValue2 = `${userId},${userId2}`;
        await this.patch(
            `custom-field/${customField.identifiers[0].id}/folder/${folder.id}/task/${task.id}?value=${customFieldValue2}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        const {body: taskCustomFields2} = await this.get(`custom-field/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        const customFieldWithValue2 = taskCustomFields2.customFields.find((cf: {value: string}) => cf.value === customFieldValue2);
        expect(customFieldWithValue2).toBeDefined();

        this.logger.debug('create multi custom field value to fail');
        const customFieldValue3 = `${userId},${userId2}12`;
        const {body: responseFail} = await this.patch(
            `custom-field/${customField.identifiers[0].id}/folder/${folder.id}/task/${task.id}?value=${customFieldValue3}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.BAD_REQUEST);
        expect(responseFail.message).toBe(`Custom field value for ${CustomFieldDefinitionTypeOptions.USER} is invalid`);
    }

    /**
     * Create a Task (custom field,tags,assignee).
     *
     * @returns {Promise<void>} - a Promise that resolves when the custom field is created successfully
     */
    @Test('Create a Task (custom field,assignee)')
    async createTaskCustomFieldAssigneeOnTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('create user and login');
        const {token: fakeJwtToken1} = await this.userSuite.createSuperAdminUser();
        const userId2 = this.getUserIdFromAccessToken(fakeJwtToken1.accessToken);

        const customFieldDefinitionDto = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(
            [],
            CustomFieldDefinitionTypeOptions.WEBSITE
        );

        this.logger.debug('create custom field definition');
        const {body: customField} = await this.post(
            `/custom-field-definition/${spaceId}`,
            customFieldDefinitionDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: customFields} = await this.get(`/custom-field-definition/${spaceId}?show-inactive=false`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(customFields.length).toBeGreaterThanOrEqual(1);
        const createdCF = customFields.find((cf: {id: number}) => cf.id === customField.identifiers[0].id);
        expect(createdCF.type).toBe(CustomFieldDefinitionTypeOptions.WEBSITE);

        await this.patch(
            `/folder/${folder.id}/space/${spaceId}`,
            {
                customFieldValues: {
                    insert: [
                        {
                            id: customField.identifiers[0].id,
                            value: '',
                        },
                    ],
                    delete: [],
                },
            },
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        this.logger.debug('create task should fail if properties in assignees are not UUIDs');
        fakeTask['assignees'] = ['1234'];
        await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
        fakeTask['assignees'] = ['random string'];
        await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);

        this.logger.debug('create task');
        fakeTask['assignees'] = [userId2];
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.assignees).toHaveLength(1);
        expect(task.assignees).toContain(userId2);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());
        const {body: taskCustomFields} = await this.get(`custom-field/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(taskCustomFields.customFields[0].customFieldDefinitionId).toBe(customField.identifiers[0].id);
        expect(taskCustomFields.customFields[0].value).toBeNull();
    }

    /**
     * Create a Task and pudate positions on the task.
     *
     * @returns {Promise<void>} - a Promise that resolves when the position updates successfully
     */
    @Test('Update task assignees position')
    async updateTaskAssigneesPosition(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId1 = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const {token: fakeJwtToken2} = await this.userSuite.createSuperAdminUser();
        const userId2 = this.getUserIdFromAccessToken(fakeJwtToken2.accessToken);

        const {token: fakeJwtToken3} = await this.userSuite.createSuperAdminUser();
        const userId3 = this.getUserIdFromAccessToken(fakeJwtToken3.accessToken);

        const {token: fakeJwtToken4} = await this.userSuite.createSuperAdminUser();
        const userId4 = this.getUserIdFromAccessToken(fakeJwtToken4.accessToken);

        const {token: fakeJwtToken5} = await this.userSuite.createSuperAdminUser();
        const userId5 = this.getUserIdFromAccessToken(fakeJwtToken5.accessToken);

        this.logger.debug('add member to space');
        await this.patch(
            `/space/${spaceId}`,
            {
                members: {
                    insert: [
                        {id: userId2, userPermission: UserPermissionOptions.FULL},
                        {id: userId3, userPermission: UserPermissionOptions.FULL},
                        {id: userId4, userPermission: UserPermissionOptions.FULL},
                        {id: userId5, userPermission: UserPermissionOptions.FULL},
                    ],
                    delete: [],
                    update: [],
                },
            },
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        // this.logger.debug('add member to folder');
        // await this.patch(
        //     `/folder/members/${folder.id}`,
        //     {
        //         insert: [
        //             {id: userId2, userPermission: UserPermissionOptions.FULL},
        //             {id: userId3, userPermission: UserPermissionOptions.FULL},
        //             {id: userId4, userPermission: UserPermissionOptions.FULL},
        //             {id: userId5, userPermission: UserPermissionOptions.FULL},
        //         ],
        //         delete: [],
        //         update: [],
        //     },
        //     jwtToken.accessToken
        // ).expect(HttpStatus.OK);

        const fakeTask = this.factory.fakeCreateTask(userId1, folder.id);
        this.logger.debug('create task');
        const assignees = [userId2, userId1, userId3, userId5, userId4];
        fakeTask['assignees'] = assignees;
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.assignees).toStrictEqual(assignees);

        this.logger.debug('get one task detail');
        const {body: taskDetailBefore} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskDetailBefore.id).toBe(task.id);
        expect(taskDetailBefore.assignees).toStrictEqual(assignees);

        const taskPosition: TaskAssigneePositionDto = {
            taskId: task.id,
            folderId: folder.id,
            userId: userId1,
            index: 0,
        };

        this.logger.debug('update task assignee position and verify');
        const {body: response1} = await this.patch(`assignee/position`, taskPosition, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response1.affected).toBe(1);

        const {body: taskDetailAfter1} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskDetailAfter1.id).toBe(task.id);
        expect(taskDetailAfter1.assignees).toStrictEqual([userId1, userId2, userId3, userId5, userId4]);

        taskPosition.userId = userId5;
        taskPosition.index = 4;

        this.logger.debug('update task assignee position and verify');
        const {body: response2} = await this.patch(`assignee/position`, taskPosition, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response2.affected).toBe(1);

        const {body: taskDetailAfter2} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskDetailAfter2.id).toBe(task.id);
        expect(taskDetailAfter2.assignees).toStrictEqual([userId1, userId2, userId3, userId4, userId5]);

        taskPosition.userId = userId4;
        taskPosition.index = 0;

        this.logger.debug('update task assignee position and verify');
        const {body: response3} = await this.patch(`assignee/position`, taskPosition, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response3.affected).toBe(1);

        const {body: taskDetailAfter3} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskDetailAfter3.id).toBe(task.id);
        expect(taskDetailAfter3.assignees).toStrictEqual([userId4, userId1, userId2, userId3, userId5]);

        taskPosition.userId = faker.string.uuid();
        taskPosition.index = 0;

        this.logger.debug('update task assignee position and verify');
        const {body: response4} = await this.patch(`assignee/position`, taskPosition, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
        expect(response4.message).toBe(`Assignee ${taskPosition.userId} does not exist on task ${task.id}`);
    }

    /**
     * Retrieves the followers of a task.
     *
     * update: follow task query is no longer needed as creating a task will add the creator as follower automatically
     *
     * @returns {Promise<void>} A Promise that resolves if the operation is successful. Otherwise, it rejects with an error.
     * @throws {Error} If an error occurs during the operation.
     */
    @Test('Get Task Followers')
    async getTaskFollowers(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        // this.logger.debug('add follower to a task');
        // await this.post(`follow/${folder.id}/${task.id}/${userId}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('get task with the follower');
        const {body: followers} = await this.get(`follow/${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(followers.length).toBe(1);
        expect(followers[0].userId).toBe(userId);
    }

    /**
     * Unfollows a task by removing the user as a follower.
     *
     * update: follow task query is no longer needed as creating a task will add the creator as follower automatically
     *
     * @returns {Promise<void>} A promise that resolves when the task has been unfollowed successfully.
     */
    @Test('Unfollow Task')
    async unFollowTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        // this.logger.debug('add follower to task');
        // await this.post(`follow/${folder.id}/${task.id}/${userId}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('remove follower from task');
        await this.delete(`unfollow/${folder.id}/${task.id}/${userId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: followers} = await this.get(`follow/${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(followers.length).toEqual(0);
    }

    /**
     * Deletes a task by its ID.
     *
     * This method follows the following steps:
     * 1. Creates a user and folder.
     * 2. Obtains the JWT token from creating the folder.
     * 3. Gets the user ID from the JWT token.
     * 4. Creates a fake task using the user ID and folder ID.
     * 5. Sends a POST request to create the task.
     * 6. Expects the task ID to be defined in the response body.
     * 7. Sends a DELETE request to delete the task by its ID.
     * 8. Expects the response status to be HttpStatus.OK (200).
     * 9. Sends a GET request to verify that the task is indeed deleted.
     * 10. Expects the response status to be HttpStatus.NOT_FOUND (404).
     *
     * @returns {Promise<void>} A Promise that resolves when the task is successfully deleted.
     */
    @Test('Delete Task by ID')
    async deleteTaskById(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId, workflowDB} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeParentTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: parentTask} = await this.post(``, fakeParentTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id, parentTask.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeChildTask = this.factory.fakeCreateTask(userId, folder.id, task.id);
        const {body: childTask} = await this.post(``, fakeChildTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.id).toBeDefined();
        const fakeFiles = await this.taskAttachmentFactory.fakeFiles();
        this.logger.debug('create task attachment');
        const {body: taskAttachment} = await this.post(
            `/task-attachment/upload/${task.id}/folder/${folder.id}`,
            undefined,
            jwtToken.accessToken,
            fakeFiles
        ).expect(HttpStatus.CREATED);
        expect(taskAttachment).toHaveLength(fakeFiles.length);
        expect(taskAttachment[0].originalName).toBe(fakeFiles[0].path);
        this.logger.debug('add assignee');
        const taskAssigneeDto: TaskAssigneesDto = {assignees: [userId], folderId: folder.id};
        await this.patch(`assignees/${task.id}`, taskAssigneeDto, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('add custom fields');
        const customFieldIds = await this.createManyCustomFields(2, CustomFieldDefinitionTypeOptions.TEXT, jwtToken.accessToken, spaceId);

        this.logger.debug('assign custom field to folder');
        await this.post(
            `/folder/custom-field-value/${folder.id}/space/${spaceId}`,
            {
                insert: [
                    {id: customFieldIds[0], value: ''},
                    {id: customFieldIds[1], value: ''},
                ],
                delete: [],
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('create common custom field position');
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: customFieldIds[1],
                index: 0,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: customFieldIds[0],
                index: 1,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('add approval');
        const addApprovalToTaskDto = this.approvalFactory.fakeCreateAddApprovalToTaskDto([userId]);
        const {body: createdApproval} = await this.post(
            `/approvals/task/${task.id}/folder/${folder.id}`,
            addApprovalToTaskDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(createdApproval.taskId).toBe(task.id);
        expect(createdApproval.assignedApproves[0]).toBe(userId);

        const {body: wbDB} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`Update workflow`);
        const updatedWorkflow = this.workflowFactory.fakeUpdateWorkflow(wbDB);

        const acceptState = updatedWorkflow.states[0];
        const rejectState = updatedWorkflow.states[2];
        updatedWorkflow.states[1].approvalConstraint = {
            acceptState: acceptState.code,
            rejectState: rejectState.code,
            userIds: [userId],
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };
        await this.patch(`/workflow/module/${workflowDB.id}`, updatedWorkflow, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: wbDbUpdated} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        const approvalConstraintInstanceRepo = this.dataSource.getRepository(ApprovalConstraintInstanceEntity);
        await approvalConstraintInstanceRepo.insert({
            approvalId: createdApproval.id,
            approvalConstraintId: wbDbUpdated.states[1].approvalConstraint.id,
            isActive: true,
            taskId: task.id,
            folderId: folder.id,
            spaceId,
        });

        this.logger.debug('create a comment');
        const fakeComment = this.taskActionFactory.fakeComment();
        const {body: comment} = await this.post(
            `/task-action/folder/${folder.id}/task/${task.id}/comment`,
            fakeComment,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(comment.identifiers[0].id).toBeDefined();
        await this.patch(
            `/task-action/folder/${folder.id}/task/${task.id}/read/${comment.identifiers[0].id}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        this.logger.debug('delete task by id');
        await this.delete(`folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        await this.get(`${childTask.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        await this.get(`${parentTask.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
    }

    @Test('Move Approval Constraint Task After Constraint Removed')
    async moveApprovalContraintTaskAfterConstraitRemoved(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, workflowDB} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        const {body: wbDB} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`Update workflow`);
        const fakeUpdatedWorkflow = this.workflowFactory.fakeUpdateWorkflow(wbDB);

        const acceptState = fakeUpdatedWorkflow.states[0];
        const rejectState = fakeUpdatedWorkflow.states[2];
        fakeUpdatedWorkflow.states[1].approvalConstraint = {
            acceptState: acceptState.code,
            rejectState: rejectState.code,
            userIds: [userId],
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };
        fakeUpdatedWorkflow.states.forEach((state) => {
            state.updated = false;
        });
        fakeUpdatedWorkflow.states[1].updated = true;
        await this.patch(`/workflow/module/${workflowDB.id}`, fakeUpdatedWorkflow, jwtToken.accessToken).expect(HttpStatus.OK);

        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.id).toBeDefined();

        const {body: updatedWorkflow} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('move task');
        const moveTaskDto: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: updatedWorkflow.states[1].id,
            index: 0,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const fakeUpdatedWorkflow2 = this.workflowFactory.fakeUpdateWorkflow(updatedWorkflow);
        fakeUpdatedWorkflow2.states.forEach((state) => {
            state.updated = false;
        });
        fakeUpdatedWorkflow2.states[1].approvalConstraint = null;
        fakeUpdatedWorkflow2.states[1].updated = true;
        await this.patch(`/workflow/module/${workflowDB.id}`, fakeUpdatedWorkflow2, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: updatedWorkflow2} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        moveTaskDto.columnId = updatedWorkflow2.states[2].id;
        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
    }

    @Test('Create Task in Constraint Workflow')
    async createTaskInConstraintWorkflow(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, workflowDB} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task1.id).toBeDefined();

        const {body: wbDB} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`Update workflow`);
        const fakeUpdatedWorkflow = this.workflowFactory.fakeUpdateWorkflow(wbDB);
        fakeUpdatedWorkflow.states[1].constraints = [{swimlaneConstraint: [fakeUpdatedWorkflow.states[0].code], userConstraint: [userId]}];

        await this.patch(`/workflow/module/${workflowDB.id}`, fakeUpdatedWorkflow, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: wbDB2} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const constraintState = wbDB2.states[1];
        expect(constraintState.constraints).toHaveLength(1);
        expect(constraintState.constraints[0].userConstraint).toContain(userId);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task2.id).toBeDefined();
        const fakeTask3 = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask3.workflowStateId = constraintState.id;
        const {body: task3} = await this.post(``, fakeTask3, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
        expect(task3.message).toBe('New Task cannot be created in this swimlane');
        const fakeUpdatedWorkflow2 = this.workflowFactory.fakeUpdateWorkflow(wbDB2);
        fakeUpdatedWorkflow2.states[1].constraints = [];
        const acceptState = fakeUpdatedWorkflow2.states[0];
        const rejectState = fakeUpdatedWorkflow2.states[2];
        fakeUpdatedWorkflow2.states[1].approvalConstraint = {
            acceptState: acceptState.code,
            rejectState: rejectState.code,
            userIds: [userId],
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };
        fakeUpdatedWorkflow2.states.forEach((state) => {
            state.updated = false;
        });
        fakeUpdatedWorkflow2.states[1].updated = true;
        await this.patch(`/workflow/module/${workflowDB.id}`, fakeUpdatedWorkflow2, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: wbDB3} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const approvalConstraintState = wbDB3.states[1];
        expect(approvalConstraintState.approvalConstraint).toBeDefined();
        expect(approvalConstraintState.approvalConstraint.dueIn).toBe(1);
        const fakeTask4 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task4} = await this.post(``, fakeTask4, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task4.id).toBeDefined();

        const fakeTask5 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        fakeTask5.workflowStateId = approvalConstraintState.id;
        const {body: task5} = await this.post(``, fakeTask5, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
        expect(task5.message).toBe('New Task cannot be created in this swimlane');
    }

    /**
     * Deletes multiple tasks from a folder.
     *
     * @return {Promise<void>} A Promise that resolves when the tasks are deleted.
     */
    @Test('Delete Many Tasks')
    async deleteManyTasks(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('delete tasks', [task1.id, task2.id]);
        const expectedReason1 = faker.string.alphanumeric(200);
        const expectedReason2 = faker.string.alphanumeric(200);
        await this.post(
            `folder/${folder.id}/delete-many`,
            {
                tasks: [
                    {id: task1.id, reason: expectedReason1},
                    {id: task2.id, reason: expectedReason2},
                ],
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.get(`${task1.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        const {body} = await this.post(
            `/folder/deleted-folder-task`,
            {
                limit: 50,
                offset: 0,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const task1FromList = body.data.find((task: {id: string}) => task.id === task1.id);
        expect(task1FromList).toBeDefined();
        expect(task1FromList.deleteReason).toBe(expectedReason1);
        const task2FromList = body.data.find((task: {id: string}) => task.id === task2.id);
        expect(task2FromList).toBeDefined();
        expect(task2FromList.deleteReason).toBe(expectedReason2);
    }

    @Test('Soft delete task')
    async softDeleteTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create tasks');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('delete tasks', task.id);
        const badRequetReason = faker.string.alphanumeric(201);
        await this.delete(`delete/${task.id}/folder/${folder.id}?reason=${badRequetReason}`, jwtToken.accessToken).expect(
            HttpStatus.BAD_REQUEST
        );
        const reason = faker.string.alphanumeric(200);
        await this.delete(`delete/${task.id}/folder/${folder.id}?reason=${reason}`, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        const {body} = await this.post(
            `/folder/deleted-folder-task`,
            {
                limit: 50,
                offset: 0,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const taskFromList = body.data.find((task: {id: string}) => task.id === task.id);
        expect(taskFromList).toBeDefined();
        expect(taskFromList.deleteReason).toBe(reason);
        this.logger.debug('delete task with no reason');

        const approvalDeletePromise = enqueueEventAndGetPromise(
            {entityId: task2.id},
            this.approvalApiConnectorService,
            (job, data) => +job?.data?.entityId === +data?.entityId
        );

        await this.delete(`delete/${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        const job = await approvalDeletePromise;
        expect(job).toBeDefined();
        expect(+job.data.entityId).toBe(+task2.id);

        await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
    }

    /**
     * Archives multiple tasks.
     *
     * This method creates a user and a folder, then creates two tasks within the folder.
     * It then archives the two tasks and verifies that they have been successfully archived.
     *
     * @returns {Promise<void>} A promise that resolves when the tasks have been archived.
     */
    @Test('Archive Many Tasks')
    async archiveManyTasks(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create tasks');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeSubTask3 = this.factory.fakeCreateTask(userId, folder.id, task1.id);
        const {body: subtask3} = await this.post(``, fakeSubTask3, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('archive tasks', [task1.id, task2.id, subtask3.id]);
        const expectedReason1 = faker.string.alphanumeric(200);
        const expectedReason2 = faker.string.alphanumeric(200);
        const expectedReason3 = faker.string.alphanumeric(200);
        await this.post(
            `folder/${folder.id}/archive-many`,
            {
                tasks: [
                    {id: task1.id, reason: expectedReason1},
                    {id: task2.id, reason: expectedReason2},
                    {id: subtask3.id, reason: expectedReason3},
                ],
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        this.logger.debug('get all archived tasks');
        const {body: response} = await this.post(
            `/folder/archived-folder-task`,
            {
                limit: 50,
                offset: 0,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(response.data.length).toBeGreaterThanOrEqual(2);
        const task1FromList = response.data.find((task: {id: string}) => task.id === task1.id);
        expect(task1FromList).toBeDefined();
        expect(task1FromList.pathStr).toHaveLength(3);
        expect(task1FromList.pathStr[0].type).toBe(FolderTypeOptions.SPACE);
        expect([FolderTypeOptions.FOLDER, FolderTypeOptions.PROJECT]).toContain(task1FromList.pathStr[1].type);
        expect(task1FromList.pathStr[1].title).toBe(folder.title);
        expect(task1FromList.pathStr[2].type).toBe(EntityTypeOptions.Task);
        expect(task1FromList.pathStr[2].title).toBe(task1FromList.title);
        expect(task1FromList.archiveReason).toBe(expectedReason1);
        const task2FromList = response.data.find((task: {id: string}) => task.id === task2.id);
        expect(task2FromList).toBeDefined();
        expect(task2FromList.archiveReason).toBe(expectedReason2);
        this.logger.debug('Archived task should throw bad request exception if the task had already been archvied');
        const {body: BadRequestResponse} = await this.post(
            `folder/${folder.id}/archive-many`,
            {tasks: [{id: task1.id}]},
            jwtToken.accessToken
        ).expect(HttpStatus.BAD_REQUEST);
        expect(BadRequestResponse.message).toBe(`Task with id:${task1.id} had already been archived.`);

        const {body: BadRequestResponse2} = await this.post(
            `archive/${task2.id}/folder/${folder.id}`,
            {archiveReason: 'for testing'},
            jwtToken.accessToken
        ).expect(HttpStatus.BAD_REQUEST);
        expect(BadRequestResponse2.message).toBe(`Task with id:${task2.id} had already been archived.`);

        const {body: BadRequestResponse3} = await this.post(
            `archive/${subtask3.id}/folder/${folder.id}`,
            {archiveReason: 'for testing'},
            jwtToken.accessToken
        ).expect(HttpStatus.BAD_REQUEST);
        expect(BadRequestResponse3.message).toBe(`Task with id:${subtask3.id} had already been archived.`);
    }

    /**
     * Adds a tag to a task.
     *
     * @returns {Promise<void>} - A Promise that resolves when the tag is added to the task.
     */
    @Test('Add Tag to Task')
    async addTagToTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('create tag');
        const tag = await this.tagFactory.createTag(userId, null);
        this.logger.debug('add tag to task');
        await this.post(`tag/${task.id}/${tag.id}/${folder.id}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: taskResponse} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskResponse.tags.length).toBe(1);
        expect(taskResponse.tags[0]).toBe(tag.id);
    }

    /**
     * Upload a image in the descriptio of a task.
     *
     * @returns {Promise<void>} A Promise that resolves when the image is successfully uploaded.
     */
    @Test('Upload task description image')
    async uploadTaskDescriptionImage(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.id).toBeDefined();
        expect(task.title).toBe(fakeTask.title);
        this.logger.debug('create task description image');
        const fakeFileBase64 = await this.taskAttachmentFactory.fakeFileBase64();

        const fakeUpdateTask = this.factory.fakeUpdateTask(folder.id);
        fakeUpdateTask['description'] = `<p><img src="${fakeFileBase64}"></p>`;

        const {body: updatedTask} = await this.patch(`${task.id}`, fakeUpdateTask, jwtToken.accessToken).expect(HttpStatus.OK);

        const regex1 = /<img[^>]+src="([^"]*task-attachment\/([^"]+))"/g;
        const matchPatch = regex1.exec(updatedTask.description);

        const responsePatch = await this.get(`/task-attachment/${matchPatch[2]}`, null, {[`${COOKIE_KEY}`]: jwtToken.accessToken})
            .responseType('blob')
            .expect(HttpStatus.OK);

        const base64Patch = responsePatch.body.toString('base64');
        expect(base64Patch).toBe(fakeFileBase64.split(',')[1]);

        const {body: updatedTaskDB} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(updatedTaskDB.title).toBe(fakeUpdateTask.title);

        const regex2 = /<img[^>]+src="([^"]*task-attachment\/([^"]+))"/g;
        const matchGet = regex2.exec(updatedTaskDB.description);

        const responseGet = await this.get(`/task-attachment/${matchGet[2]}`, null, {[`${COOKIE_KEY}`]: jwtToken.accessToken})
            .responseType('blob')
            .expect(HttpStatus.OK);

        const base64Get = responseGet.body.toString('base64');
        expect(base64Get).toBe(fakeFileBase64.split(',')[1]);

        const {body: attachments} = await this.get(`/task-attachment/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(attachments).toHaveLength(1);
    }

    /**
     * 1) Upload a image in the descriptio of a task.
     * 2) Remove that image from the description
     * 3) image should also be removed from task-attachments
     *
     * @returns {Promise<void>} A Promise that resolves when the image is successfully uploaded.
     */
    @Test('upload and remove task description image')
    async uploadAndRemoveTaskDescriptionImage(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.id).toBeDefined();
        expect(task.title).toBe(fakeTask.title);
        this.logger.debug('create task description image');
        const fakeFileBase64 = await this.taskAttachmentFactory.fakeFileBase64();

        const fakeUpdateTask = this.factory.fakeUpdateTask(folder.id);
        fakeUpdateTask['description'] = `<p><img src="${fakeFileBase64}"></p>`;

        const {body: updatedTask} = await this.patch(`${task.id}`, fakeUpdateTask, jwtToken.accessToken).expect(HttpStatus.OK);

        const regex1 = /<img[^>]+src="([^"]*task-attachment\/([^"]+))"/g;
        const matchPatch = regex1.exec(updatedTask.description);

        const responsePatch = await this.get(`/task-attachment/${matchPatch[2]}`, null, {[`${COOKIE_KEY}`]: jwtToken.accessToken})
            .responseType('blob')
            .expect(HttpStatus.OK);

        const base64Patch = responsePatch.body.toString('base64');
        expect(base64Patch).toBe(fakeFileBase64.split(',')[1]);

        const {body: attachments} = await this.get(`/task-attachment/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(attachments).toHaveLength(1);

        const fakeUpdateTask2 = this.factory.fakeUpdateTask(folder.id);
        fakeUpdateTask2['description'] = `<p></p>`;

        await this.patch(`${task.id}`, fakeUpdateTask2, jwtToken.accessToken).expect(HttpStatus.OK);

        const {body: attachments2} = await this.get(`/task-attachment/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(attachments2).toHaveLength(0);
    }

    /**
     * Remove a tag from a task.
     *
     * @returns A Promise that resolves to void.
     */
    @Test('Remove Tag from Task')
    async removeTagFromTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const tag = await this.tagFactory.createTag(userId, null);
        this.logger.debug('add tag to task');
        await this.post(`tag/${task.id}/${tag.id}/${folder.id}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: response} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.tags.length).toBe(1);
        expect(response.tags[0]).toBe(tag.id);
        this.logger.debug('remove tag from task');
        await this.delete(`tag/${tag.id}/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: taskResponse} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskResponse.tags.length).toEqual(0);

        this.logger.debug('remove tag should fail with');
        const {body: notFoundResponse} = await this.delete(
            `tag/${tag.id}/folder/${folder.id}/task/${task.id}`,
            jwtToken.accessToken
        ).expect(HttpStatus.NOT_FOUND);
        expect(notFoundResponse.message).toBe(`Label '${tag.title}' is not found in the task.`);
    }

    @Test('Add tag to task should fail at constraint')
    async tagTaskFolderConstraint(): Promise<void> {
        const repoTagTaskFolder = this.dataSource.getRepository(TagTaskFolderEntity);
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const tag = await this.tagFactory.createTag(null, spaceId);

        this.logger.debug('Add tag to folder');
        const updateFolderDto: UpdateFolderDto = {tags: {insert: [tag.id]}};
        await this.patch(`/folder/${folder.id}/space/${spaceId}`, updateFolderDto, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('Add tag to the task');
        await this.post(`tag/${task.id}/${tag.id}/${folder.id}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);

        try {
            this.logger.debug('Add tag should fail at constraint');
            await repoTagTaskFolder.save({taskId: task.id, tagId: tag.id, type: TagTaskFolderTypeOptions.TASK_TAG});

            throw new Error();
        } catch (error) {
            if (error instanceof QueryFailedError) {
                expect(error.driverError.code).toEqual('ORA-00001');
            } else {
                fail(`Caught an unexpected error type: ${error}`);
            }
        }

        try {
            this.logger.debug('Add tag should fail at constraint');
            await repoTagTaskFolder.save({folderId: folder.id, tagId: tag.id, type: TagTaskFolderTypeOptions.FOLDER_TAG});

            throw new Error();
        } catch (error) {
            if (error instanceof QueryFailedError) {
                expect(error.driverError.code).toEqual('ORA-00001');
            } else {
                fail(`Caught an unexpected error type: ${error}`);
            }
        }
    }

    /**
     * Retrieves the tasks followed by the user.
     *
     * update: follow task query is no longer needed as creating a task will add the creator as follower automatically
     *
     * @returns {Promise<void>} - A promise that resolves when the operation is complete.
     */
    @Test('Get Following Tasks')
    async getFollowingTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        // this.logger.debug('add follower to task');
        // await this.post(`follow/${folder.id}/${task.id}/${userId}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('getting tasks followed by user');
        const {body: response} = await this.get(`following`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.length).toBe(1);
        expect(response[0].title).toBe(task.title);
    }

    @Test('Get Multiple Tasks By Ids')
    async getMultipleTasksByIds(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const {folder: folder2, spaceId: space2Id} = await this.createFolder(null, jwtToken);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask3 = this.factory.fakeCreateTask(userId, folder2.id);
        const fakeTask4 = this.factory.fakeCreateTask(userId, folder2.id);
        const fakeTask5 = this.factory.fakeCreateTask(userId, folder2.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task3} = await this.post(``, fakeTask3, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task4} = await this.post(``, fakeTask4, jwtToken.accessToken).expect(HttpStatus.CREATED);
        await this.post(``, fakeTask5, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('getting multiple tasks for folders followed by user');
        const {body: response} = await this.post(
            `get-multiple`,
            [
                {folderId: folder.id, taskIds: [task1.id, task2.id]},
                {folderId: folder2.id, taskIds: [task3.id, task4.id]},
            ],
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(response.length).toBe(4);
        const fetchedTask1 = response.filter((task) => task.id === task1.id);
        expect(fetchedTask1.length).toBe(1);
        expect(fetchedTask1[0].title).toBe(task1.title);
        expect(fetchedTask1[0].spaceId).toBe(spaceId);
        const fetchedTask2 = response.filter((task) => task.id === task2.id);
        expect(fetchedTask2.length).toBe(1);
        expect(fetchedTask2[0].title).toBe(task2.title);
        expect(fetchedTask2[0].spaceId).toBe(spaceId);
        const fetchedTask3 = response.filter((task) => task.id === task3.id);
        expect(fetchedTask3.length).toBe(1);
        expect(fetchedTask3[0].title).toBe(task3.title);
        expect(fetchedTask3[0].spaceId).toBe(space2Id);
        const fetchedTask4 = response.filter((task) => task.id === task4.id);
        expect(fetchedTask4.length).toBe(1);
        expect(fetchedTask4[0].title).toBe(task4.title);
        expect(fetchedTask4[0].spaceId).toBe(space2Id);
    }

    @Test('Get prev and next task Id')
    async getPrevAndNextTaskId(): Promise<void> {
        this.logger.debug('Creating user and folder');
        const {folder, jwtToken, workflowDB} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('Creating first task');
        const {body: task1} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task1.prevTaskId).toBeNull();
        expect(task1.nextTaskId).toBeNull();
        this.logger.debug('Initial task created with no previous or next task');

        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('Creating second task');
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Fetching first task details');
        const {body: task1Response} = await this.get(
            `${task1.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task1Response.prevTaskId).toBeDefined();
        expect(task1Response.nextTaskId).toBeNull();
        expect(task1Response.prevTaskId).toBe(task2.id);
        this.logger.debug(`First task details: prevTask ID = ${task1Response.prevTaskId}`);

        this.logger.debug('Fetching second task details');
        const {body: task2Response} = await this.get(
            `${task2.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task2Response.nextTaskId).toBeDefined();
        expect(task2Response.prevTaskId).toBeNull();
        expect(task2Response.nextTaskId).toBe(task1.id);
        this.logger.debug(`Second task details: nextTask ID = ${task2Response.nextTaskId}`);

        const fakeTask3 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('Creating third task');
        const {body: task3} = await this.post(``, fakeTask3, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Fetching third task details');
        const {body: task3Response} = await this.get(
            `${task3.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task3Response.nextTaskId).toBeDefined();
        expect(task3Response.prevTaskId).toBeNull();
        expect(task3Response.nextTaskId).toBe(task2.id);
        this.logger.debug(`Third task details: nextTask ID = ${task3Response.nextTaskId}`);

        this.logger.debug('Fetching second task details again');
        const {body: task2Resp} = await this.get(
            `${task2.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task2Resp.nextTaskId).toBeDefined();
        expect(task2Resp.prevTaskId).toBeDefined();
        expect(task2Resp.prevTaskId).toBe(task3.id);
        expect(task2Resp.nextTaskId).toBe(task1.id);
        this.logger.debug(`Second task details (revisited): prevTask ID = ${task2Resp.prevTaskId}, nextTask ID = ${task2Resp.nextTaskId}`);

        this.logger.debug('no view passed no return of prev and next task');
        const {body: task2RespWithOutView} = await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(task2RespWithOutView.prevTaskId).toBeNull();
        expect(task2RespWithOutView.nextTaskId).toBeNull();

        await this.post(
            `/folder/views/${folder.id}`,
            [
                {name: FolderViewOptions.BOARD, index: 1},
                {name: FolderViewOptions.LIST, index: 2},
                {name: FolderViewOptions.GANTT, index: 3},
            ],
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: task2RespList} = await this.get(
            `${task2.id}/folder/${folder.id}?view=${FolderViewOptions.LIST}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task2RespList.nextTaskId).toBeDefined();
        expect(task2RespList.prevTaskId).toBeDefined();
        expect(task2RespList.prevTaskId).toBe(task3.id);
        expect(task2RespList.nextTaskId).toBe(task1.id);

        const {body: task2RespGantt} = await this.get(
            `${task2.id}/folder/${folder.id}?view=${FolderViewOptions.GANTT}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task2RespGantt.nextTaskId).toBeDefined();
        expect(task2RespGantt.prevTaskId).toBeDefined();
        expect(task2RespGantt.prevTaskId).toBe(task3.id);
        expect(task2RespGantt.nextTaskId).toBe(task1.id);
        this.logger.debug('Create a new Task in 2nd workflow state');
        const workflowStates = await this.workflowStateFactory.repository.find({where: {workflowId: workflowDB.id}});
        const fakeTask4 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('Creating forth task in 2nd workflow state');
        const {body: task4} = await this.post(
            ``,
            {
                ...fakeTask4,
                workflowStateId: workflowStates[1].id,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        this.logger.debug('Fetching forth task details');
        const {body: task4Response} = await this.get(
            `${task4.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task4Response.prevTaskId).toBeNull();
        expect(task4Response.nextTaskId).toBeNull();

        const fakeTask5 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task5} = await this.post(``, fakeTask5, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const fakeTask6 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task6} = await this.post(``, fakeTask6, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const moveTaskDto: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workflowStates[0].id,
            index: 0,
            view: FolderViewOptions.BOARD,
            parentTaskNewId: task5.id,
        };
        this.logger.debug('patch request should fail with a not found error instead of type error');
        await this.patch(`position/${task6.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const {body: task5DB} = await this.get(`${task5.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(task5DB).toBeDefined();
        expect(task5DB.id).toBe(task5.id);

        this.logger.debug('Creating more tasks');
        const fakeTask7 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task7} = await this.post(``, {...fakeTask7, workflowStateId: workflowStates[2].id}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const fakeTask8 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task8} = await this.post(``, {...fakeTask8, workflowStateId: workflowStates[2].id}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const fakeTask9 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task9} = await this.post(``, {...fakeTask9, workflowStateId: workflowStates[2].id}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        const {body: task7RespBoard} = await this.get(
            `${task7.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task7RespBoard.prevTaskId).toBe(task8.id);
        expect(task7RespBoard.nextTaskId).toBeNull();

        const {body: task8RespBoard} = await this.get(
            `${task8.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task8RespBoard.prevTaskId).toBe(task9.id);
        expect(task8RespBoard.nextTaskId).toBe(task7.id);

        const {body: task9RespBoard} = await this.get(
            `${task9.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task9RespBoard.prevTaskId).toBeNull();
        expect(task9RespBoard.nextTaskId).toBe(task8.id);

        const repoTaskPosition = this.dataSource.getRepository(TaskPositionEntity);
        const repoTaskRelation = this.dataSource.getRepository(TaskRelationEntity);
        const taskRelation = await repoTaskRelation.findOne({
            where: {
                folderId: folder.id,
                workflowStateId: workflowStates[2].id,
                childTaskId: task8.id,
            },
        });
        await repoTaskPosition.delete({
            folderId: folder.id,
            workflowStateId: workflowStates[2].id,
            view: FolderViewOptions.BOARD,
            taskRelationId: taskRelation.id,
        });

        const {body: task9RespBoardUp} = await this.get(
            `${task9.id}/folder/${folder.id}?view=${FolderViewOptions.BOARD}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(task9RespBoardUp.prevTaskId).toBeNull();
        expect(task9RespBoardUp.nextTaskId).toBe(task7.id);
    }

    /**
     * Archives a task by creating a user, folder, and task, and then archiving the task.
     *
     * @returns {Promise<void>} A Promise that resolves to undefined.
     */
    @Test('Archive Task')
    async archiveTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const approvalDeletePromise = enqueueEventAndGetPromise(
            {entityId: task.id},
            this.approvalApiConnectorService,
            (job, data) => +job?.data?.entityId === +data?.entityId
        );
        this.logger.debug('archive task by id');
        await this.post(`archive/${task.id}/folder/${folder.id}`, {archiveReason: 'Archive this Task'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const job = await approvalDeletePromise;
        expect(job).toBeDefined();
        expect(+job.data.entityId).toBe(+task.id);

        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
    }

    @Test('Archive - Unarchive tasks should modify folder dates accordingly')
    async archiveUnarchiveTaskModifyFolderDates(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.endDate = moment(fakeTask.startDate).add(5, 'days').toDate();
        fakeTask.duration = moment(fakeTask.endDate).diff(moment(fakeTask.startDate), 'days');
        const fakeLaterTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeLaterTask.startDate = moment(fakeTask.endDate).add(10, 'days').toDate();
        fakeLaterTask.endDate = moment(fakeLaterTask.startDate).add(10, 'days').toDate();
        fakeLaterTask.duration = moment(fakeLaterTask.endDate).diff(moment(fakeLaterTask.startDate), 'days');

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        await this.post(``, fakeLaterTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('check folder start and endDate');
        const {body: folderDB} = await this.get(`/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(moment(folderDB.startDate).toISOString()).toBeDateEqualWithoutMilliseconds(moment(fakeTask.startDate).toISOString());
        expect(moment(folderDB.endDate).toISOString()).toBeDateEqualWithoutMilliseconds(moment(fakeLaterTask.endDate).toISOString());
        this.logger.debug('archive task by id');
        await this.post(`archive/${task.id}/folder/${folder.id}`, {archiveReason: 'Archive this Task'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        this.logger.debug('check folder start and endDate after archive');
        const {body: folderDB2} = await this.get(`/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(folderDB2.startDate).toBeDateEqualWithoutMilliseconds(moment(fakeLaterTask.startDate).toISOString());
        expect(moment(folderDB2.endDate).toISOString()).toBeDateEqualWithoutMilliseconds(moment(fakeLaterTask.endDate).toISOString());
        this.logger.debug('restore earlier task');
        await this.post(`archive/restore/${task.id}/folder/${folder.id}`, {childrenTaskIds: []}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        this.logger.debug('check folder start and endDate after unarchive');
        const {body: folderDB3} = await this.get(`/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(folderDB3.startDate).toBeDateEqualWithoutMilliseconds(moment(fakeTask.startDate).toISOString());
        expect(moment(folderDB3.endDate).toISOString()).toBeDateEqualWithoutMilliseconds(moment(fakeLaterTask.endDate).toISOString());
    }

    /**
     * Archives and unarchive task by creating a user, folder, and task, and then archiving the task to check actions.
     *
     * @returns {Promise<void>} A Promise that resolves to undefined.
     */
    @Test('Archive and UnArchive Tasks')
    async archiveAndUnArchiveTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create 2 sub tasks');
        const fakeSubTask1 = this.factory.fakeCreateTask(userId, folder.id, task.id);
        const fakeSubTask2 = this.factory.fakeCreateTask(userId, folder.id, task.id);
        const {body: subTask1} = await this.post(``, fakeSubTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: subTask2} = await this.post(``, fakeSubTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('first archive subtask 2');
        await this.post(`archive/${subTask2.id}/folder/${folder.id}`, {archiveReason: 'Archive this Task'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        this.logger.debug('archive task by id');
        await this.post(`archive/${task.id}/folder/${folder.id}`, {archiveReason: 'Archive this Task'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        this.logger.debug('all three tasks should be archived');
        const repo = this.dataSource.getRepository(TaskEntity);
        const taskDb = await repo.findOneBy({id: task.id, archivedWhy: 'Archive this Task'});
        const subtask1Db = await repo.findOneBy({id: subTask1.id, archivedWhy: 'Archive this Task'});
        const subtask2Db = await repo.findOneBy({id: subTask2.id, archivedWhy: 'Archive this Task'});
        const taskArray = [taskDb, subtask1Db, subtask2Db];
        expect(taskArray.every((t) => t.archivedAt != null)).toBeTruthy();

        this.logger.debug('Verify task actions');
        const {body: taskAction} = await this.post(`/task-action/folder/${folder.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(taskAction).toBeDefined();
        expect(taskAction.data.length).toBe(5); //each subtask creation updates the parent task creating actions
        const created = taskAction.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.CREATE && x.taskId === task.id
        );
        expect(created).toBeDefined();
        const taskFound = created.parameters?.create;
        expect(taskFound.title).toBe(task.title);
        const archived = taskAction.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.ARCHIVE && x.taskId === task.id
        );
        expect(archived).toBeDefined();

        const subtask1DbBeforeRestore = await repo.findOneBy({id: subTask1.id});
        const subtask2DbBeforeRestore = await repo.findOneBy({id: subTask2.id});
        expect(subtask1DbBeforeRestore.archivedGroupId).not.toBeNull();
        expect(subtask2DbBeforeRestore.archivedGroupId).not.toBeNull();
        expect(subtask1DbBeforeRestore.archivedGroupId).not.toBe(subtask2DbBeforeRestore.archivedGroupId);

        this.logger.debug('Restore task');
        const restoreTaskDto: RestoreTaskDto = {
            childrenTaskIds: [subtask1Db.id],
        };
        await this.post(`archive/restore/${task.id}/folder/${folder.id}`, restoreTaskDto, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: taskAction2} = await this.post(`/task-action/folder/${folder.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(taskAction2).toBeDefined();
        expect(taskAction2.data.length).toBe(6);
        const unarchived = taskAction2.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.UNARCHIVE && x.taskId === task.id
        );
        expect(unarchived).toBeDefined();

        this.logger.debug('Only task and subtask 1 should be restore');
        const taskDb2 = await repo.findOneBy({id: task.id});
        const subtask1Db2 = await repo.findOneBy({id: subTask1.id});
        const subtask2Db2 = await repo.findOneBy({id: subTask2.id});
        expect(taskDb2.archivedAt).toBeNull();
        expect(subtask1Db2.archivedAt).toBeNull();
        expect(subtask2Db2.archivedAt).not.toBeNull();
    }

    /**
     * Archives and delete task by creating a user, folder, and task.
     *
     * @returns {Promise<void>} A Promise that resolves to undefined.
     */
    @Test('Get Archived Deleted Tasks Subtasks')
    async getArchivedDeletedTasksSubtasks(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create 2 sub tasks');
        const fakeSubTask1 = this.factory.fakeCreateTask(userId, folder.id, task1.id);
        const fakeSubTask2 = this.factory.fakeCreateTask(userId, folder.id, task1.id);
        const {body: subTask1} = await this.post(``, fakeSubTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: subTask2} = await this.post(``, fakeSubTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('first archive task');
        await this.post(`archive/${task1.id}/folder/${folder.id}`, {archiveReason: 'Archive this Task'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        this.logger.debug('all three tasks should be archived');
        const repo = this.dataSource.getRepository(TaskEntity);
        const taskDb = await repo.findOneBy({id: task1.id});
        const subtask1Db = await repo.findOneBy({id: subTask1.id});
        const subtask2Db = await repo.findOneBy({id: subTask2.id});
        const taskArray = [taskDb, subtask1Db, subtask2Db];
        expect(taskArray.every((t) => t.archivedAt != null)).toBeTruthy();

        this.logger.debug('get archived task with children');
        const {body: archivedTask} = await this.get(
            `${task1.id}/folder/${folder.id}?show-archived-children=true`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(archivedTask).toBeDefined();
        expect(archivedTask.children).toHaveLength(2);
        const archivedSubtask1 = archivedTask.children.find((s) => s.id === subTask1.id);
        expect(archivedSubtask1).toBeDefined();
        expect(archivedSubtask1.title).toBe(subTask1.title);
        const archivedSubtask2 = archivedTask.children.find((s) => s.id === subTask2.id);
        expect(archivedSubtask2).toBeDefined();
        expect(archivedSubtask2.title).toBe(subTask2.title);

        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create 2 sub tasks');
        const fakeSubTask3 = this.factory.fakeCreateTask(userId, folder.id, task2.id);
        const fakeSubTask4 = this.factory.fakeCreateTask(userId, folder.id, task2.id);
        const {body: subTask3} = await this.post(``, fakeSubTask3, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: subTask4} = await this.post(``, fakeSubTask4, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('first delete task');
        await this.delete(`delete/${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('all three tasks should be deleted');
        const taskDb2 = await repo.findOneBy({id: task2.id});
        const subtask3Db = await repo.findOneBy({id: subTask3.id});
        const subtask4Db = await repo.findOneBy({id: subTask4.id});
        const taskArray2 = [taskDb2, subtask3Db, subtask4Db];
        expect(taskArray2.every((t) => t.deletedAt != null)).toBeTruthy();

        this.logger.debug('get deleted task with children');
        const {body: deletedTask} = await this.get(
            `${task2.id}/folder/${folder.id}?show-deleted-children=true`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(deletedTask).toBeDefined();
        expect(deletedTask.children).toHaveLength(2);
        const deleteSubtask1 = deletedTask.children.find((s) => s.id === subTask3.id);
        expect(deleteSubtask1).toBeDefined();
        expect(deleteSubtask1.title).toBe(subTask3.title);
        const deleteSubtask2 = deletedTask.children.find((s) => s.id === subTask4.id);
        expect(deleteSubtask2).toBeDefined();
        expect(deleteSubtask2.title).toBe(subTask4.title);
    }

    /**
     * Restores an archived task.
     *
     * This method performs the following steps:
     *
     * 1. Creates a user and folder.
     * 2. Retrieves the payload containing the created folder and JWT token.
     * 3. Extracts the user ID from the JWT token.
     * 4. Generates a fake task using the user ID and folder ID.
     * 5. Sends a POST request to create the task, using the generated fake task and JWT token for authentication.
     * 6. Archives the task by sending a DELETE request with the task ID and folder ID.
     * 7. Verifies that the task is archived by sending a GET request and checking the response status code.
     * 8. Restores the archived task by sending a POST request with the task ID and folder ID.
     * 9. Retrieves the response payload, which contains the restored task.
     * 10. Verifies that the restored task's ID matches the original task's ID.
     *
     * @returns {Promise<void>} A promise that resolves once the archived task is restored.
     */
    @Test('Restore Archived Task')
    async restoreArchivedTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('archive task by id');
        await this.post(`archive/${task.id}/folder/${folder.id}`, {archiveReason: ''}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        this.logger.debug('restore archived task by id');
        await this.post(`archive/restore/${task.id}/folder/${folder.id}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: response} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.id).toBe(task.id);
    }

    /**
     * Restores a deleted task.
     *
     * This method performs the following steps:
     *
     * 1. Creates a user and folder.
     * 2. Retrieves the payload containing the created folder and JWT token.
     * 3. Extracts the user ID from the JWT token.
     * 4. Generates a fake task using the user ID and folder ID.
     * 5. Sends a POST request to create the task, using the generated fake task and JWT token for authentication.
     * 6. Archives the task by sending a DELETE request with the task ID and folder ID.
     * 7. Verifies that the task is archived by sending a GET request and checking the response status code.
     * 8. Restores the deleted task by sending a POST request with the task ID and folder ID.
     * 9. Retrieves the response payload, which contains the restored task.
     * 10. Verifies that the restored task's ID matches the original task's ID.
     *
     * @returns {Promise<void>} A promise that resolves once the archived task is restored.
     */
    @Test('Restore Deleted Task')
    async restoreDeletedTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create a task tree');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const fakeSubTask = this.factory.fakeCreateTask(userId, folder.id, task.id);
        const {body: subTask} = await this.post(``, fakeSubTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const fakeSubSubTask = this.factory.fakeCreateTask(userId, folder.id, subTask.id);
        const {body: subSubTask} = await this.post(``, fakeSubSubTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('delete task by id');
        await this.delete(`delete/${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        await this.get(`${subTask.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        await this.get(`${subSubTask.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);

        this.logger.debug('restore sub tasks and sub-sub task');
        await this.post(
            `delete/restore/${subTask.id}/folder/${folder.id}`,
            {childrenTaskIds: [subSubTask.id]},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        const {body: response} = await this.get(`${subTask.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.id).toBe(subTask.id);
        const {body: response2} = await this.get(`${subSubTask.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response2.id).toBe(subSubTask.id);
    }

    /**
     * Retrieves multiple archived tasks.
     *
     * @returns {Promise<void>} A promise that resolves when the operation is complete.
     */
    @Test('Get Many Archived Tasks')
    async getManyArchiveTasks(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('archive tasks');
        await this.post(`archive/${task1.id}/folder/${folder.id}`, {archiveReason: 'Archive Task'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        await this.post(`archive/${task2.id}/folder/${folder.id}`, {archiveReason: 'Archive Task'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        this.logger.debug('get all archived tasks');
        const {body: response} = await this.get(`many/archive`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.length).toBeGreaterThanOrEqual(1);
    }

    /**
     * Updates a task by creating a user and folder, creating a fake task with the user and folder IDs,
     * then updating the task with fake update task data.
     *
     * @return {Promise<void>} A promise that resolves when the task has been updated successfully.
     */
    @Test('Update Task')
    async updateTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.startDate = moment().add(1, 'days').toDate();
        fakeTask.endDate = moment().add(2, 'days').toDate();
        fakeTask.effort = 0;
        fakeTask.duration = 1;
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate);
        expect(task.endDate).toBeDateEqualWithoutMilliseconds(fakeTask.endDate);
        expect(task.taskType).toBe(fakeTask.taskType);
        await this.delete(`unfollow/${folder.id}/${task.id}/${userId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('update task');
        this.logger.debug('create tag');
        const tag1 = await this.tagFactory.createTag(userId, null);
        const fakeUpdateTask = this.factory.fakeUpdateTask(folder.id);
        fakeUpdateTask.startDate = moment().add(10, 'days').toDate();
        fakeUpdateTask.endDate = moment().add(12, 'days').toDate();
        fakeUpdateTask.effort = 0;
        fakeUpdateTask.duration = 1;
        fakeUpdateTask['userProminentTagId'] = tag1.id;
        const tag2 = await this.tagFactory.createTag(userId, null);
        fakeUpdateTask['commonProminentTagId'] = tag2.id;
        fakeUpdateTask.description = faker.string.alphanumeric(100);
        fakeUpdateTask.taskType = TaskTypeOptions.BUG;
        await this.patch(`${task.id}`, fakeUpdateTask, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('get updated task');
        const {body: response} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.title).toBe(fakeUpdateTask.title);
        expect(response.description).toBe(fakeUpdateTask.description);
        expect(response.startDate).toBeDateEqualWithoutMilliseconds(fakeUpdateTask.startDate);
        expect(response.endDate).toBeDateEqualWithoutMilliseconds(fakeUpdateTask.endDate);
        expect(response.taskType).toBe(fakeUpdateTask.taskType);
        expect(response.showOn).toHaveLength(2);
        expect(response.showOn).toContain(TASK_MANAGEMENT);
        expect(response.showOn).toContain(FINANCIAL_OUTLOOK);
        this.logger.debug('update only start date , should not affect end date');
        const newStartDate = moment(fakeUpdateTask.endDate).subtract(1, 'days').toDate();
        await this.patch(
            `${task.id}`,
            {
                startDate: newStartDate,
                folderId: folder.id,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        const {body: response2} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response2.startDate).toBeDateEqualWithoutMilliseconds(newStartDate);
        expect(response2.endDate).toBeDateEqualWithoutMilliseconds(fakeUpdateTask.endDate);
        this.logger.debug('update with start date > end date should throw 400 exception');
        await this.patch(
            `${task.id}`,
            {startDate: moment(fakeUpdateTask.endDate).add(1, 'days').toDate(), folderId: folder.id},
            jwtToken.accessToken
        ).expect(HttpStatus.BAD_REQUEST);
        const {body: taskAction} = await this.post(`/task-action/folder/${folder.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(taskAction).toBeDefined();
        expect(taskAction.metadata.totalRecords).toBe(3);
        expect(taskAction.metadata.unreadRecords).toBe(3);
        expect(taskAction.data).toHaveLength(3);
        const updateAction = taskAction.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.UPDATE && x.taskId === task.id
        );
        expect(updateAction).toBeDefined();
        const descriptionProp = updateAction.parameters.updates.find((update) => update.property === 'description');
        expect(descriptionProp).toBeDefined();
        expect(descriptionProp.oldValue).toBe(task.description);
        expect(descriptionProp.newValue).toBe(response.description);

        this.logger.debug('Single request to remove prominent tag should work');
        await this.patch(
            `${task.id}`,
            {
                folderId: folder.id,
                commonProminentTagId: null,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        const check = await this.dataSource
            .getRepository(TagTaskFolderEntity)
            .findOneBy({taskId: task.id, type: TagTaskFolderTypeOptions.COMMON_PROMINENT_TAG});
        expect(check).toBeNull();
    }

    /**
     * Updates a task by creating a user and folder, creating a fake task with the user and folder IDs,
     * then updating the task with fake update task data.
     *
     * @return {Promise<void>} A promise that resolves when the task has been updated successfully.
     */
    @Test('Update Task End Date')
    async updateTaskEndDAte(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create parent task');
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id, undefined, undefined, undefined, undefined, true);
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeUpdateTask1 = this.factory.fakeUpdateTask(folder.id);
        delete fakeUpdateTask1.startDate;
        delete fakeUpdateTask1.duration;
        fakeUpdateTask1['endDate'] = faker.date.between({from: folder.startDate, to: folder.endDate});
        await this.patch(`${task1.id}`, fakeUpdateTask1, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('create child task');
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id, task1.id, undefined, undefined, undefined, true);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const fakeUpdateTask2 = this.factory.fakeUpdateTask(folder.id);
        fakeUpdateTask2['endDate'] = faker.date.between({from: fakeUpdateTask1.endDate, to: folder.endDate});
        delete fakeUpdateTask2.startDate;
        delete fakeUpdateTask2.duration;

        await this.patch(`${task2.id}`, fakeUpdateTask2, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('get updated task');
        const {body: response} = await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.id).toBe(task2.id);
        expect(response.title).toBe(fakeUpdateTask2.title);
        expect(response.endDate).toBeDateEqualWithoutMilliseconds(fakeUpdateTask2.endDate);

        this.logger.debug('Update task end date only');
        await this.patch(
            `${task2.id}`,
            {folderId: folder.id, endDate: faker.date.future({years: 1, refDate: task2.endDate})},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        this.logger.debug('Task update in task action should not contain null value in the JSON array');
        const allTaskAction = await this.getDataSource()
            .getRepository(TaskActionEntity)
            .find({where: {taskId: task2.id, action: TaskActionOptions.UPDATE}});
        expect(allTaskAction).toHaveLength(2);
        expect(
            allTaskAction.every((actions) => actions.parameters.updates.every((action) => action !== null && action !== undefined))
        ).toBeTruthy();
    }

    @Test('Update task importance')
    async updateTaskImportance(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task).toBeDefined();
        const allImportance = await this.dataSource.getRepository(ImportanceEntity).find();
        expect(allImportance.length).toBeGreaterThan(1);
        const updateImportanceId = allImportance.find((el) => el.id !== task.importanceId)?.id;
        expect(updateImportanceId).toBeDefined();

        this.logger.debug('Update importance');
        const {body: updateTaskReponse} = await this.patch(
            `automation/importance/${task.id}`,
            {importanceId: updateImportanceId},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(updateTaskReponse).toBeDefined();

        const {body: updatedTask} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(updatedTask.importanceId).toBe(updateImportanceId);
    }

    @Test('Update Task Start Date')
    async updateTaskStartDate(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        delete fakeTask.duration;
        fakeTask.endDate = null;
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeUpdateTask = this.factory.fakeUpdateTask(folder.id);
        fakeUpdateTask.startDate = moment().add(10, 'days').toDate();
        delete fakeUpdateTask.duration;
        delete fakeUpdateTask.endDate;
        await this.patch(`${task.id}`, fakeUpdateTask, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: response} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.startDate).toBeDateEqualWithoutMilliseconds(fakeUpdateTask.startDate);
        this.logger.debug('updating task to earler than start date of folder');
        const earlierStartDate = moment.utc(folder.startDate).subtract(1, 'days').toDate();
        await this.patch(`${task.id}`, {startDate: earlierStartDate, folderId: folder.id}, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: response2} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response2.startDate).toBeDateEqualWithoutMilliseconds(earlierStartDate);
    }

    @Test('Update task importance with notification')
    async updateTaskImportanceWithNotification(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const {token: jwtToken2} = await this.userSuite.createSuperAdminUser();
        const userId2 = this.getUserIdFromAccessToken(jwtToken2.accessToken);

        const updateMembersDto = {
            insert: [{id: userId2, userPermission: UserPermissionOptions.FULL}],
            update: [],
            delete: [],
        };
        await this.patch(`/space/${spaceId}/members`, updateMembersDto, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task).toBeDefined();
        this.logger.debug('add user to assignees');
        const taskAssigneeDto: TaskAssigneesDto = {assignees: [userId2, userId], folderId: folder.id};
        await this.patch(`assignees/${task.id}`, taskAssigneeDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const allImportance = await this.dataSource.getRepository(ImportanceEntity).find();
        expect(allImportance.length).toBeGreaterThan(1);
        const updateImportanceId = allImportance.find((el) => el.id !== task.importanceId)?.id;
        expect(updateImportanceId).toBeDefined();

        const notifcationPromise = enqueueEventAndGetPromise(
            {taskId: task.id, event: TaskEventNameOptions.TASK_UPDATE},
            this.notificationApiConnectorService,
            (job, data) => job?.data?.data?.taskId === data?.taskId && job?.data?.eventName === data?.event
        );

        this.logger.debug('Update importance');
        await this.patch(`${task.id}`, {folderId: folder.id, importanceId: updateImportanceId}, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: updatedTask} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(updatedTask.importanceId).toBe(updateImportanceId);

        const notifData = await notifcationPromise;
        expect(notifData).toBeDefined();
        expect(notifData.data.data.taskId).toBe(task.id);
        expect(notifData.data.data.updates).toHaveLength(1);
        expect(+notifData.data.data.updates[0].newValue).toBe(+updateImportanceId);
    }

    /**
     * Updates a task by creating a user and folder, creating a fake task with the user and folder IDs,
     * then updating the task with fake update task data.
     *
     * @return {Promise<void>} A promise that resolves when the task has been updated successfully.
     */
    @Test('Update Child Task')
    async updateChildTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create parent task');
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('create child task');
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id, task1.id);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('update task');
        const fakeUpdateTask = this.factory.fakeUpdateTask(folder.id);
        fakeUpdateTask['complete'] = 10;
        await this.patch(`${task2.id}`, fakeUpdateTask, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('get updated task');
        const {body: response} = await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.title).toBe(fakeUpdateTask.title);
        expect(response.description).toBe(fakeUpdateTask.description);
    }

    /**
     * Updates the assignee of a task.
     *
     * This method performs the following steps:
     * 1. Creates a user and folder.
     * 2. Retrieves the user ID from the JWT token.
     * 3. Creates a fake task with the user ID and folder ID.
     * 4. Sends a POST request to create the task.
     * 5. Sends a PATCH request to update the assignee of the task.
     * 6. Retrieves the updated task and folder details.
     * 7. Asserts that the assignee of the task is updated correctly.
     *
     * @returns {Promise<void>} A Promise that resolves once the assignee is updated.
     */
    @Test('Remove Assignee with Comment and User Action assigned')
    async updateTaskAssigneeOne(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.id).toBeDefined();

        this.logger.debug('create comment');
        const fakeComment = this.taskActionFactory.fakeComment();
        const {body: comment} = await this.post(
            `/task-action/folder/${folder.id}/task/${task.id}/comment`,
            fakeComment,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(comment.identifiers[0].id).toBeDefined();
        const commentId = comment.identifiers[0].id;

        this.logger.debug('Assign comment to user');
        const addAssigneeDto: CreateTaskActionAssigneeDto = {userId};
        await this.post(`/task-action-assignee/task-action/${commentId}`, addAssigneeDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Verify comment is assigned and user action was created');
        const {body: taskActionAssigneeResponse} = await this.get(
            `/task-action-assignee/task-action/${commentId}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(taskActionAssigneeResponse.id).toBeDefined();
        expect(taskActionAssigneeResponse).toEqual(expect.objectContaining({userId, taskActionId: commentId}));

        const {body: userActionResponse} = await this.get(`/user-actions/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(userActionResponse).toHaveLength(1);
        expect(userActionResponse[0].userId).toBe(userId);
        expect(userActionResponse[0].taskActionAssigneeId).toBe(taskActionAssigneeResponse.id);

        this.logger.debug('add user to assignees');
        const taskAssigneeDto: TaskAssigneesDto = {assignees: [userId], folderId: folder.id};
        await this.patch(`assignees/${task.id}`, taskAssigneeDto, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: response} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response.assignees.length).toBe(1);
        expect(response.assignees[0]).toBe(userId);

        this.logger.debug('remove user from assignees should succeed');
        const removeTaskAssigneeDto: TaskAssigneesDto = {assignees: [], folderId: folder.id};
        await this.patch(`assignees/${task.id}`, removeTaskAssigneeDto, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: response2} = await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response2.assignees.length).toBe(0);
    }

    /**
     * Updates assignees of multiple tasks.
     *
     * @returns {Promise<void>} - A promise that resolves when the update is complete.
     */
    @Test('Update assignees of multiple tasks')
    async updateManyTasks(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const updateManyTaskDto: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    assignees: [userId],
                    folderId: folder.id,
                },
                {
                    id: task2.id,
                    assignees: [userId],
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        await this.patch(`many/update`, updateManyTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: response1} = await this.get(`${task1.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: response2} = await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response1.assignees[0]).toBe(userId);
        expect(response2.assignees[0]).toBe(userId);
    }

    @Test('Update tags for tasks')
    async updateManyTasksTags(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        this.logger.debug('create another user');
        const {
            moduleUser: {id: userId2},
        } = await this.userSuite.createModuleUser();

        this.logger.debug('create three tags');
        const tag1 = await this.tagFactory.createTag(null, spaceId);
        const tag2 = await this.tagFactory.createTag(userId, spaceId);
        const tag3 = await this.tagFactory.createTag(userId, spaceId);
        const user2Tag = await this.tagFactory.createTag(userId2, spaceId);

        this.logger.debug('create tasks');
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('add tag1 to task 1, tag2 and 3 to task 2');

        this.logger.debug('Request should fail if the personal tag does not belong to the user');
        const updateFailDto: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    tagIds: [user2Tag.id],
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        const {body: notFoundResponse1} = await this.patch(`many/update`, updateFailDto, jwtToken.accessToken).expect(
            HttpStatus.BAD_REQUEST
        );
        expect(notFoundResponse1.message).toBe(`Tag ( Id: ${user2Tag.id} ) is invalid.`);

        const updateManyTaskDto: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    tagIds: [tag1.id],
                    folderId: folder.id,
                },
                {
                    id: task2.id,
                    tagIds: [tag2.id, tag3.id],
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };

        this.logger.debug('Request should fail if a common tag is not added to the folder first');
        const {body: notFoundResponse2} = await this.patch(`many/update`, updateManyTaskDto, jwtToken.accessToken).expect(
            HttpStatus.NOT_FOUND
        );
        expect(notFoundResponse2.message).toBe(`Tag ( Id: ${tag1.id} ) does not exist in folder ( Id: ${folder.id} ).`);

        this.logger.debug('Add tags to folders');
        await this.patch(`/folder/${folder.id}/space/${spaceId}`, {tags: {insert: [tag1.id]}}, jwtToken.accessToken).expect(HttpStatus.OK);

        await this.patch(`many/update`, updateManyTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('Validate tags in tasks after 1 update');
        const {body: response1} = await this.get(`${task1.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response1.tags).toHaveLength(1);
        expect(response1.tags[0]).toBe(tag1.id);
        const {body: response2} = await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response2.tags).toHaveLength(2);
        expect(response2.tags).toEqual(expect.arrayContaining([tag2.id, tag3.id]));

        this.logger.debug('Update tags in both tasks');
        const updateManyTaskDto2: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    tagIds: [tag2.id, tag3.id],
                    folderId: folder.id,
                },
                {
                    id: task2.id,
                    tagIds: [],
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        await this.patch(`many/update`, updateManyTaskDto2, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('Validate tags in tasks after 2 update');
        const {body: response3} = await this.get(`${task1.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response3.tags).toHaveLength(2);
        expect(response3.tags).toEqual(expect.arrayContaining([tag2.id, tag3.id]));
        const {body: response4} = await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(response4.tags).toHaveLength(0);

        this.logger.debug('Validate task actions');
        const {body: taskActionResponse1} = await this.post(
            `/task-action/folder/${folder.id}/task/${task1.id}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const labelActions = taskActionResponse1.data.filter(
            (el) => el.action === TaskActionOptions.TAG_ADDED || el.action === TaskActionOptions.TAG_REMOVED
        );
        expect(labelActions).toHaveLength(2);
        expect(taskActionResponse1.data.filter((el) => el.action === TaskActionOptions.TAG_ADDED)).toHaveLength(1); // adding personal tags should not have logs generated
        expect(taskActionResponse1.data.filter((el) => el.action === TaskActionOptions.TAG_REMOVED)).toHaveLength(1);
        const {body: taskActionResponse2} = await this.post(
            `/task-action/folder/${folder.id}/task/${task2.id}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const labelActions2 = taskActionResponse2.data.filter(
            (el) => el.action === TaskActionOptions.TAG_ADDED || el.action === TaskActionOptions.TAG_REMOVED
        );
        expect(labelActions2).toHaveLength(0); // adding or removing personal tags should not have logs generated

        this.logger.debug('Update should fail...');
        this.logger.debug('...invalid tag id');
        const invalidTagId = 99999;
        const failUpdateDto1: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    tagIds: [invalidTagId], // invalid Id
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        const {body: failResponse} = await this.patch(`many/update`, failUpdateDto1, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        expect(failResponse.message).toBe(`Tag ( Id: ${invalidTagId} ) does not exist in database.`);

        this.logger.debug('...tag not in folder');
        const tag4 = await this.tagFactory.createTag(undefined, spaceId);
        const failUpdateDto2: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    tagIds: [tag4.id], // not assigned to folder
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        const {body: failResponse2} = await this.patch(`many/update`, failUpdateDto2, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);
        expect(failResponse2.message).toBe(`Tag ( Id: ${tag4.id} ) does not exist in folder ( Id: ${folder.id} ).`);
    }

    @Test('Update custom fields for tasks')
    async updateManyTasksCustomFields(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        this.logger.debug('create two custom fields');
        const fakeCf1 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition();
        const fakeCf2 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition();

        this.logger.debug('Add cfs to space and folders');
        const spaceCustomFields = {insert: [fakeCf1, fakeCf2]};
        await this.patch(`/space/${spaceId}`, {spaceCustomFields}, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: spaceDB} = await this.get(`/space/${spaceId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(spaceDB.spaceCustomFields).toHaveLength(2);
        const [cf1, cf2] = spaceDB.spaceCustomFields;

        await this.patch(
            `/folder/${folder.id}/space/${spaceId}`,
            {
                customFieldValues: {
                    insert: [
                        {
                            id: cf1.id,
                            value: '',
                        },
                        {
                            id: cf2.id,
                            value: '',
                        },
                    ],
                },
            },
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        this.logger.debug('create tasks');
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Update custom fields value in tasks');
        const taskOneValueOne = faker.string.alphanumeric(20);
        const taskOneValueTwo = faker.string.alphanumeric(20);
        const taskTwoValueOne = faker.string.alphanumeric(20);
        const taskTwoValueTwo = faker.string.alphanumeric(20);

        const updateManyTaskDto: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    customFields: [
                        {customFieldDefinitionId: cf1.id, value: taskOneValueOne},
                        {customFieldDefinitionId: cf2.id, value: taskOneValueTwo},
                    ],
                    folderId: folder.id,
                },
                {
                    id: task2.id,
                    customFields: [
                        {customFieldDefinitionId: cf1.id, value: taskTwoValueOne},
                        {customFieldDefinitionId: cf2.id, value: taskTwoValueTwo},
                    ],
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        await this.patch(`many/update`, updateManyTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('Verify updates');
        const manager = this.dataSource.manager;
        const customFieldValueRepo = manager.getRepository(CustomFieldValueEntity);
        const allCFVs = await customFieldValueRepo.find({
            where: {customFieldDefinitionId: In([cf1.id, cf2.id]), taskId: In([task1.id, task2.id])},
        });
        const taskOneCFOne = allCFVs.find((el) => el.taskId === task1.id && el.customFieldDefinitionId === cf1.id);
        const taskOneCFTwo = allCFVs.find((el) => el.taskId === task1.id && el.customFieldDefinitionId === cf2.id);
        const taskTwoCFOne = allCFVs.find((el) => el.taskId === task2.id && el.customFieldDefinitionId === cf1.id);
        const taskTwoCFTwo = allCFVs.find((el) => el.taskId === task2.id && el.customFieldDefinitionId === cf2.id);
        expect(taskOneCFOne).toBeDefined();
        expect(taskOneCFTwo).toBeDefined();
        expect(taskTwoCFOne).toBeDefined();
        expect(taskTwoCFTwo).toBeDefined();
        expect(taskOneCFOne.value).toBe(taskOneValueOne);
        expect(taskOneCFTwo.value).toBe(taskOneValueTwo);
        expect(taskTwoCFOne.value).toBe(taskTwoValueOne);
        expect(taskTwoCFTwo.value).toBe(taskTwoValueTwo);

        this.logger.debug('Create one more custome field');
        const fakeCf3 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition();

        this.logger.debug('Add cf3 to space');
        await this.patch(`/space/${spaceId}`, {spaceCustomFields: {insert: [fakeCf3]}}, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: spaceDB2} = await this.get(`/space/${spaceId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(spaceDB2.spaceCustomFields).toHaveLength(3);
        const [cf3] = spaceDB2.spaceCustomFields.filter((el) => el.id !== cf1.id && el.id !== cf2.id);
        expect(cf3.id).toBeDefined();

        this.logger.debug('Update should fail at validation');
        const fakeId = 9999;
        const updateManyTaskDto2: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    customFields: [{customFieldDefinitionId: fakeId, value: 'Doesnt matter'}],
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        const {body: failResponse1} = await this.patch(`many/update`, updateManyTaskDto2, jwtToken.accessToken).expect(
            HttpStatus.NOT_FOUND
        );
        expect(failResponse1.message).toBe(`Custom Field ( ID: ${fakeId} ) does not exist in database.`);

        const updateManyTaskDto3: UpdateManyTaskDto = {
            tasks: [
                {
                    id: task1.id,
                    customFields: [{customFieldDefinitionId: cf3.id, value: 'Doesnt matter'}],
                    folderId: folder.id,
                },
            ],
            folderId: folder.id,
        };
        const {body: failResponse2} = await this.patch(`many/update`, updateManyTaskDto3, jwtToken.accessToken).expect(
            HttpStatus.NOT_FOUND
        );
        expect(failResponse2.message).toBe(`Custom fields with ID:( ${cf3.id} ) does not exist in the folder: ${folder.id}.`);

        await this.patch(
            `/folder/${folder.id}/space/${spaceId}`,
            {
                customFieldValues: {
                    insert: [
                        {
                            id: cf3.id,
                            value: '',
                        },
                    ],
                },
            },
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
    }

    /**
     * Creates a dependency between two tasks.
     *
     * This method creates a user and a folder, then creates two tasks
     * within the folder. Finally, it creates a dependency between
     * the two tasks.
     *
     * @returns {Promise<void>} A Promise that resolves when the dependency is created.
     */
    @Test('Create Task Dependency')
    async createDependency(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const createDependencyDto: CreateDependencyDto = {
            folderId: folder.id,
            predecessorId: task1.id,
            successorId: task2.id,
            relationType: RelationTypeOptions.START_TO_FINISH,
        };
        this.logger.debug('create dependency');
        await this.post(`dependency/folder/${folder.id}`, createDependencyDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const {body: taskResponse} = await this.get(`${task1.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskResponse.successors[0].taskId).toBe(task2.id);
    }

    @Test('Create Task Dependency on a shared task')
    async createDependencyOnSharedTask(): Promise<void> {
        // 1. Create two folders
        this.logger.debug('create user and folder');
        const {folder: folder1, jwtToken, workflowDB, spaceId} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId);
        await this.folderFactory.getFolderWorkFlow(folder1.id);
        const folder2Workflow = await this.folderFactory.getFolderWorkFlow(folder2.id);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        // 2. Create two tasks in folder 1 and 1 task in folder 2
        const folder1FakeTasks = Array.from({length: 2}, () => this.factory.fakeCreateTask(userId, folder1.id));
        const folder2FakeTask = this.factory.fakeCreateTask(userId, folder2.id);
        //

        //
        this.logger.debug('create tasks');
        const [{body: folder1Task1}, {body: folder1Task2}, {body: folder2Task1}] = await Promise.all([
            ...folder1FakeTasks.map((fakeTask) => this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED)),
            this.post(``, folder2FakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED),
        ]);
        expect(folder1Task1).toBeDefined();
        expect(folder1Task2).toBeDefined();
        expect(folder2Task1).toBeDefined();

        const shareDto: TaskSharedDto = {
            folderId: folder2.id,
            fromFolderId: folder1.id,
            stateId: folder2Workflow.WorkFlowStates[0].id,
        };
        await this.post(`share/${folder1Task1.id}`, shareDto, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const createDependencyDto: CreateDependencyDto = {
            folderId: folder2.id,
            predecessorId: folder2Task1.id,
            successorId: folder1Task1.id,
            relationType: RelationTypeOptions.START_TO_FINISH,
        };
        this.logger.debug('create dependency');
        await this.post(`dependency/folder/${folder2.id}`, createDependencyDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug(
            'update shared task before start date of predecessor in shared folder should result in end date of the predecessor'
        );
        const {body: notShareTask} = await this.get(`${folder2Task1.id}/folder/${folder2.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const fakeUpdateTask = this.factory.fakeUpdateTask(folder1.id);
        fakeUpdateTask.startDate = moment(notShareTask.endDate).subtract(10, 'days').toDate();
        fakeUpdateTask.endDate = moment(fakeUpdateTask.startDate).add(2, 'days').toDate();
        await this.patch(`${folder1Task1.id}`, fakeUpdateTask, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('get task');
        const {body: taskResponse} = await this.get(`${folder1Task1.id}/folder/${folder2.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskResponse.startDate).toBeDateEqualWithoutMilliseconds(notShareTask.endDate);
    }

    /**
     * Deletes a task dependency.
     *
     * This method performs the following steps:
     * 1. Creates a user and a folder.
     * 2. Creates two fake tasks for the user and folder.
     * 3. Creates a task dependency between the two tasks.
     * 4. Deletes the task dependency.
     *
     * @returns {Promise<void>} A Promise that resolves when the task dependency is deleted.
     */
    @Test('Delete Task Dependency')
    async deleteTaskDependency(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const createDependencyDto: CreateDependencyDto = {
            folderId: folder.id,
            predecessorId: task1.id,
            successorId: task2.id,
            relationType: RelationTypeOptions.START_TO_FINISH,
        };
        this.logger.debug('create dependency');
        await this.post(`dependency/folder/${folder.id}`, createDependencyDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const {body: taskResponse} = await this.get(`${task1.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskResponse.successors[0].taskId).toBe(task2.id);
        this.logger.debug('delete dependency');
        await this.delete(
            `dependency/${taskResponse.successors[0].id}/predecessors/${task1.id}/successors/${task2.id}/folder/${folder.id}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
    }

    /**
     * Moves a task to a specific position within a folder's workflow.
     *
     * Steps:
     * 1. Creates a user and a folder.
     * 2. Retrieves the folder and user IDs from the access token.
     * 3. Creates a fake task associated with the user and folder.
     * 4. Moves the task to a specific position within the folder's workflow.
     * 5. Retrieves the comments for the moved task.
     * 6. Verifies that the move action exists in the comments.
     *
     * @returns {Promise<void>} A Promise that resolves when the task has been moved.
     */
    @Test('Move Task')
    async moveTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const f2 = await this.createFolder(null, jwtToken);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('move task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder.id);
        const moveTaskDto: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        this.logger.debug('remove follower from task');
        await this.delete(`unfollow/${folder.id}/${task.id}/${userId}`, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('patch request should fail with a not found error instead of type error');
        await this.patch(`position/${123}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);

        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('get moved task comments');
        const {body: response} = await this.post(`/task-action/folder/${folder.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const exists = response.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.MOVE && x.taskId === task.id
        );
        expect(exists.parameters?.updatePosition).toMatchObject(moveTaskDto);

        this.logger.debug('move task');
        const moveTaskDto2: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[0].id,
            index: 0,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task.id}`, moveTaskDto2, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('get moved task comments');
        const {body: response2} = await this.post(`/task-action/folder/${folder.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const exists2 = response2.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.MOVE && x.taskId === task.id
        );
        expect(exists2.parameters?.updatePosition).toMatchObject(moveTaskDto);

        this.logger.debug('move task to wrong state');
        const workFlowEntity2 = await this.folderFactory.getFolderWorkFlow(f2.folder.id);
        const moveTaskDto3: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity2.WorkFlowStates[workFlowEntity2.WorkFlowStates.length - 1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task.id}`, moveTaskDto3, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
    }

    /**
     * Moves a task to a specific position within a folder's workflow.
     *
     * Steps:
     * 1. Creates a user and a folder.
     * 2. Retrieves the folder and user IDs from the access token.
     * 3. Creates a fake task associated with the user and folder.
     * 4. Moves the task to a specific position within the folder's workflow.
     * 5. Retrieves the comments for the moved task.
     * 6. Verifies that the move action exists in the comments.
     *
     * @returns {Promise<void>} A Promise that resolves when the task has been moved.
     */
    @Test('Change Task Index')
    async changeTaskIndex(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask3 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask4 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask5 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task3} = await this.post(``, fakeTask3, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task4} = await this.post(``, fakeTask4, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task5} = await this.post(``, fakeTask5, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('move task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder.id);
        const moveTaskDto1: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 0,
            view: FolderViewOptions.BOARD,
        };
        const moveTaskDto2: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        const moveTaskDto3: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 2,
            view: FolderViewOptions.BOARD,
        };
        const moveTaskDto4: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 3,
            view: FolderViewOptions.BOARD,
        };
        const moveTaskDto5: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 4,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task1.id}`, moveTaskDto1, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.patch(`position/${task2.id}`, moveTaskDto2, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.patch(`position/${task3.id}`, moveTaskDto3, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.patch(`position/${task4.id}`, moveTaskDto4, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.patch(`position/${task5.id}`, moveTaskDto5, jwtToken.accessToken).expect(HttpStatus.OK);

        const moveTaskDto6: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task1.id}`, moveTaskDto6, jwtToken.accessToken).expect(HttpStatus.OK);
    }

    /**
     * Updates a workflow and moves a task to create an approval.
     *
     * This method performs the following steps:
     * 1. Creates a user and folder.
     * 2. Retrieves the system stages.
     * 3. Creates a fake task using the user ID and folder ID.
     * 4. Updates the workflow to add an approval constraint.
     * 5. Creates a task and moves it to a specific position within the workflow.
     *
     * @returns {Promise<void>} A Promise that resolves when the operation is complete.
     */
    @Test('Update Workflow And Move Task To Create Approval')
    async updateWorkflowAdmoveTaskToCreateApproval(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, workflowDB} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('update workflow to add approval constraint');
        const {body: wbDB} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`Update workflow`);
        const updatedWorkflow = this.workflowFactory.fakeUpdateWorkflow(wbDB);

        const acceptState = updatedWorkflow.states[0];
        const rejectState = updatedWorkflow.states[2];
        updatedWorkflow.states[1].approvalConstraint = {
            acceptState: acceptState.code,
            rejectState: rejectState.code,
            userIds: [userId], //** approvers of the approvals */
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };
        const {body: wf3} = await this.patch(`/workflow/module/${workflowDB.id}`, updatedWorkflow, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(wf3).toBeDefined();

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('move task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder.id);
        this.logger.debug('move task to create a approval');
        const moveTaskDto: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };

        const approvalCreatePromise = enqueueEventAndGetPromise(
            {taskId: task.id},
            this.approvalApiConnectorService,
            (job, data) => +job?.data?.metaData?.find((m) => m.entityType === ApprovalEntityTypesOptions.TASK)?.entityId === data?.taskId
        );

        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const jobData = await approvalCreatePromise;

        const returnQueueName = getQueueName(APPROVAL_RETURN_QUEUE);
        const redisUrl = this.appConfigService.getString('REDIS_URL');
        const returnQueue = new Queue(returnQueueName, {connection: {url: redisUrl}});

        const {tenantId, id, approvalConstraintId, metaData} = jobData.data;
        const instancePayload = {
            tenantId,
            id,
            status: ApprovalStatusOptions.ACTIVE,
            metaData,
            approvalConstraintId: approvalConstraintId,
        };

        const approvalInstancePromise = enqueueEventAndGetPromise(
            {id},
            this.approvalQueueHandlerService,
            (job, data) => job?.data?.id === data?.id
        );

        await returnQueue.add(APPROVAL_RETURN_CREATE_INSTANCE_JOB, instancePayload);
        await approvalInstancePromise;

        this.logger.debug('move task again to replicate approval');
        const moveTaskDto2: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[2].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };

        this.logger.debug('move task again to replicate reoponing of approval should fail');
        const {body: failedMove} = await this.patch(`position/${task.id}`, moveTaskDto2, jwtToken.accessToken).expect(
            HttpStatus.BAD_REQUEST
        );
        expect(failedMove.message).toBe('Task is in approval process');

        this.logger.debug('set approval as completed to allow task movement');
        await this.getDataSource().getRepository(ApprovalConstraintInstanceEntity).update({taskId: task.id}, {isActive: false});

        await this.patch(`position/${task.id}`, moveTaskDto2, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('move task again to replicate reoponing of approval');
        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
    }

    @Test('Updating Workflow To Keep Approval Constraint Instance')
    async updatingWorkflowToKeepApprovalConstraintInstance(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, workflowDB} = await this.createFolder();

        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('update workflow to add approval constraint');
        const {body: wbDB} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`Update workflow`);
        const updatedWorkflow = this.workflowFactory.fakeUpdateWorkflow(wbDB);

        const acceptState = updatedWorkflow.states[0];
        const rejectState = updatedWorkflow.states[2];
        updatedWorkflow.states[1].approvalConstraint = {
            acceptState: acceptState.code,
            rejectState: rejectState.code,
            userIds: [userId], //** approvers of the approvals */
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };
        const {body: wf3} = await this.patch(`/workflow/module/${workflowDB.id}`, updatedWorkflow, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(wf3).toBeDefined();

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('move task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder.id);
        this.logger.debug('move task to create a approval');
        const moveTaskDto: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };

        const approvalCreatePromise = enqueueEventAndGetPromise(
            {taskId: task.id},
            this.approvalApiConnectorService,
            (job, data) => +job?.data?.metaData?.find((m) => m.entityType === ApprovalEntityTypesOptions.TASK)?.entityId === data?.taskId
        );

        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const jobData = await approvalCreatePromise;

        const returnQueueName = getQueueName(APPROVAL_RETURN_QUEUE);
        const redisUrl = this.appConfigService.getString('REDIS_URL');
        const returnQueue = new Queue(returnQueueName, {connection: {url: redisUrl}});

        const {tenantId, id, approvalConstraintId, metaData} = jobData.data;
        const instancePayload = {
            tenantId,
            id,
            status: ApprovalStatusOptions.ACTIVE,
            metaData,
            approvalConstraintId: approvalConstraintId,
        };

        const approvalInstancePromise = enqueueEventAndGetPromise(
            {id},
            this.approvalQueueHandlerService,
            (job, data) => job?.data?.id === data?.id
        );

        await returnQueue.add(APPROVAL_RETURN_CREATE_INSTANCE_JOB, instancePayload);
        await approvalInstancePromise;

        const {body: wbDB2} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`Update workflow`);
        const updatedWorkflow2 = this.workflowFactory.fakeUpdateWorkflow(wbDB2);

        const acceptState2 = updatedWorkflow2.states[0];
        const rejectState2 = updatedWorkflow2.states[2];
        updatedWorkflow2.states[1].approvalConstraint = {
            acceptState: acceptState2.code,
            rejectState: rejectState2.code,
            userIds: [userId], //** approvers of the approvals */
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };

        const {body: wf4} = await this.patch(`/workflow/module/${workflowDB.id}`, updatedWorkflow2, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(wf4).toBeDefined();

        this.logger.debug('move task again to replicate approval');
        const moveTaskDto2: UpdateTaskPositionDto = {
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[2].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };

        this.logger.debug('move task again to replicate reoponing of approval should fail');
        const {body: failedMove} = await this.patch(`position/${task.id}`, moveTaskDto2, jwtToken.accessToken).expect(
            HttpStatus.BAD_REQUEST
        );
        expect(failedMove.message).toBe('Task is in approval process');

        this.logger.debug('set approval as completed to allow task movement');
        await this.getDataSource().getRepository(ApprovalConstraintInstanceEntity).update({taskId: task.id}, {isActive: false});

        await this.patch(`position/${task.id}`, moveTaskDto2, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('move task again to replicate reoponing of approval');
        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
    }

    @Test('Create Workflow And Move Task To Create Approval')
    async CreateWorkflowAndmoveTaskToCreateApproval(): Promise<void> {
        this.logger.debug('create user and folder');
        const {token: jwtToken} = await this.userSuite.createSuperUser();
        const {token: jwtToken2} = await this.userSuite.createSuperUser();
        const userId1 = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const userId2 = this.getUserIdFromAccessToken(jwtToken2.accessToken);

        const {body: systemStages} = await this.get(`/displacement-group/system-stage`, jwtToken.accessToken).expect(HttpStatus.OK);

        const fakeWorkflow = await this.workflowFactory.fakeCreateWorkflow(systemStages[0]?.id);
        fakeWorkflow.states[0].constraints = [
            {
                userConstraint: [userId1],
                swimlaneConstraint: [fakeWorkflow.states[1].code, fakeWorkflow.states[2].code],
            },
        ];
        fakeWorkflow.states[1].approvalConstraint = {
            acceptState: fakeWorkflow.states[0].code,
            rejectState: fakeWorkflow.states[2].code,
            userIds: [userId1], //** approvers of the approvals */
            authorizedUserIds: [userId2],
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };

        const {body: workflowDB} = await this.post(`/workflow/module`, fakeWorkflow, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug(`check workflow exists`);
        const {body: workflow} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`check in detail workflow approval constraint`);
        expect(workflow.title).toBe(fakeWorkflow.title);
        expect(workflow.states[1].approvalConstraint).toBeDefined();
        expect(workflow.states[1].approvalConstraint?.acceptState).toBe(workflow.states[0].code);
        expect(workflow.states[1].approvalConstraint?.rejectState).toBe(workflow.states[2].code);
        expect(workflow.states[1].approvalConstraint?.userIds).toContain(userId1);
        expect(workflow.states[1].approvalConstraint?.authorizedUserIds).toContain(userId2);
        expect(workflow.states[1].approvalConstraint?.requiredApprovals).toBe(1);
        expect(workflow.states[1].approvalConstraint?.dueIn).toBe(1);
        expect(workflow.states[1].approvalConstraint?.dueInType).toBe(ApprovalDueInTypeOptions.DAYS);

        this.logger.debug(`check in detail workflow swimlane constraint`);
        expect(workflow.states[0].constraints).toBeDefined();
        expect(workflow.states[0].constraints).toHaveLength(1);
        expect(workflow.states[0].constraints[0].userConstraint).toContain(userId1);
        expect(workflow.states[0].constraints[0].swimlaneConstraint).toContain(workflow.states[1].code);
        expect(workflow.states[0].constraints[0].swimlaneConstraint).toContain(workflow.states[2].code);
        expect(workflow.states[0].constraints[0].swimlaneConstraint).toHaveLength(2);

        const spaceResponse = await this.createSpace(
            jwtToken.accessToken,
            [workflow.id],
            [{id: userId2, userPermission: UserPermissionOptions.EDITOR}]
        );
        this.logger.debug('create folder');
        const fakeFolder = this.folderFactory.fakeCreateFolder(
            workflow.id,
            null,
            DefaultViewOptions.BOARD,
            [TASK_MANAGEMENT],
            spaceResponse.id,
            null,
            [],
            [{id: userId2, userPermission: UserPermissionOptions.EDITOR}]
        );
        const {body: f1} = await this.post(`/folder`, fakeFolder, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(f1).toBeDefined();
        const {body: f1DB} = await this.get(`/folder/${f1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(f1DB.id).toEqual(f1.id);

        const fakeTask = this.factory.fakeCreateTask(userId1, f1.id);

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('move task');
        const moveTaskDto: UpdateTaskPositionDto = {
            folderId: f1.id,
            actualFolderId: f1.id,
            columnId: workflow.states[1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };

        const approvalCreatePromise = enqueueEventAndGetPromise(
            {taskId: task.id},
            this.approvalApiConnectorService,
            (job, data) => +job?.data?.metaData?.find((m) => m.entityType === ApprovalEntityTypesOptions.TASK)?.entityId === data?.taskId
        );

        await this.patch(`position/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const jobData = await approvalCreatePromise;

        const returnQueueName = getQueueName(APPROVAL_RETURN_QUEUE);
        const redisUrl = this.appConfigService.getString('REDIS_URL');
        const returnQueue = new Queue(returnQueueName, {connection: {url: redisUrl}});

        const {tenantId, id, approvalConstraintId, metaData} = jobData.data;
        const instancePayload = {
            tenantId,
            id,
            status: ApprovalStatusOptions.ACTIVE,
            metaData,
            approvalConstraintId: approvalConstraintId,
        };

        const approvalInstancePromise = enqueueEventAndGetPromise(
            {id},
            this.approvalQueueHandlerService,
            (job, data) => job?.data?.id === data?.id
        );

        await returnQueue.add(APPROVAL_RETURN_CREATE_INSTANCE_JOB, instancePayload);
        await approvalInstancePromise;

        const moveTaskDto2: UpdateTaskPositionDto = {
            folderId: f1.id,
            actualFolderId: f1.id,
            columnId: workflow.states[0].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };

        const {body: data} = await this.patch(`position/${task.id}`, moveTaskDto2, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
        expect(data.message).toBe('Task is in approval process');
        await this.patch(`position/${task.id}`, moveTaskDto2, jwtToken2.accessToken).expect(HttpStatus.OK);
    }

    @Test('Update Workflow with Approval Constraint state')
    async UpdateWorkflowWithApprovalConstraintState(): Promise<void> {
        this.logger.debug('create user and folder');
        const {token: jwtToken} = await this.userSuite.createSuperUser();
        const {token: jwtToken2} = await this.userSuite.createSuperUser();
        const userId1 = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const userId2 = this.getUserIdFromAccessToken(jwtToken2.accessToken);

        const {body: systemStages} = await this.get(`/displacement-group/system-stage`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(systemStages).toBeDefined();
        expect(systemStages).toHaveLength(4);
        const completed = systemStages.find((s) => s.code === SystemStageCodeOptions.COMPLETED);
        expect(completed).toBeDefined();
        const active = systemStages.find((s) => s.code === SystemStageCodeOptions.ACTIVE);
        expect(active).toBeDefined();
        const canceled = systemStages.find((s) => s.code === SystemStageCodeOptions.CANCELED);
        expect(canceled).toBeDefined();
        const deferred = systemStages.find((s) => s.code === SystemStageCodeOptions.DEFERRED);
        expect(deferred).toBeDefined();

        const states: CreateWorkFlowStateDto[] = [
            {
                color: faker.color.human(),
                title: `${faker.commerce.productMaterial()}-${this.workflowFactory.makeid(8)}`,
                index: 0,
                code: this.workflowFactory.makeid(8),
                displacementCodeId: null,
                systemStageId: active.id,
                constraints: [],
                approvalConstraint: null,
            },
            {
                color: faker.color.human(),
                title: `${faker.commerce.productMaterial()}-${this.workflowFactory.makeid(8)}`,
                index: 1,
                code: this.workflowFactory.makeid(8),
                displacementCodeId: null,
                systemStageId: active.id,
                constraints: [],
                approvalConstraint: null,
            },
            {
                color: faker.color.human(),
                title: `${faker.commerce.productMaterial()}-${this.workflowFactory.makeid(8)}`,
                index: 2,
                code: this.workflowFactory.makeid(8),
                displacementCodeId: null,
                systemStageId: completed.id,
                constraints: [],
                approvalConstraint: null,
            },
            {
                color: faker.color.human(),
                title: `${faker.commerce.productMaterial()}-${this.workflowFactory.makeid(8)}`,
                index: 3,
                code: this.workflowFactory.makeid(8),
                displacementCodeId: null,
                systemStageId: canceled.id,
                constraints: [],
                approvalConstraint: null,
            },
            {
                color: faker.color.human(),
                title: `${faker.commerce.productMaterial()}-${this.workflowFactory.makeid(8)}`,
                index: 4,
                code: this.workflowFactory.makeid(8),
                displacementCodeId: null,
                systemStageId: deferred.id,
                constraints: [],
                approvalConstraint: null,
            },
        ];

        const fakeWorkflow: CreateWorkFlowDto = {
            description: faker.commerce.productDescription(),
            title: `${faker.commerce.product()}-${Date.now()}`,
            color: faker.color.human(),
            states,
            active: true,
        };

        const {body: workflowDB} = await this.post(`/workflow/module`, fakeWorkflow, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug(`check workflow exists`);
        const {body: workflow} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`check in detail workflow approval constraint`);
        expect(workflow.title).toBe(fakeWorkflow.title);
        expect(workflow.states[0].title).toBe(fakeWorkflow.states[0].title);
        expect(workflow.states[1].title).toBe(fakeWorkflow.states[1].title);
        expect(workflow.states[2].title).toBe(fakeWorkflow.states[2].title);
        expect(workflow.states[3].title).toBe(fakeWorkflow.states[3].title);
        expect(workflow.states[4].title).toBe(fakeWorkflow.states[4].title);

        const spaceResponse = await this.createSpace(
            jwtToken.accessToken,
            [workflow.id],
            [{id: userId2, userPermission: UserPermissionOptions.EDITOR}]
        );
        this.logger.debug('create folder');
        const fakeFolder = this.folderFactory.fakeCreateFolder(
            workflow.id,
            null,
            DefaultViewOptions.BOARD,
            [TASK_MANAGEMENT],
            spaceResponse.id,
            null,
            [],
            [{id: userId2, userPermission: UserPermissionOptions.EDITOR}]
        );
        const {body: f1} = await this.post(`/folder`, fakeFolder, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(f1).toBeDefined();
        const {body: f1DB} = await this.get(`/folder/${f1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(f1DB.id).toEqual(f1.id);

        const fakeTask = this.factory.fakeCreateTask(userId1, f1.id);
        fakeTask.workflowStateId = workflow.states[0].id;
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.title).toBe(fakeTask.title);
        const fakeTask2 = this.factory.fakeCreateTask(userId1, f1.id);
        fakeTask2.workflowStateId = workflow.states[1].id;
        this.logger.debug('create task');
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task2.title).toBe(fakeTask2.title);

        const fakeUpdateWorkflow = this.workflowFactory.fakeUpdateWorkflow(workflow);

        fakeUpdateWorkflow.states = fakeUpdateWorkflow.states.map((s) => ({...s, updated: false}));

        const newState: UpdateWorkflowColumnDto = {
            color: faker.color.human(),
            title: `${faker.commerce.productMaterial()}-${this.workflowFactory.makeid(8)}`,
            index: 2,
            code: this.workflowFactory.makeid(8),
            displacementCodeId: null,
            systemStageId: active.id,
            constraints: [],
            approvalConstraint: {
                acceptState: workflow.states[2].code,
                rejectState: workflow.states[1].code,
                userIds: [userId1],
                authorizedUserIds: [],
                requiredApprovals: 1,
                dueIn: 3,
                dueInType: ApprovalDueInTypeOptions.DAYS,
            },
        };

        fakeUpdateWorkflow.states.splice(2, 0, newState);
        fakeUpdateWorkflow.states = fakeUpdateWorkflow.states.map((s, i) => ({...s, index: i}));

        const {body: response} = await this.patch(`/workflow/module/${workflowDB.id}`, fakeUpdateWorkflow, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(response.affected).toEqual(1);

        const {body: workflowUpdated} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`check in detail workflow approval constraint`);
        expect(workflowUpdated.title).toBe(fakeUpdateWorkflow.title);
        expect(workflowUpdated.states[0].id).toBe(workflow.states[0].id);
        expect(workflowUpdated.states[0].index).toBe(0);
        expect(workflowUpdated.states[1].id).toBe(workflow.states[1].id);
        expect(workflowUpdated.states[1].index).toBe(1);
        expect(workflowUpdated.states[2].title).toBe(fakeUpdateWorkflow.states[2].title);
        expect(workflowUpdated.states[2].index).toBe(2);
        expect(workflowUpdated.states[3].id).toBe(workflow.states[2].id);
        expect(workflowUpdated.states[3].index).toBe(3);
        expect(workflowUpdated.states[4].id).toBe(workflow.states[3].id);
        expect(workflowUpdated.states[4].index).toBe(4);
        expect(workflowUpdated.states[5].id).toBe(workflow.states[4].id);
        expect(workflowUpdated.states[5].index).toBe(5);

        this.logger.debug('move task');
        const moveTaskDto: UpdateTaskPositionDto = {
            folderId: f1.id,
            actualFolderId: f1.id,
            columnId: workflowUpdated.states.find((s) => s.title === newState.title).id,
            index: 0,
            view: FolderViewOptions.BOARD,
        };

        await this.patch(`position/${task2.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const fakeUpdateWorkflow2 = this.workflowFactory.fakeUpdateWorkflow(workflowUpdated);

        fakeUpdateWorkflow2.states = fakeUpdateWorkflow2.states.map((s) => ({...s, updated: false}));

        const updateState = fakeUpdateWorkflow2.states.splice(2, 1);
        updateState[0].systemStageId = canceled.id;
        updateState[0].updated = true;
        fakeUpdateWorkflow2.states.splice(3, 0, updateState[0]);
        fakeUpdateWorkflow2.states = fakeUpdateWorkflow2.states.map((s, i) => ({...s, index: i}));
        const {body: response2} = await this.patch(`/workflow/module/${workflowDB.id}`, fakeUpdateWorkflow2, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(response2.affected).toEqual(1);

        const {body: workflowUpdated2} = await this.get(`/workflow/module/${workflowDB.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug(`check in detail workflow approval constraint`);
        expect(workflowUpdated2.title).toBe(fakeUpdateWorkflow2.title);
        expect(workflowUpdated2.states[0].id).toBe(workflowUpdated.states[0].id);
        expect(workflowUpdated2.states[0].index).toBe(0);
        expect(workflowUpdated2.states[0].systemStageId).toBe(active.id);

        expect(workflowUpdated2.states[1].id).toBe(workflowUpdated.states[1].id);
        expect(workflowUpdated2.states[1].index).toBe(1);
        expect(workflowUpdated2.states[1].systemStageId).toBe(active.id);

        expect(workflowUpdated2.states[2].id).toBe(workflowUpdated.states[3].id);
        expect(workflowUpdated2.states[2].index).toBe(2);
        expect(workflowUpdated2.states[2].systemStageId).toBe(completed.id);

        expect(workflowUpdated2.states[3].id).toBe(workflowUpdated.states[2].id);
        expect(workflowUpdated2.states[3].index).toBe(3);
        expect(workflowUpdated2.states[3].systemStageId).toBe(canceled.id);

        expect(workflowUpdated2.states[4].id).toBe(workflowUpdated.states[4].id);
        expect(workflowUpdated2.states[4].index).toBe(4);
        expect(workflowUpdated2.states[4].systemStageId).toBe(canceled.id);

        expect(workflowUpdated2.states[5].id).toBe(workflowUpdated.states[5].id);
        expect(workflowUpdated2.states[5].index).toBe(5);
        expect(workflowUpdated2.states[5].systemStageId).toBe(deferred.id);
    }
    /**
     * Share a task between two folders.
     *
     * This method performs the following steps:
     * - Creates a user and a folder.
     * - Creates another folder using the JWT token obtained from the first step.
     * - Retrieves the user ID from the JWT token.
     * - Constructs a fake task using the user ID and the ID of the first folder.
     * - Creates the task.
     * - Gets the folder workflow for the second folder.
     * - Constructs a task shared DTO using the IDs of both folders and the ID of the first state in the folder workflow.
     * - Shares the task.
     * - Retrieves the comments for the moved task.
     * - Checks if the shared action exists in the comments.
     * - Un-shares the task.
     * - Retrieves the comments for the moved task again.
     * - Checks if the unshared action exists in the comments.
     *
     * @returns {Promise<void>} A promise that resolves when the task sharing process is complete.
     */
    @Test('Share Task')
    async shareTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder: folder1, jwtToken, spaceId, workflowDB} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder1.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder1.id, task.id);
        await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('share task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder2.id);
        const shareTaskDto: TaskSharedDto = {
            fromFolderId: folder1.id,
            folderId: folder2.id,
            stateId: workFlowEntity.WorkFlowStates[0].id,
        };
        await this.post(`share/${task.id}`, shareTaskDto, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('get moved task comments');
        const {body: response} = await this.post(`/task-action/folder/${folder1.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const exists = response.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.SHARED && x.taskId === task.id
        );
        expect(exists.parameters?.share).toMatchObject(shareTaskDto);

        this.logger.debug('un-share task');
        await this.delete(`un-share/${task.id}/${folder2.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        this.logger.debug('get moved task comments');
        const {body: response2} = await this.post(`/task-action/folder/${folder1.id}/task/${task.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const exists2 = response2.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.UNSHARED && x.taskId === task.id
        );
        expect(exists2.parameters?.unshared).toMatchObject({folder_id: folder2.id});
    }

    @Test('Move shared tasks to new folder')
    async moveSharedTasksToNewFolder(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder: folder1, jwtToken, spaceId, workflowDB} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId);
        const {folder: folder3} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId); //sharing should be done in same space
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder1.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder1.id);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const fakeTask3 = this.factory.fakeCreateTask(userId, folder2.id);
        this.logger.debug('create task');
        const {body: task3} = await this.post(``, fakeTask3, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeTask4 = this.factory.fakeCreateTask(userId, folder2.id);
        const {body: task4} = await this.post(``, fakeTask4, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('share task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder2.id);
        const shareTaskDto: TaskSharedDto = {
            fromFolderId: folder1.id,
            folderId: folder2.id,
            stateId: workFlowEntity.WorkFlowStates[0].id,
        };
        await this.post(`share/${task1.id}`, shareTaskDto, jwtToken.accessToken).expect(HttpStatus.CREATED);
        await this.post(`share/${task2.id}`, shareTaskDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const {body: board2} = await this.post(`/folder-workflow/project/${folder2.id}/board`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        expect(board2).toHaveLength(1);
        const tasksBoard2 = board2[0].columns[0].tasks;
        expect(board2[0].columns[0].totalCount).toBe(4);
        expect(tasksBoard2).toHaveLength(4);
        const task1FoundBoard2 = tasksBoard2.find((t) => t.id === task1.id);
        expect(task1FoundBoard2).toBeDefined();
        const task2FoundBoard2 = tasksBoard2.find((t) => t.id === task2.id);
        expect(task2FoundBoard2).toBeDefined();
        const task3FoundBoard2 = tasksBoard2.find((t) => t.id === task3.id);
        expect(task3FoundBoard2).toBeDefined();
        const task4FoundBoard2 = tasksBoard2.find((t) => t.id === task4.id);
        expect(task4FoundBoard2).toBeDefined();

        const folder2WorkFlowEntity = await this.folderFactory.getFolderWorkFlow(folder2.id);

        const folder3WorkFlowEntity = await this.folderFactory.getFolderWorkFlow(folder3.id);

        const mapWorkflowStates = [];
        for (let i = 0; i < folder2WorkFlowEntity.WorkFlowStates.length; i++) {
            mapWorkflowStates.push({
                sourceWorkflowStateCode: folder2WorkFlowEntity.WorkFlowStates[i].code,
                destinationWorkflowStateCode:
                    folder3WorkFlowEntity.WorkFlowStates[i]?.code ?? folder3WorkFlowEntity.WorkFlowStates[0]?.code,
            });
        }
        const moveTaskDto: MoveManyTasksDto = {
            sourceFolderId: folder2.id,
            destinationFolderId: folder3.id,
            taskIds: [task1.id, task2.id, task3.id, task4.id],
            mapWorkflowStates,
        };
        await this.put(`move-many`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        const {body: board2Empty} = await this.post(`/folder-workflow/project/${folder2.id}/board`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        expect(board2Empty).toHaveLength(1);
        expect(board2Empty[0].columns[0].tasks).toHaveLength(0);

        const {body: board3} = await this.post(`/folder-workflow/project/${folder3.id}/board`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        expect(board3).toHaveLength(1);
        const tasksBoard3 = board3[0].columns[0].tasks;
        expect(board3[0].columns[0].totalCount).toBe(4);
        expect(tasksBoard3).toHaveLength(4);
        const task1FoundBoard3 = tasksBoard3.find((t) => t.id === task1.id);
        expect(task1FoundBoard3.id).toBe(task1.id);
        expect(task1FoundBoard3.title).toBe(task1.title);
        const task2FoundBoard3 = tasksBoard3.find((t) => t.id === task2.id);
        expect(task2FoundBoard3.id).toBe(task2.id);
        expect(task2FoundBoard3.title).toBe(task2.title);
        const task3FoundBoard3 = tasksBoard3.find((t) => t.id === task3.id);
        expect(task3FoundBoard3.id).toBe(task3.id);
        expect(task3FoundBoard3.title).toBe(task3.title);
        const task4FoundBoard3 = tasksBoard3.find((t) => t.id === task4.id);
        expect(task4FoundBoard3.id).toBe(task4.id);
        expect(task4FoundBoard3.title).toBe(task4.title);
    }

    @Test('Move one task to new folder')
    async moveOneTaskToNewFolder(): Promise<void> {
        this.logger.debug('create user and folder');
        const {token: jwtToken2} = await this.userSuite.createSuperAdminUser();
        const {token: jwtToken3} = await this.userSuite.createSuperAdminUser();
        const {token: jwtToken4} = await this.userSuite.createSuperAdminUser();
        const {token: jwtToken5} = await this.userSuite.createSuperAdminUser();
        const {folder: folder1, spaceId, jwtToken} = await this.createFolder();
        const {folder: folder2, spaceId: spaceId2} = await this.createFolder(null, jwtToken);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const userId2 = this.getUserIdFromAccessToken(jwtToken2.accessToken);
        const userId3 = this.getUserIdFromAccessToken(jwtToken3.accessToken);
        const userId4 = this.getUserIdFromAccessToken(jwtToken4.accessToken);
        const userId5 = this.getUserIdFromAccessToken(jwtToken5.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder1.id);

        const updateMembersDto = {
            insert: [
                {id: userId2, userPermission: UserPermissionOptions.EDITOR},
                {id: userId3, userPermission: UserPermissionOptions.FULL},
                {id: userId4, userPermission: UserPermissionOptions.EDITOR},
                {id: userId5, userPermission: UserPermissionOptions.FULL},
            ],
            update: [],
            delete: [],
        };
        await this.patch(`/space/${spaceId}/members`, updateMembersDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // await this.patch(`/folder/members/${folder1.id}`, updateMembersDto, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('create tag');
        const tagSpace1 = await this.tagFactory.createTag(null, spaceId);
        const tagSpace2 = await this.tagFactory.createTag(null, spaceId2);
        this.logger.debug('create custom fields');
        const customFieldIdsSpace1 = await this.createManyCustomFields(
            1,
            CustomFieldDefinitionTypeOptions.TEXT,
            jwtToken.accessToken,
            spaceId
        );
        const customFieldIdsSpace2 = await this.createManyCustomFields(
            1,
            CustomFieldDefinitionTypeOptions.TEXT,
            jwtToken.accessToken,
            spaceId2
        );

        await this.patch(
            `/folder/${folder1.id}/space/${spaceId}`,
            {tags: {insert: [tagSpace1.id]}, customFieldValues: {insert: [{id: customFieldIdsSpace1[0], value: ''}]}},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        await this.patch(
            `/folder/${folder2.id}/space/${spaceId2}`,
            {tags: {insert: [tagSpace2.id]}, customFieldValues: {insert: [{id: customFieldIdsSpace2[0], value: ''}]}},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        this.logger.debug('create task and its child to move');
        fakeTask1['assignees'] = [userId2];
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeSubTask1 = this.factory.fakeCreateTask(userId, folder1.id, task1.id);
        fakeSubTask1['assignees'] = [userId5];
        const {body: subtask1} = await this.post(``, fakeSubTask1, jwtToken.accessToken).expect(HttpStatus.CREATED); //this generates an update on task1 so +1 in task action expected

        this.logger.debug('add tag to task');
        await this.post(`tag/${task1.id}/${tagSpace1.id}/${folder1.id}`, {}, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const commentDto: CreateTaskActionDto = {comment: 'this is a test comment', mentionMembers: [userId]};
        await this.post(`/task-action/folder/${folder1.id}/task/${task1.id}/comment`, commentDto, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        const customField1Value = 'def';
        await this.patch(
            `custom-field/${customFieldIdsSpace1[0]}/folder/${folder1.id}/task/${task1.id}?value=${customField1Value}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        const addApprovalToTaskDto = this.approvalsFactory.fakeCreateAddApprovalToTaskDto([userId3]);
        const {body: createdApproval} = await this.post(
            `/approvals/task/${task1.id}/folder/${folder1.id}`,
            addApprovalToTaskDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(createdApproval.taskId).toBe(task1.id);
        expect(createdApproval.assignedApproves[0]).toBe(userId3);

        const addApprovalToTaskDto2 = this.approvalsFactory.fakeCreateAddApprovalToTaskDto([userId4]);
        const {body: createdApproval2} = await this.post(
            `/approvals/task/${subtask1.id}/folder/${folder1.id}`,
            addApprovalToTaskDto2,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(createdApproval2.taskId).toBe(subtask1.id);
        expect(createdApproval2.assignedApproves[0]).toBe(userId4);

        const folder2WorkFlowEntity = await this.folderFactory.getFolderWorkFlow(folder2.id);

        const moveTaskDto: MoveOneTaskDto = {
            fromFolderId: folder1.id,
            toFolderId: folder2.id,
            mappedLabels: [{oldId: tagSpace1.id, newId: tagSpace2.id}],
            mappedCustomFields: [{oldId: customFieldIdsSpace1[0], newId: customFieldIdsSpace2[0]}],
            destinationWorkflowStateId: folder2WorkFlowEntity.WorkFlowStates[0]?.id,
        };
        await this.post(`move-one/${task1.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const {body: board1Empty} = await this.post(`/folder-workflow/project/${folder1.id}/board`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        expect(board1Empty).toHaveLength(1);
        expect(board1Empty[0].columns[0].tasks).toHaveLength(0);

        const {body: folder2DB} = await this.get(`/folder/${folder2.id}?show-on=${TASK_MANAGEMENT}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );

        expect(folder2DB.id).toBe(folder2.id);

        const f2User2 = folder2DB.members.find((u) => u.userId === userId2);
        expect(f2User2.userPermission).toBe(UserPermissionOptions.EDITOR);

        const f2User3 = folder2DB.members.find((u) => u.userId === userId3);
        expect(f2User3.userPermission).toBe(UserPermissionOptions.FULL);

        const f2User4 = folder2DB.members.find((u) => u.userId === userId4);
        expect(f2User4.userPermission).toBe(UserPermissionOptions.EDITOR);

        const f2User5 = folder2DB.members.find((u) => u.userId === userId5);
        expect(f2User5.userPermission).toBe(UserPermissionOptions.FULL);

        const {body: board2} = await this.post(`/folder-workflow/project/${folder2.id}/board`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        expect(board2).toHaveLength(1);
        const tasksBoard2 = board2[0].columns[0].tasks;
        expect(tasksBoard2).toHaveLength(1);
        const task1FoundBoard2 = tasksBoard2.find((t) => t.id === task1.id);
        expect(task1FoundBoard2.id).toBe(task1.id);
        expect(task1FoundBoard2.title).toBe(task1.title);
        expect(task1FoundBoard2.ownerId).toBe(userId);
        expect(task1FoundBoard2.tags).toHaveLength(1);
        expect(task1FoundBoard2.tags).toContain(tagSpace2.id);
        expect(task1FoundBoard2.assignees).toHaveLength(1);
        expect(task1FoundBoard2.assignees).toContain(userId2);

        this.logger.debug('check parent task approval');
        const {body: approvalsTask1} = await this.get(`/approvals/folder/${folder2.id}/task/${task1.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        const approvalTask1 = approvalsTask1.find((el) => el.id === createdApproval.id);
        expect(approvalTask1.description).toBe(createdApproval.description);
        expect(approvalTask1.assignedApproves).toHaveLength(1);
        expect(approvalTask1.assignedApproves).toContain(userId3);

        this.logger.debug('check common custom fields');
        const {body: task1CustomFields} = await this.get(`custom-field/folder/${folder2.id}/task/${task1.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(task1CustomFields.customFields[0].customFieldDefinitionId).toBe(customFieldIdsSpace2[0]);
        expect(task1CustomFields.customFields[0].value).toBe(customField1Value);

        const {body: task1Folder2} = await this.get(`${task1.id}/folder/${folder2.id}?show-all-children=true`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(task1Folder2.children.length).toBe(1);
        expect(task1Folder2.children[0].id).toBe(subtask1.id);

        const {body: subtask1Folder2} = await this.get(
            `${subtask1.id}/folder/${folder2.id}?show-all-children=true`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(subtask1Folder2.id).toBe(subtask1.id);
        expect(subtask1Folder2.title).toBe(subtask1.title);
        expect(subtask1Folder2.ownerId).toBe(userId);
        expect(subtask1Folder2.assignees).toHaveLength(1);
        expect(subtask1Folder2.assignees).toContain(userId5);

        this.logger.debug('check child task approval');
        const {body: approvalsSubtask1} = await this.get(
            `/approvals/folder/${folder2.id}/task/${subtask1.id}`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        const approvalSubtask1 = approvalsSubtask1.find((el) => el.id === createdApproval2.id);
        expect(approvalSubtask1.description).toBe(createdApproval2.description);
        expect(approvalSubtask1.assignedApproves).toHaveLength(1);
        expect(approvalSubtask1.assignedApproves).toContain(userId4);

        const {body: taskAction} = await this.post(`/task-action/folder/${folder2.id}/task/${task1.id}`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(taskAction).toBeDefined();
        expect(taskAction.data.length).toBe(8);
        const created = taskAction.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.CREATE && x.taskId === task1.id
        );
        expect(created).toBeDefined();
        const taskFound = created.parameters?.create;
        expect(taskFound.title).toBe(task1.title);
        const moved = taskAction.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.TASK_FOLDER_MOVE && x.taskId === task1.id
        );
        expect(moved).toBeDefined();
        expect(moved.parameters.taskFolderMove.fromFolderId).toBe(folder1.id);
        expect(moved.parameters.taskFolderMove.toFolderId).toBe(folder2.id);
        const comment = taskAction.data.find(
            (x: {action: string; taskId: number}) => x.action === TaskActionOptions.COMMENT && x.taskId === task1.id
        );
        expect(comment).toBeDefined();
        expect(comment.taskId).toBe(task1.id);
    }

    /**
     * Share a task between two folders.
     *
     * This method performs the following steps:
     * - Creates a user and a folder.
     * - Creates another folder using the JWT token obtained from the first step.
     * - Retrieves the user ID from the JWT token.
     * - Constructs a fake task using the user ID and the ID of the first folder.
     * - Creates the task.
     * - Gets the folder workflow for the second folder.
     * - Constructs a task shared DTO using the IDs of both folders and the ID of the first state in the folder workflow.
     * - Shares the task.
     *
     * @returns {Promise<void>} A promise that resolves when the task sharing process is complete.
     */
    @Test('Share Task between parent child folder')
    async shareTaskBetweenParentChildFolder(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder: folder1, jwtToken, workflowDB} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(folder1.id, jwtToken, workflowDB.id);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder2.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const {body: board1} = await this.post(`/folder-workflow/project/${folder2.id}/board`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        expect(board1[0].id).toBe(workflowDB.id);
        const column = board1[0].columns.find((c) => c.totalCount > 0);
        expect(column.totalCount).toBe(1);
        expect(column.tasks).toHaveLength(1);
        expect(column.tasks[0].id).toBe(task.id);
        expect(column.tasks[0].title).toBe(task.title);

        this.logger.debug('share task');
        const shareTaskDto: TaskSharedDto = {
            fromFolderId: folder2.id,
            folderId: folder1.id,
            stateId: column.id,
        };
        const {body: sharedTask} = await this.post(`share/${task.id}`, shareTaskDto, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(sharedTask.childTaskId).toBe(task.id);
        expect(sharedTask.folderId).toBe(folder1.id);
        expect(sharedTask.workflowStateId).toBe(column.id);

        const {body: board2} = await this.post(`/folder-workflow/project/${folder1.id}/board`, {}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        expect(board2).toHaveLength(1);
        expect(board2[0].id).toBe(workflowDB.id);
        expect(board2[0].folderIds).toHaveLength(2);
        expect(board2[0].folderIds).toContain(folder1.id);
        expect(board2[0].folderIds).toContain(folder2.id);

        const column2 = board2[0].columns.find((c) => c.id === column.id);

        expect(column2.id).toBe(column.id);
        expect(column2.totalCount).toBe(2);
        expect(column2.tasks).toHaveLength(2);
        const taskFolder1 = column2.tasks.find((t) => t.id === task.id && t.folderId === folder1.id);
        expect(taskFolder1.id).toBe(task.id);
        const taskFolder2 = column2.tasks.find((t) => t.id === task.id && t.folderId === folder2.id);
        expect(taskFolder2.id).toBe(task.id);
    }

    @Test('Move Task Between Folders')
    async moveBetweenFolders(): Promise<void> {
        const {folder: folder1, jwtToken} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(null, jwtToken);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder1.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder1.id);
        const fakeTask3 = this.factory.fakeCreateTask(userId, folder1.id);

        // create Task tree
        const {body: task1} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const {body: task2} = await this.post(
            ``,
            {
                ...fakeTask2,
                parentTaskId: task1.id,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            ``,
            {
                ...fakeTask3,
                parentTaskId: task2.id,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        const folder1WorkFlowEntity = await this.folderFactory.getFolderWorkFlow(folder1.id);

        const folder2WorkFlowEntity = await this.folderFactory.getFolderWorkFlow(folder2.id);

        const mapWorkflowStates = [];
        for (let i = 0; i < folder1WorkFlowEntity.WorkFlowStates.length; i++) {
            mapWorkflowStates.push({
                sourceWorkflowStateCode: folder1WorkFlowEntity.WorkFlowStates[i].code,
                destinationWorkflowStateCode:
                    folder2WorkFlowEntity.WorkFlowStates[i]?.code ?? folder2WorkFlowEntity.WorkFlowStates[0]?.code,
            });
        }

        const moveTaskDto: MoveManyTasksDto = {
            sourceFolderId: folder1.id,
            destinationFolderId: folder2.id,
            taskIds: [task1.id],
            mapWorkflowStates,
        };

        const {body: folderTaskTree} = await this.post(
            `/folder-workflow/project/${folder1.id}/${folder1.defaultView}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        expect(folderTaskTree[0].columns[0].tasks[0].id).toBe(task1.id);

        await this.put(`move-many`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        await this.get(`${task1.id}/folder/${folder1.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);

        const {body: folderTaskTree2} = await this.post(
            `/folder-workflow/project/${folder2.id}/${folder2.defaultView}`,
            {},
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        const parentTask = folderTaskTree2[0].columns.find((column) => column.tasks.find((task) => task.id === task1.id));

        // check if the task tree strusture persist in new folder
        expect(parentTask).toBeDefined();

        expect(parentTask.tasks).toHaveLength(1);
        expect(parentTask.tasks[0]).toBeDefined();
        expect(parentTask.tasks[0].id).toBe(task1.id);

        this.logger.debug('move more than 1000 tasks at once, should fail with Bad request');
        const moveTaskDtoToFail: MoveManyTasksDto = {
            sourceFolderId: folder1.id,
            destinationFolderId: folder2.id,
            taskIds: [...Array(1001).keys()],
            mapWorkflowStates,
        };

        await this.put(`move-many`, moveTaskDtoToFail, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
    }

    @Test('CheckTaskUpdatePathTitle')
    async CheckTaskUpdatePathTitle(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeUpdateTaskDto = {folderId: folder.id, title: faker.commerce.product()};
        this.logger.debug('update task');
        await this.patch(`${task.id}`, fakeUpdateTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: taskTreeResponse} = await this.get(`/folder/task-tree/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskTreeResponse[0].id).toBe(task.id);
        expect(taskTreeResponse[0].pathStr[0]).toBe(fakeUpdateTaskDto.title);
    }

    /**
     * Moves a task inside another task within a folder's workflow.
     *
     * Steps:
     * 1. Creates a user and a folder.
     * 2. Retrieves the folder and user IDs from the access token.
     * 3. Creates two fake tasks associated with the user and folder.
     * 4. Moves the task to a specific task within the folder's workflow.
     *
     * @returns {Promise<void>} A Promise that resolves when the task has been moved.
     */
    @Test('Move Task Inside Another Task')
    async moveTaskPosition(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task1} = await this.post(``, fakeTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('move task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder.id);
        const moveTaskDto: UpdateTaskPositionDto = {
            parentTaskNewId: task1.id,
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task2.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: parentTask} = await this.get(`${task1.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(parentTask.id).toBe(task1.id);
        const foundChild = parentTask.children.find((child) => child.id === task2.id);
        expect(foundChild).toBeDefined();
    }

    @Test('Update task relation path ids')
    async updateTaskPathIds(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        const fakeTasks = Array.from({length: 4}, () => this.factory.fakeCreateTask(userId, folder.id));

        this.logger.debug('create task');
        //separate this as this can lead to deadlock
        const {body: task1} = await this.post(``, fakeTasks[0], jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task2} = await this.post(``, fakeTasks[1], jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task3} = await this.post(``, fakeTasks[2], jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: task4} = await this.post(``, fakeTasks[3], jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('move task');

        const view = FolderViewOptions.BOARD;
        const folderId = folder.id;
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder.id);
        const columnId = workFlowEntity.WorkFlowStates[0].id;

        const moveTask4Dto: UpdateTaskPositionDto = {
            parentTaskNewId: task3.id,
            folderId,
            actualFolderId: folderId,
            columnId,
            index: 0,
            view,
        };
        const moveTask3Dto: UpdateTaskPositionDto = {
            parentTaskNewId: task2.id,
            folderId,
            actualFolderId: folderId,
            columnId,
            index: 0,
            view,
        };
        const moveTask2Dto: UpdateTaskPositionDto = {
            parentTaskNewId: task1.id,
            folderId,
            actualFolderId: folderId,
            columnId,
            index: 0,
            view,
        };

        await this.patch(`position/${task4.id}`, moveTask4Dto, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.patch(`position/${task3.id}`, moveTask3Dto, jwtToken.accessToken).expect(HttpStatus.OK);
        await this.patch(`position/${task2.id}`, moveTask2Dto, jwtToken.accessToken).expect(HttpStatus.OK);

        const {body: task1Updated} = await this.get(`${task1.id}/folder/${folderId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: task2Updated} = await this.get(`${task2.id}/folder/${folderId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: task3Updated} = await this.get(`${task3.id}/folder/${folderId}`, jwtToken.accessToken).expect(HttpStatus.OK);

        expect(task1Updated.children.length).toBe(1);
        expect(task1Updated.children[0].id).toBe(task2.id);
        expect(task2Updated.children.length).toBe(1);
        expect(task2Updated.children[0].id).toBe(task3.id);
        expect(task3Updated.children.length).toBe(1);
        expect(task3Updated.children[0].id).toBe(task4.id);

        const folderWorkflowDto: FolderTaskFilterDto = {
            pagination: {
                limit: 15,
                offset: 0,
            },
            taskFilter: {},
        };
        const {body: folderWorkflowResponse} = await this.post(
            `/folder-workflow/project/${folderId}/${view}`,
            folderWorkflowDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        expect(folderWorkflowResponse).toBeDefined();
        expect(Array.isArray(folderWorkflowResponse)).toBe(true);
        const [folderWorkflow]: BoardResponseElementDto[] = folderWorkflowResponse;
        expect(folderWorkflow.columns).toBeDefined();
        const {columns} = folderWorkflow;

        const column = columns.find(({id}) => id === columnId);
        expect(column).toBeDefined();
        expect(column.tasks).toBeDefined();
        expect(Array.isArray(column.tasks)).toBe(true);

        const {tasks} = column;
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe(task1.id);
        expect(tasks[0].path).toEqual([task1.id]);

        const {body: taskWithChildren} = await this.get(
            `${tasks[0].id}/folder/${folder.id}?show-all-children=true`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        expect(taskWithChildren.children.length).toBe(1);
        expect(taskWithChildren.children[0].id).toBe(task2.id);
        expect(taskWithChildren.children[0].pathIds).toEqual([task1.id, task2.id]);

        expect(taskWithChildren.children[0].children.length).toBe(1);
        expect(taskWithChildren.children[0].children[0].id).toBe(task3.id);
        expect(taskWithChildren.children[0].children[0].pathIds).toEqual([task1.id, task2.id, task3.id]);

        expect(taskWithChildren.children[0].children[0].children.length).toBe(1);
        expect(taskWithChildren.children[0].children[0].children[0].id).toBe(task4.id);
        expect(taskWithChildren.children[0].children[0].children[0].pathIds).toEqual([task1.id, task2.id, task3.id, task4.id]);
    }

    /**
     * Test updating path ids when sharing tasks with other folders
     *
     * Steps:
     * 1. Create two folders
     * 2. Create two tasks in folder 1 (A1, A2)
     * 3. Make task 2 a subtask of task 1 in folder 1
     * 4. Create two tasks in folder 2 (B1, B2)
     * 5. Make task 2 a subtask of task 1 in folder 2
     * 6. Share task 1 in folder 1 with folder 2
     * 7. Make task 1 a subtask of task 2 in folder 2
     * 8. Validate path ids of task 1 and task 2 in folder 1 and folder 2
     *
     * Expected result:
     *
     * Folder 1:
     * |- A1
     * |----A2
     *
     * Folder 2:
     * |-B2
     * |---B2
     * |-----A1
     * |-------b1
     */
    @Test('Shared tasks path ids')
    async taskPathIdsFilteredByFolder(): Promise<void> {
        // 1. Create two folders
        this.logger.debug('create user and folder');
        const {folder: folder1, jwtToken, workflowDB, spaceId} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId);
        const folder1Workflow = await this.folderFactory.getFolderWorkFlow(folder1.id);
        const folder2Workflow = await this.folderFactory.getFolderWorkFlow(folder2.id);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        // 2. Create two tasks in folder 1
        const folder1FakeTasks = Array.from({length: 2}, () => this.factory.fakeCreateTask(userId, folder1.id));
        this.logger.debug('create tasks');
        //separate this , cause can create deadlock
        const {body: folder1Task1} = await this.post(``, folder1FakeTasks[0], jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: folder1Task2} = await this.post(``, folder1FakeTasks[1], jwtToken.accessToken).expect(HttpStatus.CREATED);

        const view = FolderViewOptions.BOARD;

        // 3. Make task 2 a subtask of task 1 in folder 1
        const folder1SubtaskDto: UpdateTaskPositionDto = {
            view,
            index: 0,
            folderId: folder1.id,
            actualFolderId: folder1.id,
            columnId: folder1Workflow.WorkFlowStates[0].id,
            parentTaskNewId: folder1Task1.id,
        };
        await this.patch(`position/${folder1Task2.id}`, folder1SubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // 4. Create two tasks in folder 2
        const folder2FakeTasks = Array.from({length: 2}, () => this.factory.fakeCreateTask(userId, folder2.id));
        this.logger.debug('create tasks');
        //separate this , cause can create deadlock
        const {body: folder2Task1} = await this.post(``, folder2FakeTasks[0], jwtToken.accessToken).expect(HttpStatus.CREATED);
        const {body: folder2Task2} = await this.post(``, folder2FakeTasks[1], jwtToken.accessToken).expect(HttpStatus.CREATED);

        // 5. Make task 2 a subtask of task 1 in folder 2
        const folder2SubtaskDto: UpdateTaskPositionDto = {
            view,
            index: 0,
            folderId: folder2.id,
            actualFolderId: folder2.id,
            columnId: folder2Workflow.WorkFlowStates[0].id,
            parentTaskNewId: folder2Task1.id,
        };
        await this.patch(`position/${folder2Task2.id}`, folder2SubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // 6. Share task 1 in folder 1 with folder 2
        const shareDto: TaskSharedDto = {
            folderId: folder2.id,
            fromFolderId: folder1.id,
            stateId: folder2Workflow.WorkFlowStates[0].id,
        };
        const {body: shareResult} = await this.post(`share/${folder1Task1.id}`, shareDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        // 7. Make task 1 a subtask of task 2 in folder 2
        const folder2SharedSubtaskDto: UpdateTaskPositionDto = {
            view,
            index: 0,
            folderId: folder2.id,
            actualFolderId: folder2.id,
            columnId: folder2Workflow.WorkFlowStates[0].id,
            parentTaskNewId: folder2Task2.id,
        };

        await this.patch(`position/${shareResult.childTaskId}`, folder2SharedSubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // 8. Validate path ids of task 1 and task 2 in folder 1 and folder 2
        const folderWorkflowDto: FolderTaskFilterDto = {pagination: {limit: 15, offset: 0}, taskFilter: {}};

        // validate folder 1 tasks
        const {body: f1FolderWorkflowResponse} = await this.post(
            `/folder-workflow/project/${folder1.id}/${view}`,
            folderWorkflowDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        expect(f1FolderWorkflowResponse).toBeDefined();
        expect(Array.isArray(f1FolderWorkflowResponse)).toBe(true);
        const [f1Workflow]: BoardResponseElementDto[] = f1FolderWorkflowResponse;
        expect(f1Workflow.columns).toBeDefined();
        const {columns: f1Columns} = f1Workflow;
        const f1Column = f1Columns.find(({id}) => id === folder1Workflow.WorkFlowStates[0].id);
        expect(f1Column).toBeDefined();
        expect(f1Column.tasks).toBeDefined();
        expect(Array.isArray(f1Column.tasks)).toBe(true);

        const {tasks: f1Tasks} = f1Column;

        // Folder 1 - A1
        expect(f1Tasks.length).toBe(1);
        expect(f1Tasks[0].id).toBe(folder1Task1.id);
        expect(f1Tasks[0].path).toEqual([folder1Task1.id]);

        // Folder 1 - A2
        const {body: f1Task} = await this.get(`${f1Tasks[0].id}/folder/${folder1.id}?show-all-children=true`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(f1Task.children.length).toBe(1);
        expect(f1Task.children[0].id).toBe(folder1Task2.id);
        expect(f1Task.children[0].pathIds).toEqual([folder1Task1.id, folder1Task2.id]);

        // validate folder 2 tasks
        const {body: f2FolderWorkflowResponse} = await this.post(
            `/folder-workflow/project/${folder2.id}/${view}`,
            folderWorkflowDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        expect(f2FolderWorkflowResponse).toBeDefined();
        expect(Array.isArray(f2FolderWorkflowResponse)).toBe(true);
        const [f2Workflow]: BoardResponseElementDto[] = f2FolderWorkflowResponse;
        expect(f2Workflow.columns).toBeDefined();
        const {columns: f2Columns} = f2Workflow;

        const f2Column = f2Columns.find(({id}) => id === folder2Workflow.WorkFlowStates[0].id);
        expect(f2Column).toBeDefined();
        expect(f2Column.tasks).toBeDefined();
        expect(Array.isArray(f2Column.tasks)).toBe(true);

        const {tasks: f2Tasks} = f2Column;

        // Folder 2 - B1
        expect(f2Tasks.length).toBe(1);
        expect(f2Tasks[0].id).toBe(folder2Task1.id);
        expect(f2Tasks[0].path).toEqual([folder2Task1.id]);

        // Folder 2 - B2
        const {body: f2Task} = await this.get(`${f2Tasks[0].id}/folder/${folder2.id}?show-all-children=true`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(f2Task.children.length).toBe(1);
        expect(f2Task.children[0].id).toBe(folder2Task2.id);
        expect(f2Task.children[0].pathIds).toEqual([folder2Task1.id, folder2Task2.id]);

        // Folder 2 - A1
        expect(f2Task.children[0].children.length).toBe(1);
        expect(f2Task.children[0].children[0].id).toBe(folder1Task1.id);
        expect(f2Task.children[0].children[0].pathIds).toEqual([folder2Task1.id, folder2Task2.id, folder1Task1.id]);

        // Folder 2 - A2
        expect(f2Task.children[0].children[0].children.length).toBe(1);
        expect(f2Task.children[0].children[0].children[0].id).toBe(folder1Task2.id);
        expect(f2Task.children[0].children[0].children[0].pathIds).toEqual([
            folder2Task1.id,
            folder2Task2.id,
            folder1Task1.id,
            folder1Task2.id,
        ]);

        this.logger.debug('archive folder2Task2');
        await this.post(`archive/${folder2Task2.id}/folder/${folder2.id}`, {archiveReason: 'for test'}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        this.logger.debug('Archived tasks should not be shown in the task list');
        const {body: f2ArchivedTask} = await this.get(
            `${folder2Task1.id}/folder/${folder2.id}?show-all-children=true`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(f2ArchivedTask.children.length).toBe(0);

        this.logger.debug('Archived tasks should be shown in the task list if set show archived children to true');
        const {body: f2ArchivedTask2} = await this.get(
            `${folder2Task1.id}/folder/${folder2.id}?show-all-children=true&show-archived-children=true`,
            jwtToken.accessToken
        ).expect(HttpStatus.OK);
        expect(f2ArchivedTask2.children.length).toBe(1);
        expect(f2ArchivedTask2.children[0].id).toBe(folder2Task2.id);
        expect(f2ArchivedTask2.children[0].archivedAt).toBeDefined();
        expect(f2ArchivedTask2.children[0].archivedAt).not.toBeNull();
        expect(f2ArchivedTask2.children[0].archivedBy).toBe(userId);
        expect(f2ArchivedTask2.children[0].archivedGroupId).toBeDefined();
        expect(f2ArchivedTask2.children[0].archivedGroupId).not.toBeNull();
    }

    @Test('Unshare a subtask should remove existing relation')
    async unshareSubTaskShouldRemoveExistingRelation(): Promise<void> {
        // 1. Create two folders
        this.logger.debug('create user and folder');
        const {folder: folder1, jwtToken, workflowDB, spaceId} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId);
        const folder1Workflow = await this.folderFactory.getFolderWorkFlow(folder1.id);
        const folder2Workflow = await this.folderFactory.getFolderWorkFlow(folder2.id);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        // 2. Create two tasks in folder 1
        this.logger.debug('Create two tasks in folder 1');
        const folder1FakeTasks = Array.from({length: 2}, () => this.factory.fakeCreateTask(userId, folder1.id));
        this.logger.debug('create tasks');
        const [{body: folder1Task1}, {body: folder1Task2}] = await Promise.all(
            folder1FakeTasks.map((fakeTask) => this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED))
        );
        const view = FolderViewOptions.BOARD;

        // 3. Make task 2 a subtask of task 1 in folder 1
        this.logger.debug('Make task 2 a subtask of task 1 in folder 1');
        const folder1SubtaskDto: UpdateTaskPositionDto = {
            view,
            index: 0,
            folderId: folder1.id,
            actualFolderId: folder1.id,
            columnId: folder1Workflow.WorkFlowStates[0].id,
            parentTaskNewId: folder1Task1.id,
        };
        await this.patch(`position/${folder1Task2.id}`, folder1SubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // 4. Share task 2 in folder 1 with folder 2
        this.logger.debug('Share task 2 in folder 1 with folder 2');
        const shareDto: TaskSharedDto = {
            folderId: folder2.id,
            fromFolderId: folder1.id,
            stateId: folder2Workflow.WorkFlowStates[0].id,
        };
        await this.post(`share/${folder1Task2.id}`, shareDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Task 2 relation should remain in folder 1');
        const checkTaskTwoRelationExist1 = await this.factory.dataSource.getRepository(TaskRelationEntity).existsBy({
            childTaskId: folder1Task2.id,
            folderId: folder1.id,
            parentTaskId: folder1Task1.id,
        });
        expect(checkTaskTwoRelationExist1).toBe(true);

        //5. Unshare task 2 from original folder should fail
        const {body} = await this.delete(`un-share/${folder1Task2.id}/${folder1.id}`, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);
        expect(body.message).toBe(`Can't unshare a task that is not binded`);
        //6. Unshare task 2 from folder 1
        await this.delete(`un-share/${folder1Task2.id}/${folder2.id}`, jwtToken.accessToken).expect(HttpStatus.OK);

        this.logger.debug('Task 2 relation should be removed from folder 2');
        const checkTaskTwoRelationExist2 = await this.factory.dataSource.getRepository(TaskRelationEntity).existsBy({
            childTaskId: folder1Task2.id,
            folderId: folder2.id,
            parentTaskId: folder1Task1.id,
        });
        expect(checkTaskTwoRelationExist2).toBe(false);
    }

    @Test('Subtask in a shared task should not be duplicated')
    async subtaskShouldNotBeDuplicated(): Promise<void> {
        // 1. Create two folders
        this.logger.debug('create user and folder');
        const {folder: folder1, jwtToken, workflowDB, spaceId} = await this.createFolder();
        const {folder: folder2} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId);
        const folder1Workflow = await this.folderFactory.getFolderWorkFlow(folder1.id);
        const folder2Workflow = await this.folderFactory.getFolderWorkFlow(folder2.id);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        // 2. Create two tasks in folder 1
        this.logger.debug('Create two tasks in folder 1');
        const folder1FakeTasks = Array.from({length: 2}, () => this.factory.fakeCreateTask(userId, folder1.id));
        this.logger.debug('create tasks');
        const [{body: folder1Task1}, {body: folder1Task2}] = await Promise.all(
            folder1FakeTasks.map((fakeTask) => this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED))
        );
        const view = FolderViewOptions.BOARD;

        // 3. Make task 2 a subtask of task 1 in folder 1
        this.logger.debug('Make task 2 a subtask of task 1 in folder 1');
        const folder1SubtaskDto: UpdateTaskPositionDto = {
            view,
            index: 0,
            folderId: folder1.id,
            actualFolderId: folder1.id,
            columnId: folder1Workflow.WorkFlowStates[0].id,
            parentTaskNewId: folder1Task1.id,
        };
        await this.patch(`position/${folder1Task2.id}`, folder1SubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // 4. Share task 2 in folder 1 with folder 2
        this.logger.debug('Share task 1 in folder 1 with folder 2');
        const shareDto: TaskSharedDto = {
            folderId: folder2.id,
            fromFolderId: folder1.id,
            stateId: folder2Workflow.WorkFlowStates[0].id,
        };
        await this.post(`share/${folder1Task1.id}`, shareDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        // 5. Shared task1 in folders should only contain one subtask
        this.logger.debug('Shared task1 in folders should only contain one subtask');
        const {body: taskResponse} = await this.get(`${folder1Task1.id}/folder/${folder1.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(taskResponse.id).toBe(folder1Task1.id);
        expect(taskResponse.children).toHaveLength(1);
        expect(taskResponse.children[0].id).toBe(folder1Task2.id);
    }

    /**
     * Moves a task from one parent another task within a folder's workflow.
     *
     * Steps:
     * 1. Creates a user and a folder.
     * 2. Retrieves the folder and user IDs from the access token.
     * 3. Creates two fake tasks associated with the user and folder.
     * 4. Moves the task to a specific task within the folder's workflow.
     *
     * @returns {Promise<void>} A Promise that resolves when the task has been moved.
     */
    @Test('Change Task Parent')
    async changeTaskParent(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create parent task');
        const fakeParentTask1 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: parentTask1} = await this.post(``, fakeParentTask1, jwtToken.accessToken).expect(HttpStatus.CREATED);
        const fakeParentTask2 = this.factory.fakeCreateTask(userId, folder.id);
        const {body: parentTask2} = await this.post(``, fakeParentTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('create child task');
        const fakeTask2 = this.factory.fakeCreateTask(userId, folder.id, parentTask1.id);
        const {body: task2} = await this.post(``, fakeTask2, jwtToken.accessToken).expect(HttpStatus.CREATED);
        this.logger.debug('move task');
        const workFlowEntity = await this.folderFactory.getFolderWorkFlow(folder.id);
        const moveTaskDto: UpdateTaskPositionDto = {
            parentTaskOldId: parentTask1.id,
            parentTaskNewId: parentTask2.id,
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task2.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: parentTask} = await this.get(`${parentTask2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(parentTask.id).toBe(parentTask2.id);
        const foundChild = parentTask.children.find((child) => child.id === task2.id);
        expect(foundChild).toBeDefined();

        const moveTaskDto2: UpdateTaskPositionDto = {
            parentTaskOldId: parentTask1.id,
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workFlowEntity.WorkFlowStates[workFlowEntity.WorkFlowStates.length - 1].id,
            index: 1,
            view: FolderViewOptions.BOARD,
        };
        await this.patch(`position/${task2.id}`, moveTaskDto2, jwtToken.accessToken).expect(HttpStatus.OK);
        const {body: rootTask} = await this.get(`${task2.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(rootTask.id).toBe(task2.id);
        expect(rootTask.parents.length).toBe(0);
    }

    /**
     * Sharing a task with subtask to another folder, then moving tasks to different columns
     *
     * Steps:
     * 1. Create 2 different workflows
     * 2. Create folder 1 with workflow 1
     * 3. Create folder 2 with workflow 2
     * 4. Create 2 tasks in folder 1
     * 5. Make task 2 a subtask of task 1
     * 6. Share task 1 with folder 2
     * 7. Change workflow state of task 2 in folder 1 to invalid workflow
     *    -> Expect Bad Request error
     */
    @Test('Move subtask of shared task to invalid column')
    async moveSharedSubtaskToInvalidColumn(): Promise<void> {
        this.logger.debug('create user and login');
        const {token: jwtToken} = await this.userSuite.createSuperAdminUser();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const view = FolderViewOptions.BOARD;

        // 1. Create 2 different workflows
        const workflow1 = await this.createWorkflowForFolder(jwtToken.accessToken);
        const workflow2 = await this.createWorkflowForFolder(jwtToken.accessToken);
        expect(workflow1.id !== workflow2.id).toBe(true);

        // 2. Create folder 1 with workflow 1
        const {folder: folder1, spaceId} = await this.createFolder(null, jwtToken, workflow1.id);
        this.logger.debug('Adding workflow 2 to space');
        await this.patch(`/space/${spaceId}`, {moduleWorkflows: {insert: [workflow2.id], delete: []}}, jwtToken.accessToken);

        // 3. Create folder 2 with workflow 2
        const {folder: folder2} = await this.createFolder(null, jwtToken, workflow2.id, spaceId);
        const {body: workflows} = await this.post(`/folder-workflow/project`, [folder1.id, folder2.id], jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        const folder1Workflow: ProjectWorkFlowResponseDto = workflows.find(({folderId}) => folderId === folder1.id);
        const folder2Workflow: ProjectWorkFlowResponseDto = workflows.find(({folderId}) => folderId === folder2.id);
        expect(folder1Workflow).toBeDefined();
        expect(folder2Workflow).toBeDefined();
        expect(folder1Workflow.id).toBe(workflow1.id);
        expect(folder2Workflow.id).toBe(workflow2.id);

        // 4. Create 2 tasks in folder 1
        const fakeTasks = Array.from({length: 2}, () => this.factory.fakeCreateTask(userId, folder1.id));
        this.logger.debug('create task');
        const [{body: task1}, {body: task2}] = await Promise.all(
            fakeTasks.map((fakeTask) => this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED))
        );

        // 5. Make task 2 a subtask of task 1
        const createSubtaskDto: UpdateTaskPositionDto = {
            view,
            index: 0,
            folderId: folder1.id,
            actualFolderId: folder1.id,
            columnId: folder1Workflow.states[0].id,
            parentTaskNewId: task1.id,
        };
        await this.patch(`position/${task2.id}`, createSubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // 6. Share task 1 with folder 2
        const shareDto: TaskSharedDto = {
            folderId: folder2.id,
            fromFolderId: folder1.id,
            stateId: folder2Workflow.states[0].id,
        };

        const {body: sharedTask} = await this.post(`share/${task1.id}`, shareDto, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(sharedTask).toBeDefined();
        expect(sharedTask.folderId).toBe(folder2.id);
        expect(sharedTask.workflowStateId).toBe(folder2Workflow.states[0].id);

        // 7. Change workflow state of task 2 in folder 1 to invalid workflow
        const updateSubtaskDto: UpdateTaskPositionDto = {
            view,
            index: 0,
            folderId: folder1.id,
            actualFolderId: folder1.id,
            columnId: folder2Workflow.states[0].id, // <-- invalid workflow state
        };
        await this.patch(`position/${task2.id}`, updateSubtaskDto, jwtToken.accessToken).expect(HttpStatus.BAD_REQUEST);

        updateSubtaskDto.columnId = folder1Workflow.states[1].id; // <-- valid workflow state
        await this.patch(`position/${task2.id}`, updateSubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
    }

    @Test('Convert subtask to a task')
    async convertSubtaskToTask(): Promise<void> {
        this.logger.debug('create user and login');
        const {folder, jwtToken, workflowDB} = await this.createFolder();
        const {folder: subFolder} = await this.createFolder(folder.id, jwtToken, workflowDB.id);
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        this.logger.debug('create 2 tasks');
        const fakeTasks = Array.from({length: 2}, () => this.factory.fakeCreateTask(userId, subFolder.id));
        this.logger.debug('create task');
        const [{body: task1}, {body: task2}] = await Promise.all(
            fakeTasks.map((fakeTask) => this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED))
        );

        const {body: workflows} = await this.post(`/folder-workflow/project`, [subFolder.id], jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const folderWorkflow: ProjectWorkFlowResponseDto = workflows.find(({folderId}) => folderId === subFolder.id);
        expect(folderWorkflow).toBeDefined();

        this.logger.debug('make task 2 a subtask of task 1');
        const createSubtaskDto: UpdateTaskPositionDto = {
            index: 0,
            folderId: subFolder.id,
            actualFolderId: subFolder.id,
            columnId: folderWorkflow.states[0].id,
            parentTaskNewId: task1.id,
            view: FolderViewOptions.BOARD,
        };
        const {body: subtask} = await this.patch(`position/${task2.id}`, createSubtaskDto, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(subtask.id).toBe(task2.id);
        expect(subtask.parents.includes(task1.id)).toBe(true);

        this.logger.debug('convert subtask to a task');
        const convertToTaskDto: UpdateTaskPositionDto = {
            actualFolderId: subFolder.id,
            columnId: folderWorkflow.states[0].id,
            folderId: folder.id,
            index: 0,
            parentTaskOldId: task1.id,
            view: FolderViewOptions.BOARD,
        };

        const {body: convertedTask} = await this.patch(`position/${task2.id}`, convertToTaskDto, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(convertedTask.id).toBe(task2.id);
        expect(convertedTask.parentTaskId).toBe(null);
    }

    @Test('Test automation task response validator')
    async testTaskAutomationResponse(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        this.logger.debug('create task');
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        fakeTask.endDate = moment().add(39, 'seconds').toDate();
        fakeTask.duration = moment(fakeTask.endDate).diff(moment(fakeTask.startDate), 'd', true);

        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());

        this.logger.debug('add owner as assignee to task');
        const data: TaskAssigneesDto = {
            folderId: folder.id,
            assignees: [userId],
        };
        await this.patch(`assignees/${task.id}`, data, jwtToken.accessToken).expect(HttpStatus.OK);

        const {body: taskResponse} = await this.post(`automationstmduetasks`, {folderId: folder.id}, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(taskResponse).toHaveLength(1);
        expect(Number(taskResponse[0].taskId)).toBe(task.id);
        expect(Number(taskResponse[0].folderId)).toBe(folder.id);
        expect(taskResponse[0].assignees).toEqual([userId]);
    }

    @Test('Attachment Url must change every time')
    async attachmentUrlMustChange(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.id).toBeDefined();
        const fakeFiles = await this.taskAttachmentFactory.fakeFiles();
        this.logger.debug('create task attachment');
        const {body: taskAttachment} = await this.post(
            `/task-attachment/upload/${task.id}/folder/${folder.id}`,
            undefined,
            jwtToken.accessToken,
            fakeFiles
        ).expect(HttpStatus.CREATED);
        expect(taskAttachment).toHaveLength(fakeFiles.length);
        expect(taskAttachment[0].originalName).toBe(fakeFiles[0].path);

        this.logger.debug('Get task attachments');
        const attachments1 = await this.get(`/task-attachment/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(attachments1.body).toBeDefined();
        expect(attachments1.body.length).toBe(1);
        expect(attachments1.body[0].originalName).toBe(fakeFiles[0].path);

        this.logger.debug('Sleep 5 seconds');
        await sleep(5 * 1000);

        this.logger.debug('Get task attachments again');
        const attachments2 = await this.get(`/task-attachment/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(attachments2.body).toBeDefined();
        expect(attachments2.body.length).toBe(1);
        expect(attachments2.body[0].originalName).toBe(fakeFiles[0].path);

        expect(attachments1.body[0].fileNameUrl).not.toBe(attachments2.body[0].fileNameUrl);
        expect(attachments1.body[0].thumbnailUrl).not.toBe(attachments2.body[0].thumbnailUrl);
    }

    // @Test('Custom Fields Collection Attach/Delete on Space,Folder,Tasks')
    // async customFieldsCollectionAttachDeleteSpaceFolderTask(): Promise<void> {
    //     this.logger.debug('create user and folder');
    //     const {folder: pFolder, spaceId, jwtToken, workflowDB} = await this.createFolder();
    //     const {folder: cFolder} = await this.createFolder(pFolder.id, jwtToken, workflowDB.id);
    //     const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
    //     this.logger.debug('create parent folder task and sub task');
    //     const pFakeTask = this.factory.fakeCreateTask(userId, pFolder.id);
    //
    //     const {body: pTask} = await this.post(``, pFakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
    //     const pFakeSubTask = this.factory.fakeCreateTask(userId, pFolder.id, pTask.id);
    //     const {body: pSubTask} = await this.post(``, pFakeSubTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
    //
    //     this.logger.debug('create child folder task and sub task');
    //     const cFakeTask = this.factory.fakeCreateTask(userId, cFolder.id);
    //     const {body: cTask} = await this.post(``, cFakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
    //
    //     const cFakeSubTask = this.factory.fakeCreateTask(userId, cFolder.id, cTask.id);
    //     const {body: cSubTask} = await this.post(``, cFakeSubTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
    //
    //     this.logger.debug('create custom fields and attach to space');
    //     const customFieldIds = await this.createManyCustomFields(2, CustomFieldDefinitionTypeOptions.TEXT, jwtToken.accessToken);
    //     await this.post(
    //         `/space/${spaceId}/custom-field-value`,
    //         {
    //             insert: [
    //                 {id: customFieldIds[0], value: ''},
    //                 {id: customFieldIds[1], value: ''},
    //             ],
    //         },
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.CREATED);
    //
    //     this.logger.debug('create custom field collection and assign to space');
    //     const customFieldCollection = await this.createSpaceCustomFieldCollection(jwtToken.accessToken, 2);
    //     await this.patch(
    //         `/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     this.logger.debug('assign custom field collection to folder');
    //     await this.patch(
    //         `/folder/${pFolder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `/folder/${cFolder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [customFieldCollection.id], delete: []}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     this.logger.debug('assign custom field to folder');
    //     await this.post(
    //         `/folder/custom-field-value/${pFolder.id}/space/${spaceId}`,
    //         {
    //             insert: [
    //                 {id: customFieldIds[0], value: ''},
    //                 {id: customFieldIds[1], value: ''},
    //             ],
    //             delete: [],
    //         },
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.CREATED);
    //
    //     await this.post(
    //         `/folder/custom-field-value/${cFolder.id}/space/${spaceId}`,
    //         {
    //             insert: [
    //                 {id: customFieldIds[0], value: ''},
    //                 {id: customFieldIds[1], value: ''},
    //             ],
    //             delete: [],
    //         },
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.CREATED);
    //
    //     this.logger.debug('add custom field value to tasks');
    //     const customField1Value = 'abc';
    //     const customFieldCollection1Value = 'def';
    //     await this.patch(
    //         `custom-field/${customFieldIds[0]}/folder/${pFolder.id}/task/${pTask.id}?value=${customField1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `custom-field/${customFieldIds[0]}/folder/${pFolder.id}/task/${pSubTask.id}?value=${customField1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `custom-field/${customFieldIds[0]}/folder/${cFolder.id}/task/${cTask.id}?value=${customField1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `custom-field/${customFieldIds[0]}/folder/${cFolder.id}/task/${cSubTask.id}?value=${customField1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `custom-field/${customFieldCollection.customFields[0].id}/folder/${pFolder.id}/task/${pTask.id}?value=${customFieldCollection1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `custom-field/${customFieldCollection.customFields[0].id}/folder/${pFolder.id}/task/${pSubTask.id}?value=${customFieldCollection1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `custom-field/${customFieldCollection.customFields[0].id}/folder/${cFolder.id}/task/${cTask.id}?value=${customFieldCollection1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `custom-field/${customFieldCollection.customFields[0].id}/folder/${cFolder.id}/task/${cSubTask.id}?value=${customFieldCollection1Value}`,
    //         {},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     this.logger.debug('delete custom field and collection from space');
    //     await this.post(
    //         `/space/${spaceId}/custom-field-value`,
    //         {
    //             insert: [],
    //             delete: [
    //                 {id: customFieldIds[0], value: ''},
    //                 {id: customFieldIds[1], value: ''},
    //             ],
    //         },
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.CREATED);
    //
    //     await this.patch(
    //         `/space/${spaceId}`,
    //         {customFieldCollections: {insert: [], delete: [customFieldCollection.id]}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     this.logger.debug('delete custom field collection from folder');
    //     await this.patch(
    //         `/folder/${pFolder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [], delete: [customFieldCollection.id]}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     await this.patch(
    //         `/folder/${cFolder.id}/space/${spaceId}`,
    //         {customFieldCollections: {insert: [], delete: [customFieldCollection.id]}},
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.OK);
    //
    //     this.logger.debug('delete custom field from folder');
    //     await this.post(
    //         `/folder/custom-field-value/${pFolder.id}/space/${spaceId}`,
    //         {
    //             insert: [],
    //             delete: [
    //                 {id: customFieldIds[0], value: ''},
    //                 {id: customFieldIds[1], value: ''},
    //             ],
    //         },
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.CREATED);
    //
    //     await this.post(
    //         `/folder/custom-field-value/${cFolder.id}/space/${spaceId}`,
    //         {
    //             insert: [],
    //             delete: [
    //                 {id: customFieldIds[0], value: ''},
    //                 {id: customFieldIds[1], value: ''},
    //             ],
    //         },
    //         jwtToken.accessToken
    //     ).expect(HttpStatus.CREATED);
    //
    //     this.logger.debug('checking custom field on task of parent folder should be the one with value');
    //     const {body: pTaskCF} = await this.get(`custom-field/space/${spaceId}/folder/${pFolder.id}/task/${pTask.id}`, jwtToken.accessToken).expect(
    //         HttpStatus.OK
    //     );
    //     expect(pTaskCF.customFields).toHaveLength(2);
    //     const cfpT1 = pTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldIds[0]);
    //     expect(cfpT1).toHaveLength(1);
    //     expect(cfpT1[0].value).toBe(customField1Value);
    //     const cfCpT1 = pTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldCollection.customFields[0].id);
    //     expect(cfCpT1).toHaveLength(1);
    //     expect(cfCpT1[0].value).toBe(customFieldCollection1Value);
    //
    //     const {body: pSubTaskCF} = await this.get(`custom-field/space/${spaceId}/folder/${pFolder.id}/task/${pSubTask.id}`, jwtToken.accessToken).expect(
    //         HttpStatus.OK
    //     );
    //     expect(pSubTaskCF.customFields).toHaveLength(2);
    //     const cfpST1 = pSubTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldIds[0]);
    //     expect(cfpST1).toHaveLength(1);
    //     expect(cfpST1[0].value).toBe(customField1Value);
    //     const cfCpST1 = pSubTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldCollection.customFields[0].id);
    //     expect(cfCpST1).toHaveLength(1);
    //     expect(cfCpST1[0].value).toBe(customFieldCollection1Value);
    //
    //     this.logger.debug('checking custom field on task of child folder should be the one with value');
    //     const {body: cTaskCF} = await this.get(`custom-field/space/${spaceId}/folder/${cFolder.id}/task/${cTask.id}`, jwtToken.accessToken).expect(
    //         HttpStatus.OK
    //     );
    //     expect(cTaskCF.customFields).toHaveLength(2);
    //     const cfcT1 = cTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldIds[0]);
    //     expect(cfcT1).toHaveLength(1);
    //     expect(cfcT1[0].value).toBe(customField1Value);
    //     const cfCcT1 = cTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldCollection.customFields[0].id);
    //     expect(cfCcT1).toHaveLength(1);
    //     expect(cfCcT1[0].value).toBe(customFieldCollection1Value);
    //
    //     const {body: cSubTaskCF} = await this.get(`custom-field/space/${spaceId}/folder/${cFolder.id}/task/${cSubTask.id}`, jwtToken.accessToken).expect(
    //         HttpStatus.OK
    //     );
    //     expect(cSubTaskCF.customFields).toHaveLength(2);
    //     const cfcST1 = cSubTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldIds[0]);
    //     expect(cfcST1).toHaveLength(1);
    //     expect(cfcST1[0].value).toBe(customField1Value);
    //     const cfCcST1 = cSubTaskCF.customFields.filter((cf) => cf.customFieldDefinitionId === customFieldCollection.customFields[0].id);
    //     expect(cfCcST1).toHaveLength(1);
    //     expect(cfCcST1[0].value).toBe(customFieldCollection1Value);
    // }

    /**
     * Creates a custom field on a task and check its position.
     *
     * @returns {Promise<void>} - a Promise that resolves when the custom field is created successfully
     */
    @Test('Custom Field Position of a task')
    async createCustomFieldPositionOnTask(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
        expect(task.startDate).toBeDateEqualWithoutMilliseconds(fakeTask.startDate.toISOString());
        const customFieldIds = await this.createManyCustomFields(4, CustomFieldDefinitionTypeOptions.TEXT, jwtToken.accessToken, spaceId);

        const userCustomFieldIds = await this.createManyUserCustomFields(
            4,
            CustomFieldDefinitionTypeOptions.TEXT,
            jwtToken.accessToken,
            spaceId
        );

        // this.logger.debug('assign custom field to space');
        // await this.post(
        //     `/space/${spaceId}/custom-field-value`,
        //     {
        //         insert: [
        //             {id: customFieldIds[0], value: ''},
        //             {id: customFieldIds[1], value: ''},
        //             {id: customFieldIds[2], value: ''},
        //             {id: customFieldIds[3], value: ''},
        //             {id: userCustomFieldIds[0], value: ''},
        //             {id: userCustomFieldIds[1], value: ''},
        //             {id: userCustomFieldIds[2], value: ''},
        //             {id: userCustomFieldIds[3], value: ''},
        //         ],
        //     },
        //     jwtToken.accessToken
        // ).expect(HttpStatus.CREATED);

        this.logger.debug('assign custom field to folder');
        await this.post(
            `/folder/custom-field-value/${folder.id}/space/${spaceId}`,
            {
                insert: [
                    {id: customFieldIds[0], value: '1'},
                    {id: customFieldIds[1], value: '2'},
                    {id: customFieldIds[2], value: '3'},
                    {id: customFieldIds[3], value: '4'},
                    {id: userCustomFieldIds[0], value: '5'},
                    {id: userCustomFieldIds[1], value: '6'},
                    {id: userCustomFieldIds[2], value: '7'},
                    {id: userCustomFieldIds[3], value: '8'},
                ],
                delete: [],
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('create common custom field position');
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: customFieldIds[3],
                index: 0,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: customFieldIds[2],
                index: 1,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: customFieldIds[1],
                index: 4,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: customFieldIds[0],
                index: 5,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('create common custom field position');
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: userCustomFieldIds[3],
                index: 2,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: userCustomFieldIds[2],
                index: 3,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: userCustomFieldIds[1],
                index: 6,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `custom-field/position`,
            {
                taskId: task.id,
                folderId: folder.id,
                customFieldId: userCustomFieldIds[0],
                index: 7,
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        const {body: allCustomFields} = await this.get(`custom-field/folder/${folder.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );

        this.logger.debug('check common custom fields position');
        const commonCustomFields = allCustomFields.customFields;
        expect(commonCustomFields[0].customFieldDefinitionId).toBe(customFieldIds[3]);
        expect(commonCustomFields[0].index).toBe(0);

        expect(commonCustomFields[1].customFieldDefinitionId).toBe(customFieldIds[2]);
        expect(commonCustomFields[1].index).toBe(1);

        expect(commonCustomFields[4].customFieldDefinitionId).toBe(customFieldIds[1]);
        expect(commonCustomFields[4].index).toBe(4);

        expect(commonCustomFields[6].customFieldDefinitionId).toBe(customFieldIds[0]);
        expect(commonCustomFields[6].index).toBe(6);

        this.logger.debug('check user custom fields position');
        const userCustomFields = allCustomFields.customFields;
        expect(userCustomFields[2].customFieldDefinitionId).toBe(userCustomFieldIds[3]);
        expect(userCustomFields[2].index).toBe(2);

        expect(userCustomFields[3].customFieldDefinitionId).toBe(userCustomFieldIds[2]);
        expect(userCustomFields[3].index).toBe(3);

        expect(userCustomFields[5].customFieldDefinitionId).toBe(userCustomFieldIds[1]);
        expect(userCustomFields[5].index).toBe(5);

        expect(userCustomFields[7].customFieldDefinitionId).toBe(userCustomFieldIds[0]);
        expect(userCustomFields[7].index).toBe(7);
    }

    @Test('Replicate task')
    async replicateTask(): Promise<void> {
        const taskRepo = this.dataSource.getRepository(TaskEntity),
            taskAttachementRepo = this.dataSource.getRepository(TaskAttachmentEntity);
        this.logger.debug('create users');
        const {token} = await this.userSuite.createSuperUser();
        const {token: token2} = await this.userSuite.createSuperUser();
        const {token: token3} = await this.userSuite.createSuperUser();

        const creatorId = this.getUserIdFromAccessToken(token.accessToken);
        const user1Id = this.getUserIdFromAccessToken(token2.accessToken);
        const user2Id = this.getUserIdFromAccessToken(token3.accessToken);

        this.logger.debug('create workflow');
        const workflow = await this.createWorkflowForFolder(token.accessToken);

        this.logger.debug('create space1 with two members, two tags and two custom field definitions');
        const members = [
            {id: user1Id, userPermission: UserPermissionOptions.FULL},
            {id: user2Id, userPermission: UserPermissionOptions.FULL},
        ];
        const fakeTag = this.tagFactory.fakeCreateTag();
        const fakeTag2 = this.tagFactory.fakeCreateTag();
        const spaceTags = [fakeTag, fakeTag2];
        const fakeCf1 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition();
        const fakeCf2 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition();
        const spaceCustomFields = [fakeCf1, fakeCf2];
        const fakeCreateSpace = this.folderFactory.fakeCreateSpace({
            moduleWorkflows: [workflow.id],
            members,
            spaceTags,
            spaceCustomFields,
        });
        const {body: spaceResponse} = await this.post(`/space`, fakeCreateSpace, token.accessToken).expect(HttpStatus.CREATED);
        const {body: spaceDb} = await this.get(`/space`, token.accessToken).expect(HttpStatus.OK);
        expect(spaceDb).toHaveLength(1);
        expect(spaceDb[0].spaceTags).toHaveLength(2);
        expect(spaceDb[0].spaceCustomFields).toHaveLength(2);
        const [tagDb1, tagDb2] = spaceDb[0].spaceTags;
        const [CF1, CF2] = spaceDb[0].spaceCustomFields;

        this.logger.debug('create folder1 in space 1 with two members');

        const fakeFolder = this.folderFactory.fakeCreateFolder(
            workflow.id,
            null,
            DefaultViewOptions.BOARD,
            [TASK_MANAGEMENT],
            spaceResponse.id,
            null,
            null,
            members
        );
        const {body: folder1} = await this.post(`/folder`, fakeFolder, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create space2 with 1 co-exist member, tag and custom field');
        const space2members = [{id: user1Id, userPermission: UserPermissionOptions.FULL}];
        const fakeCreateSpace2 = this.folderFactory.fakeCreateSpace({
            moduleWorkflows: [workflow.id],
            members: space2members,
            spaceTags: [fakeTag2],
            spaceCustomFields: [fakeCf2],
        });
        const {body: space2Response} = await this.post(`/space`, fakeCreateSpace2, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create folder2 in space 2with 1 member');
        const fakeFolder2 = this.folderFactory.fakeCreateFolder(
            workflow.id,
            null,
            DefaultViewOptions.BOARD,
            [TASK_MANAGEMENT],
            space2Response.id,
            null,
            null,
            space2members
        );
        const {body: folder2} = await this.post(`/folder`, fakeFolder2, token.accessToken).expect(HttpStatus.CREATED);
        expect(folder2).toBeDefined();

        this.logger.debug('create one task in folder 2');
        const fakeTask2 = this.factory.fakeCreateTask(creatorId, folder2.id);
        const {body: taskResponse2} = await this.post(``, fakeTask2, token.accessToken).expect(HttpStatus.CREATED);
        const fakeSubTask2 = this.factory.fakeCreateTask(creatorId, folder2.id, taskResponse2.id);
        const {body: subTaskResponse2} = await this.post(``, fakeSubTask2, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create two personal tags');
        const fakePersonalTag1 = await this.tagFactory.createTag(user1Id, null);
        const fakePersonalTag2 = await this.tagFactory.createTag(user2Id, null);
        expect(fakePersonalTag1).toBeDefined();
        expect(fakePersonalTag2).toBeDefined();

        this.logger.debug('create one task in folder 1 with two tags and a sub-task, assign user1 and user2 to the task');
        const fakeTask = this.factory.fakeCreateTask(creatorId, folder1.id, null, [
            tagDb1.id,
            tagDb2.id,
            fakePersonalTag1.id,
            fakePersonalTag2.id,
        ]);
        fakeTask.assignees = [user1Id, user2Id];
        const {body: taskResponse} = await this.post(``, fakeTask, token.accessToken).expect(HttpStatus.CREATED);
        const fakeSubTask = this.factory.fakeCreateTask(creatorId, folder1.id, taskResponse.id);
        const {body: subTaskResponse} = await this.post(``, fakeSubTask, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create a task attachment');
        const fakeFiles = await this.taskAttachmentFactory.fakeFiles();
        await this.post(`/task-attachment/upload/${taskResponse.id}/folder/${folder1.id}`, undefined, token.accessToken, fakeFiles).expect(
            HttpStatus.CREATED
        );

        this.logger.debug('create a comment with mentioning two members and an attachment');
        const commentDto: CreateTaskActionDto = {
            comment: faker.string.alphanumeric(20),
            mentionMembers: [user1Id, user2Id],
        };
        const {body: commentResponse} = await this.post(
            `/task-action/folder/${folder1.id}/task/${taskResponse.id}/comment`,
            commentDto,
            token.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: uploadResponse} = await this.post(
            `/task-action/upload/folder/${folder1.id}/task/${taskResponse.id}/comment/${commentResponse.identifiers[0].id}`,
            undefined,
            token.accessToken,
            fakeFiles
        ).expect(HttpStatus.CREATED);
        expect(uploadResponse).toHaveLength(1);
        expect(uploadResponse[0].TaskAction.id).toBe(commentResponse.identifiers[0].id);

        this.logger.debug('User1 and User2 like the comment');
        await this.post(
            `/task-action/folder/${folder1.id}/task/${taskResponse.id}/comment/${commentResponse.identifiers[0].id}/like`,
            {},
            token2.accessToken
        ).expect(HttpStatus.CREATED);
        await this.post(
            `/task-action/folder/${folder1.id}/task/${taskResponse.id}/comment/${commentResponse.identifiers[0].id}/like`,
            {},
            token3.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('create custom field value in task');
        await this.post(
            `custom-field/space/${spaceResponse.id}/folder/${folder1.id}/task/${taskResponse.id}`,
            {insert: [CF1.id, CF2.id]},
            token.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('Verify task');
        const {body: taskDb1} = await this.get(`${taskResponse.id}/folder/${folder1.id}`, token.accessToken).expect(HttpStatus.OK);
        expect(taskDb1.spaceId).toBe(spaceResponse.id);
        expect(taskDb1.children).toHaveLength(1);
        expect(taskDb1.children[0].id).toBe(subTaskResponse.id);
        expect(taskDb1.followers).toHaveLength(3);
        expect(taskDb1.followers).toEqual(expect.arrayContaining([creatorId, user1Id, user2Id]));
        expect(taskDb1.assignees).toHaveLength(2);
        expect(taskDb1.assignees).toEqual(expect.arrayContaining([user1Id, user2Id]));
        expect(taskDb1.tags).toHaveLength(2);
        expect(taskDb1.tags).toEqual(expect.arrayContaining([tagDb1.id, tagDb2.id]));

        const {body: taskCFDb} = await this.get(`custom-field/folder/${folder1.id}/task/${taskDb1.id}`, token.accessToken).expect(
            HttpStatus.OK
        );
        expect(taskCFDb.customFields).toHaveLength(2);
        expect(taskCFDb.customFields.map((cf) => cf.customFieldDefinitionId)).toEqual(expect.arrayContaining([CF1.id, CF2.id]));

        this.logger.debug('Verify comment');
        const {Actions: taskActions} = await taskRepo.findOne({
            where: {
                id: taskResponse.id,
                Actions: {action: In([TaskActionOptions.COMMENT, TaskActionOptions.COMMENT_REACTION])},
            },
            relations: {Actions: {Attachments: true}},
        });
        expect(taskActions).toHaveLength(1);
        expect(taskActions[0].mentionMembers).toHaveLength(2);
        expect(taskActions[0].mentionMembers).toEqual([user1Id, user2Id]);
        expect(taskActions[0].likes).toHaveLength(2);
        expect(taskActions[0].likes).toEqual([expect.objectContaining({userId: user1Id}), expect.objectContaining({userId: user2Id})]);
        expect(taskActions[0].Attachments).toHaveLength(1);
        expect(taskActions[0].Attachments[0].originalName).toBe(fakeFiles[0].path);

        this.logger.debug('Verify task attachement');
        const taskAttachmentDb = await taskAttachementRepo.find({where: {taskId: taskResponse.id}});
        expect(taskAttachmentDb).toHaveLength(1);
        expect(taskAttachmentDb[0].originalName).toBe(fakeFiles[0].path);
        this.logger.debug('Replicate not existing task to folder 2 should fail');
        const replicateTaskFailDto: ReplicateTaskDto = {
            origin: {
                spaceId: spaceResponse.id,
                folderId: folder2.id,
            },
            destination: {
                spaceId: space2Response.id,
                folderId: folder2.id,
            },
            withAssignees: true,
            withComments: true,
            withCustomFields: true,
            withFiles: true,
            withFollowers: true,
            withSubTasks: true,
            withTags: true,
        };
        await this.post(`replicate/${taskDb1.id}`, replicateTaskFailDto, token.accessToken)
            .expect(HttpStatus.NOT_FOUND)
            .catch((e) =>
                expect(e.message).toBe(`Task with id ${taskDb1.id} found in Gantt Model for folder ${replicateTaskFailDto.origin.folderId}`)
            );
        this.logger.debug('Replicate task to folder 2 as root');
        const replicateTaskDto: ReplicateTaskDto = {
            origin: {
                spaceId: spaceResponse.id,
                folderId: folder1.id,
            },
            destination: {
                spaceId: space2Response.id,
                folderId: folder2.id,
            },
            withAssignees: true,
            withComments: true,
            withCustomFields: true,
            withFiles: true,
            withFollowers: true,
            withSubTasks: true,
            withTags: true,
        };
        const {body: duplicateTaskResponse} = await this.post(`replicate/${taskDb1.id}`, replicateTaskDto, token.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(duplicateTaskResponse.id).toBeDefined();

        this.logger.debug('Detail for task should be identical except for id and createdAt');
        expect(duplicateTaskResponse.title).toBe(taskResponse.title);
        expect(duplicateTaskResponse.description).toBe(taskResponse.description);
        expect(duplicateTaskResponse.userId).toBe(taskResponse.userId);
        expect(duplicateTaskResponse.id).not.toBe(taskResponse.id);
        expect(duplicateTaskResponse.createdAt).not.toBe(taskResponse.createdAt);
        expect(duplicateTaskResponse.children).toHaveLength(1);
        expect(duplicateTaskResponse.children[0].id).toBeDefined();

        const {body: clonedSubTask} = await this.get(
            `${duplicateTaskResponse.children[0].id}/folder/${folder2.id}`,
            token.accessToken
        ).expect(HttpStatus.OK);
        expect(clonedSubTask.id).not.toBe(subTaskResponse.id);
        expect(clonedSubTask.title).toBe(subTaskResponse.title);
        expect(clonedSubTask.description).toBe(subTaskResponse.description);
        expect(clonedSubTask.userId).toBe(subTaskResponse.userId);
        expect(clonedSubTask.createdAt).not.toBe(subTaskResponse.createdAt);

        this.logger.debug(
            'Cloned task should be found from folder2, tag2 and CF2 should also be added to space2 and the clonedTask, all entities should have a new id but with the same title'
        );
        const {body: clonedTaskDB} = await this.get(`${duplicateTaskResponse.id}/folder/${folder2.id}`, token.accessToken).expect(
            HttpStatus.OK
        );
        expect(clonedTaskDB.spaceId).toBe(space2Response.id);
        expect(clonedTaskDB.children).toHaveLength(1);
        expect(clonedTaskDB.children[0].id).toBe(clonedSubTask.id);

        this.logger.debug('User 2 should not be in the followers and assigness as he has no access to space2 or folder2');
        expect(clonedTaskDB.followers).toHaveLength(2);
        expect(clonedTaskDB.followers).toEqual(expect.arrayContaining([creatorId, user1Id]));
        expect(clonedTaskDB.assignees).toHaveLength(1);
        expect(clonedTaskDB.assignees).toEqual(expect.arrayContaining([user1Id]));

        this.logger.debug('Tags should be cloned');
        expect(clonedTaskDB.tags).toHaveLength(2);
        const clonedTagsDB = await this.dataSource.getRepository(TagEntity).find({where: {id: In(clonedTaskDB.tags)}});
        expect(clonedTagsDB).toHaveLength(2);
        const clonedTag1 = clonedTagsDB.find((tag) => tag.title === tagDb1.title);
        expect(clonedTag1.id).not.toBe(tagDb1.id);
        const clonedTag2 = clonedTagsDB.find((tag) => tag.title === tagDb2.title);
        expect(clonedTag2.id).not.toBe(tagDb2.id);

        this.logger.debug('Custom Fields should be cloned');
        const {body: clonedTaskCFdb} = await this.get(
            `custom-field/folder/${folder2.id}/task/${duplicateTaskResponse.id}`,
            token.accessToken
        ).expect(HttpStatus.OK);
        expect(clonedTaskCFdb.customFields).toHaveLength(2);
        const clonedCF1 = clonedTaskCFdb.customFields.find((cf) => cf.CustomFieldDefinition.title === CF1.title);
        expect(clonedCF1.id).not.toBe(CF1.id);
        const clonedCF2 = clonedTaskCFdb.customFields.find((cf) => cf.CustomFieldDefinition.title === CF2.title);
        expect(clonedCF2.id).not.toBe(CF2.id);

        this.logger.debug('Comment should be cloned and only User1 should remain in the mentioned and liked array');
        const {Actions} = await taskRepo.findOne({
            where: {
                id: duplicateTaskResponse.id,
                Actions: {action: In([TaskActionOptions.COMMENT, TaskActionOptions.COMMENT_REACTION])},
            },
            relations: {Actions: true},
        });
        expect(Actions).toHaveLength(1);
        expect(Actions[0].mentionMembers).toHaveLength(1);
        expect(Actions[0].mentionMembers).toEqual([user1Id]);
        expect(Actions[0].likes).toHaveLength(1);
        expect(Actions[0].likes).toEqual([expect.objectContaining({userId: user1Id})]);
        expect(Actions[0].taskId).toBe(duplicateTaskResponse.id);
        expect(Actions[0].parameters).toEqual(taskActions[0].parameters);
        expect(Actions[0].createdBy).toBe(taskActions[0].createdBy);
        expect(Actions[0].date).toEqual(taskActions[0].date);
        expect(Actions[0].user).toEqual(taskActions[0].user);

        this.logger.debug('Task attachment should also be cloned');
        const clonedTaskAttachmentDb = await taskAttachementRepo.find({where: {taskId: duplicateTaskResponse.id}});
        expect(clonedTaskAttachmentDb).toHaveLength(1);
        expect(clonedTaskAttachmentDb[0].originalName).toBe(taskAttachmentDb[0].originalName);
        expect(clonedTaskAttachmentDb[0].fileName).not.toBe(taskAttachmentDb[0].fileName);

        this.logger.debug('Replicate task to folder 2 as subtask');
        const replicateTaskDto2: ReplicateTaskDto = {
            origin: {
                spaceId: spaceResponse.id,
                folderId: folder1.id,
            },
            destination: {
                spaceId: space2Response.id,
                folderId: folder2.id,
                taskId: subTaskResponse2.id,
            },
            withAssignees: false,
            withComments: false,
            withCustomFields: false,
            withFiles: false,
            withFollowers: false,
            withSubTasks: false,
            withTags: false,
        };
        const {body: clonedTask2} = await this.post(`replicate/${taskDb1.id}`, replicateTaskDto2, token.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(clonedTask2).toBeDefined();

        this.logger.debug('Detail for task should be identical except for id and createdAt');
        expect(clonedTask2.title).toBe(taskDb1.title);
        expect(clonedTask2.description).toBe(taskDb1.description);
        expect(clonedTask2.userId).toBe(taskDb1.userId);
        expect(clonedTask2.id).not.toBe(taskDb1.id);
        expect(clonedTask2.createdAt).not.toBe(taskDb1.createdAt);
    }

    @Test('Create a task invalid folder id')
    async createTaskInvalidFolderId(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken} = await this.createFolder();

        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.folderId = 0;

        this.logger.debug('create task');
        const {body: error} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.FORBIDDEN);
        expect(error.message).toBe('Forbidden resource');
    }

    @Test('Move task to another space')
    async moveTaskToAnotherSpace(): Promise<void> {
        const repoCustomField = this.dataSource.getRepository(CustomFieldDefinitionEntity),
            repoCFVposition = this.dataSource.getRepository(CustomFieldValuePositionEntity);
        this.logger.debug('create users');
        const {token} = await this.userSuite.createSuperUser();
        const {token: token2} = await this.userSuite.createSuperUser();
        const {token: token3} = await this.userSuite.createSuperUser();

        const creatorId = this.getUserIdFromAccessToken(token.accessToken);
        const user1Id = this.getUserIdFromAccessToken(token2.accessToken);
        const user2Id = this.getUserIdFromAccessToken(token3.accessToken);

        this.logger.debug('create workflow');
        const workflow = await this.createWorkflowForFolder(token.accessToken);
        const workflow2 = await this.createWorkflowForFolder(token.accessToken);

        this.logger.debug('create space1 with two members, two tags and two custom field definitions');
        const members = [
            {id: user1Id, userPermission: UserPermissionOptions.FULL},
            {id: user2Id, userPermission: UserPermissionOptions.FULL},
        ];
        const fakeTag = this.tagFactory.fakeCreateTag();
        const fakeTag2 = this.tagFactory.fakeCreateTag();
        const spaceTags = [fakeTag, fakeTag2];
        const fakeCF1Type = CustomFieldDefinitionTypeOptions.MULTIPLE;
        const fakeCF1Options = [
            {id: 'axy0i5a', label: 'a', color: '#13788f'},
            {id: 'b59vcb1', label: 'b', color: '#13788f'},
            {id: 'ta9v2pt', label: 'c', color: '#13788f'},
        ];

        const fakeCF2Type = CustomFieldDefinitionTypeOptions.DROPDOWN;
        const fakeCF2Options = [
            {id: 'cwlk8rj', label: '1', color: '#13788f'},
            {id: 'w945uct', label: '2', color: '#13788f'},
            {id: 'b9tf1ui', label: '3', color: '#13788f'},
        ];

        const fakeCf1 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(fakeCF1Options, fakeCF1Type);
        const fakeCf2 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(fakeCF2Options, fakeCF2Type);
        const spaceCustomFields = [fakeCf1, fakeCf2];
        const fakeCreateSpace = this.folderFactory.fakeCreateSpace({
            moduleWorkflows: [workflow.id],
            members,
            spaceTags,
            spaceCustomFields,
        });
        const {body: spaceResponse} = await this.post(`/space`, fakeCreateSpace, token.accessToken).expect(HttpStatus.CREATED);
        const {body: spaceDb} = await this.get(`/space`, token.accessToken).expect(HttpStatus.OK);
        expect(spaceDb).toHaveLength(1);
        expect(spaceDb[0].spaceTags).toHaveLength(2);
        expect(spaceDb[0].spaceCustomFields).toHaveLength(2);
        const [tagDb1, tagDb2] = spaceDb[0].spaceTags;
        const [CF1, CF2] = spaceDb[0].spaceCustomFields;

        this.logger.debug('create folder1 in space 1 with two members');
        const fakeFolder = this.folderFactory.fakeCreateFolderV2(workflow.id, spaceResponse.id, {members, tags: [tagDb1.id]});
        const {body: folder1} = await this.post(`/folder`, fakeFolder, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create space2 with 1 co-exist member, 1 co-exsit and 1 new tags and 1 co-exist and 1 new custom fields');
        const fakeTag3 = this.tagFactory.fakeCreateTag(); //To be inherit to task after moved
        const fakeCf3 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(); //To be inherit to task after moved
        const space2members = [{id: user1Id, userPermission: UserPermissionOptions.FULL}];
        const fakeCreateSpace2 = this.folderFactory.fakeCreateSpace({
            moduleWorkflows: [workflow2.id],
            members: space2members,
            spaceTags: [fakeTag2, fakeTag3],
            spaceCustomFields: [fakeCf2, fakeCf3],
        });
        const {body: space2Response} = await this.post(`/space`, fakeCreateSpace2, token.accessToken).expect(HttpStatus.CREATED);
        const {body: spaceDb2} = await this.get(`/space`, token.accessToken).expect(HttpStatus.OK);
        expect(spaceDb2).toHaveLength(2);
        const space2DB = spaceDb2.find((el) => el.id === space2Response.id);
        expect(space2DB).toBeDefined();
        expect(space2DB.spaceTags).toHaveLength(2);
        expect(space2DB.spaceCustomFields).toHaveLength(2);
        const tagDb3 = space2DB.spaceTags.find((el) => el.title === fakeTag3.title);
        expect(tagDb3).toBeDefined();
        const CF3 = space2DB.spaceCustomFields.find((el) => el.title === fakeCf3.title);
        expect(CF3).toBeDefined();

        this.logger.debug('create folder2 in space 2 with 1 member, using workflow2');
        const fakeFolder2 = this.folderFactory.fakeCreateFolderV2(workflow2.id, space2Response.id, {
            members: space2members,
            tags: space2DB.spaceTags.map((el) => el.id),
            customFieldValues: space2DB.spaceCustomFields.map((el) => ({id: el.id, value: null})),
        });
        const {body: folder2} = await this.post(`/folder`, fakeFolder2, token.accessToken).expect(HttpStatus.CREATED);
        expect(folder2).toBeDefined();

        this.logger.debug('create one task in folder 1 with two tags and a sub-task, assign user1 and user2 to the task');
        const fakeTask = this.factory.fakeCreateTaskV2(creatorId, folder1.id, {tagsId: [tagDb1.id, tagDb2.id], prominentTagId: tagDb1.id});
        fakeTask.assignees = [user1Id, user2Id];
        const {body: taskResponse} = await this.post(``, fakeTask, token.accessToken).expect(HttpStatus.CREATED);
        const fakeSubTask = this.factory.fakeCreateTask(creatorId, folder1.id, taskResponse.id);
        const {body: subTaskResponse} = await this.post(``, fakeSubTask, token.accessToken).expect(HttpStatus.CREATED);

        // this.logger.debug('make tag1 prominent');
        // await this.patch(
        //     `${taskResponse.id}`,
        //     {
        //         folderId: folder1.id,
        //         commonProminentTagId: tagDb1.id,
        //     },
        //     token.accessToken
        // ).expect(HttpStatus.OK);

        this.logger.debug('create custom field value in task');
        await this.post(
            `custom-field/space/${spaceResponse.id}/folder/${folder1.id}/task/${taskResponse.id}`,
            {insert: [CF1.id, CF2.id]},
            token.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('Update custom field position');
        const updateCFpositionDto = {customFieldId: CF1.id, folderId: folder1.id, index: 0, taskId: taskResponse.id};
        await this.post(`custom-field/position`, updateCFpositionDto, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Verify task');
        const {body: taskDb1} = await this.get(`${taskResponse.id}/folder/${folder1.id}`, token.accessToken).expect(HttpStatus.OK);
        expect(taskDb1.spaceId).toBe(spaceResponse.id);
        expect(taskDb1.children).toHaveLength(1);
        expect(taskDb1.children[0].id).toBe(subTaskResponse.id);
        expect(taskDb1.followers).toHaveLength(1);
        expect(taskDb1.followers).toEqual(expect.arrayContaining([creatorId]));
        expect(taskDb1.assignees).toHaveLength(2);
        expect(taskDb1.assignees).toEqual(expect.arrayContaining([user1Id, user2Id]));
        expect(taskDb1.tags).toHaveLength(2);
        expect(taskDb1.tags).toEqual(expect.arrayContaining([tagDb1.id, tagDb2.id]));
        expect(taskDb1.commonProminentTagId).toBe(tagDb1.id);

        const {body: taskCFDb} = await this.get(`custom-field/folder/${folder1.id}/task/${taskDb1.id}`, token.accessToken).expect(
            HttpStatus.OK
        );
        expect(taskCFDb.customFields).toHaveLength(2);
        expect(taskCFDb.customFields.map((cf) => cf.customFieldDefinitionId)).toEqual(expect.arrayContaining([CF1.id, CF2.id]));

        const cfvPositions = await repoCFVposition.find({
            where: {CustomFieldValue: {customFieldDefinitionId: In([CF1.id, CF2.id])}},
            relations: {CustomFieldValue: true},
        });
        expect(cfvPositions).toHaveLength(2);
        const [cfp1, cfp2] = cfvPositions;
        expect(cfp1.CustomFieldValue.customFieldDefinitionId).toBe(CF1.id);
        expect(cfp2.CustomFieldValue.customFieldDefinitionId).toBe(CF2.id);

        this.logger.debug('Move task from space 1, folder 2 to space 2, folder 2');
        const targetWorkflowId = workflow2.id;
        const targetWorkflowStateId = workflow2.states[0].id;
        const moveTaskDto: MoveOneTaskToSpaceDto = {
            origin: {folderId: folder1.id, spaceId: spaceResponse.id},
            destination: {
                folderId: folder2.id,
                spaceId: space2Response.id,
                workflowId: targetWorkflowId,
                workflowStateId: targetWorkflowStateId,
            },
        };
        await this.post(`move-to-space/${taskResponse.id}`, moveTaskDto, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Verify update');
        const {body: boardResponse} = await this.post(`/folder-workflow/project/${folder2.id}/board`, {}, token.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(boardResponse).toBeDefined();
        expect(boardResponse[0].folderIds).toHaveLength(1);
        expect(boardResponse[0].folderIds).toEqual([folder2.id]);
        expect(boardResponse[0].columns).toHaveLength(workflow2.states.length);
        expect(boardResponse[0].columns[0].id).toBe(targetWorkflowStateId);
        expect(boardResponse[0].columns[0].tasks).toHaveLength(1);
        expect(boardResponse[0].columns[0].tasks[0].id).toBe(taskResponse.id);
        const taskMovedResponse = boardResponse[0].columns[0].tasks[0];
        expect(taskMovedResponse.folderId).toBe(folder2.id);
        expect(taskMovedResponse.assignees).toHaveLength(2);
        expect(taskMovedResponse.assignees).toEqual(expect.arrayContaining([user1Id, user2Id]));
        expect(taskMovedResponse.tags).toHaveLength(2);
        expect(taskMovedResponse.customFields).toHaveLength(3);
        const [clonedCfValue1, clonedCfValue2, clonedCfValue3] = taskMovedResponse.customFields;
        const cloneCfDbs = await repoCustomField.findBy({
            id: In([
                clonedCfValue1.customFieldDefinitionId,
                clonedCfValue2.customFieldDefinitionId,
                clonedCfValue3.customFieldDefinitionId,
            ]),
        });
        const cloneCfDb = cloneCfDbs.find((el) => el.title === CF1.title && el.type === CF1.type);
        const cloneCf2Db = cloneCfDbs.find((el) => el.title === CF2.title && el.type === CF2.type);
        const cloneCf3Db = cloneCfDbs.find((el) => el.title === CF3.title && el.type === CF3.type);
        expect(taskMovedResponse.customFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({customFieldDefinitionId: cloneCf2Db.id}),
                expect.objectContaining({customFieldDefinitionId: cloneCfDb.id}),
                expect.objectContaining({customFieldDefinitionId: cloneCf3Db.id}),
            ])
        );
        const cfpUpdated = await repoCFVposition.find({
            where: {id: In([cfp1.id, cfp2.id])},
            relations: {CustomFieldValue: true},
            order: {index: 'ASC'},
        });
        expect(cfpUpdated).toHaveLength(2);
        const cfp1Updated = cfpUpdated.find((el) => el.CustomFieldValue.customFieldDefinitionId === cloneCfDb.id);
        const cfp2Updated = cfpUpdated.find((el) => el.CustomFieldValue.customFieldDefinitionId === cloneCf2Db.id);
        expect(cfp1Updated).toBeDefined();
        expect(cfp2Updated).toBeDefined();

        this.logger.debug('Task should no longer existing in folder 1');
        await this.get(`${taskResponse.id}/folder/${folder1.id}`, token.accessToken).expect(HttpStatus.NOT_FOUND);

        const {body: taskDb2} = await this.get(`${taskResponse.id}/folder/${folder2.id}`, token.accessToken).expect(HttpStatus.OK);
        expect(taskDb2.spaceId).toBe(space2Response.id);
        expect(taskDb2.children).toHaveLength(1);
        expect(taskDb2.children[0].id).toBe(subTaskResponse.id);
        expect(taskDb2.tags).toHaveLength(2);
        expect(taskDb2.tags.find((el) => el === tagDb3.id)).not.toBeDefined();

        this.logger.debug('Verify folder2');
        const {body: folder2Db} = await this.get(`/folder/${folder2.id}`, token.accessToken).expect(HttpStatus.OK);
        expect(folder2Db.id).toBe(folder2.id);
        expect(folder2Db.members).toHaveLength(3);
        expect(folder2Db.members).toEqual(
            expect.arrayContaining([
                expect.objectContaining({userId: creatorId}),
                expect.objectContaining({userId: user1Id}),
                expect.objectContaining({userId: user2Id}),
            ])
        );
        expect(folder2Db.tags).toHaveLength(3);
        const [cloneTagId, cloneTag2Id, cloneTag3Id] = folder2Db.tags;
        expect(folder2Db.customFields).toHaveLength(3);

        this.logger.debug('Verify space2');
        const {body: space2Response2} = await this.get(`/space/${space2Response.id}`, token.accessToken).expect(HttpStatus.OK);
        expect(space2Response2.id).toBe(space2Response.id);
        expect(space2Response2.members).toHaveLength(3);
        expect(space2Response2.members).toEqual(
            expect.arrayContaining([
                expect.objectContaining({id: creatorId}),
                expect.objectContaining({id: user1Id}),
                expect.objectContaining({id: user2Id}),
            ])
        );
        expect(space2Response2.spaceTags).toHaveLength(3);
        expect(space2Response2.spaceCustomFields).toHaveLength(3);

        this.logger.debug('Move task back to space 1 with delete mapping');
        const moveTaskDto2: MoveOneTaskToSpaceDto = {
            origin: {folderId: folder2.id, spaceId: space2Response.id},
            destination: {
                folderId: folder1.id,
                spaceId: spaceResponse.id,
                workflowId: workflow.id,
                workflowStateId: workflow.states[0].id,
            },
            customFieldsMapping: {
                delete: [
                    clonedCfValue1.customFieldDefinitionId,
                    clonedCfValue2.customFieldDefinitionId,
                    clonedCfValue3.customFieldDefinitionId,
                ],
            },
            tagsMapping: {delete: [cloneTagId, cloneTag2Id, cloneTag3Id]},
        };
        await this.post(`move-to-space/${taskResponse.id}`, moveTaskDto2, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Tags and Custom Fields should be removed from task');
        const {body: taskDb3} = await this.get(`${taskResponse.id}/folder/${folder1.id}`, token.accessToken).expect(HttpStatus.OK);
        expect(taskDb3.spaceId).toBe(spaceResponse.id);
        expect(taskDb3.children).toHaveLength(1);
        expect(taskDb3.children[0].id).toBe(subTaskResponse.id);
        expect(taskDb3.followers).toHaveLength(1);
        expect(taskDb3.followers).toEqual(expect.arrayContaining([creatorId]));
        expect(taskDb3.assignees).toHaveLength(2);
        expect(taskDb3.assignees).toEqual(expect.arrayContaining([user1Id, user2Id]));
        expect(taskDb3.tags).toHaveLength(0);

        const {body: taskCFDb2} = await this.get(`custom-field/folder/${folder1.id}/task/${taskDb1.id}`, token.accessToken).expect(
            HttpStatus.OK
        );
        expect(taskCFDb2.customFields).toHaveLength(0);

        this.logger.debug('Move sub task only to space 2');
        const moveTaskDto3: MoveOneTaskToSpaceDto = {
            origin: {folderId: folder1.id, spaceId: spaceResponse.id},
            destination: {
                folderId: folder2.id,
                spaceId: space2Response.id,
                workflowId: targetWorkflowId,
                workflowStateId: targetWorkflowStateId,
            },
        };
        await this.post(`move-to-space/${subTaskResponse.id}`, moveTaskDto3, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Verify update, sub task should be moved to the root after moved');
        const {body: boardResponse2} = await this.post(`/folder-workflow/project/${folder2.id}/board`, {}, token.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(boardResponse2).toBeDefined();
        expect(boardResponse2[0].folderIds).toHaveLength(1);
        expect(boardResponse2[0].folderIds).toEqual([folder2.id]);
        expect(boardResponse2[0].columns).toHaveLength(workflow2.states.length);
        expect(boardResponse2[0].columns[0].id).toBe(targetWorkflowStateId);
        expect(boardResponse2[0].columns[0].tasks).toHaveLength(1);
        expect(boardResponse2[0].columns[0].tasks[0].id).toBe(subTaskResponse.id);

        this.logger.debug('Moving task to the same folder should succeed without changes');
        const moveTaskDto4: MoveOneTaskToSpaceDto = {
            origin: {folderId: folder2.id, spaceId: space2Response.id},
            destination: {
                folderId: folder2.id,
                spaceId: space2Response.id,
                workflowId: targetWorkflowId,
                workflowStateId: targetWorkflowStateId,
            },
        };

        await this.post(`move-to-space/${subTaskResponse.id}`, moveTaskDto4, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Verify update again');
        const {body: boardResponse3} = await this.post(`/folder-workflow/project/${folder2.id}/board`, {}, token.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(boardResponse3).toBeDefined();
        expect(boardResponse3[0].folderIds).toHaveLength(1);
        expect(boardResponse3[0].folderIds).toEqual([folder2.id]);
        expect(boardResponse3[0].columns).toHaveLength(workflow2.states.length);
        expect(boardResponse3[0].columns[0].id).toBe(targetWorkflowStateId);
        expect(boardResponse3[0].columns[0].tasks).toHaveLength(1);
        expect(boardResponse3[0].columns[0].tasks[0].id).toBe(subTaskResponse.id);
    }

    @Test('Move task to another folder in same space')
    async moveTaskToAnotherFolderSameSpace(): Promise<void> {
        this.logger.debug('create space and folders');
        const {folder, jwtToken, spaceId, workflowDB} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        const {folder: folder2} = await this.createFolder(null, jwtToken, workflowDB.id, spaceId);

        const {body: spaceDb} = await this.get(`/space/${spaceId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(spaceDb).toBeDefined();
        expect(spaceDb.spaceCustomFields).toHaveLength(0);

        const fakeCf1 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition([], CustomFieldDefinitionTypeOptions.TEXT);
        const fakeCf2 = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition([], CustomFieldDefinitionTypeOptions.TEXT);
        const {body: customField1} = await this.post(`/custom-field-definition/${spaceId}`, fakeCf1, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );
        const {body: customField2} = await this.post(`/custom-field-definition/${spaceId}`, fakeCf2, jwtToken.accessToken).expect(
            HttpStatus.CREATED
        );

        const {body: spaceDb1} = await this.get(`/space/${spaceId}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(spaceDb1).toBeDefined();
        expect(spaceDb1.spaceCustomFields).toHaveLength(2);

        this.logger.debug('assign custom field to folder');
        await this.patch(
            `/folder/${folder.id}/space/${spaceId}`,
            {
                customFieldValues: {
                    insert: [
                        {id: customField1.identifiers[0].id, value: ''},
                        {id: customField2.identifiers[0].id, value: ''},
                    ],
                    delete: [],
                },
            },
            jwtToken.accessToken
        ).expect(HttpStatus.OK);

        const {body: folderDb1} = await this.get(`/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(folderDb1).toBeDefined();
        expect(folderDb1.customFields).toHaveLength(2);

        const {body: folderDb2} = await this.get(`/folder/${folder2.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(folderDb2).toBeDefined();
        expect(folderDb2.customFields).toHaveLength(0);

        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const workflowStates = await this.workflowStateFactory.repository.find({where: {workflowId: workflowDB.id}});
        this.logger.debug('Move task from space 1, folder 2 to space 2, folder 2');
        const moveTaskDto: MoveOneTaskToSpaceDto = {
            origin: {folderId: folder.id, spaceId},
            destination: {
                folderId: folder2.id,
                spaceId,
                workflowId: workflowDB.id,
                workflowStateId: workflowStates[0].id,
            },
            customFieldsMapping: {
                update: [],
                delete: [customField2.identifiers[0].id],
            },
        };
        await this.post(`move-to-space/${task.id}`, moveTaskDto, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Task should no longer existing in folder 1');
        await this.get(`${task.id}/folder/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.NOT_FOUND);

        const {body: taskDb2CF} = await this.get(`custom-field/folder/${folder2.id}/task/${task.id}`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(taskDb2CF.customFields).toHaveLength(1);
        expect(taskDb2CF.customFields[0].customFieldDefinitionId).toBe(customField1.identifiers[0].id);

        const {body: folderDb2AfterMove} = await this.get(`/folder/${folder2.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        expect(folderDb2AfterMove).toBeDefined();
        expect(folderDb2AfterMove.customFields).toHaveLength(1);
    }

    @Test('Move Tasks to different Spaces')
    async moveTasksToDifferentSpaces(): Promise<void> {
        this.logger.debug('create users');
        const {token} = await this.userSuite.createModuleUser();
        const {token: token2} = await this.userSuite.createModuleUser();
        const user1Id = this.getUserIdFromAccessToken(token.accessToken);

        this.logger.debug('create workflow');
        const workflow = await this.createWorkflowForFolder(token.accessToken);
        const fakeCreateSpace = this.folderFactory.fakeCreateSpace({
            moduleWorkflows: [workflow.id],
        });

        this.logger.debug('create 3 spaces for user 1, 1 for user 2 with user 1 as member');
        const {body: space1} = await this.post(`/space`, fakeCreateSpace, token.accessToken).expect(HttpStatus.CREATED);
        const {body: space2} = await this.post(`/space`, fakeCreateSpace, token.accessToken).expect(HttpStatus.CREATED);
        const {body: space3} = await this.post(`/space`, fakeCreateSpace, token.accessToken).expect(HttpStatus.CREATED);

        fakeCreateSpace.members = [{id: user1Id, userPermission: UserPermissionOptions.FULL}];
        const {body: space4} = await this.post(`/space`, fakeCreateSpace, token2.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create a folder and a task in each space');
        const createdFolders = [];
        const createdTasks = [];
        for (const spaceId of [space1.id, space2.id, space3.id]) {
            const accessToken = token.accessToken;
            const creatorId = user1Id;
            const fakeFolder = this.folderFactory.fakeCreateFolderV2(workflow.id, spaceId);
            const {body: folder} = await this.post(`/folder`, fakeFolder, accessToken).expect(HttpStatus.CREATED);
            createdFolders.push(folder);

            const fakeTask = this.factory.fakeCreateTask(creatorId, folder.id);
            const {body: task} = await this.post(``, fakeTask, accessToken).expect(HttpStatus.CREATED);
            createdTasks.push(task);
        }
        expect(createdFolders).toHaveLength(3);
        expect(createdTasks).toHaveLength(3);
        const [folder1, folder2, folder3] = createdFolders;
        const [task1, task2, task3] = createdTasks;

        this.logger.debug('create a private folder in space 4');
        const fakeFolder = this.folderFactory.fakeCreateFolderV2(workflow.id, space4.id, {viewType: FolderViewTypeOptions.PRIVATE});
        const {body: folder4} = await this.post(`/folder`, fakeFolder, token2.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Move task 1, task 2 to folder 3 in space 3');
        const moveManyDto: MoveManyTasksToSpaceDto[] = [
            {
                taskId: task1.id,
                origin: {
                    folderId: folder1.id,
                    spaceId: space1.id,
                },
                destination: {
                    folderId: folder3.id,
                    spaceId: space3.id,
                    workflowId: workflow.id,
                    workflowStateId: workflow.states[0].id,
                },
            },
            {
                taskId: task2.id,
                origin: {
                    folderId: folder2.id,
                    spaceId: space2.id,
                },
                destination: {
                    folderId: folder3.id,
                    spaceId: space3.id,
                    workflowId: workflow.id,
                    workflowStateId: workflow.states[0].id,
                },
            },
        ];

        this.logger.debug('Request should fail if user does not have permission to space or folder');
        const {body: failReponse} = await this.post('move-many-to-space', moveManyDto, token2.accessToken).expect(HttpStatus.FORBIDDEN);
        expect(failReponse.message).toBe(
            `You do not have neccessary permission for the following spaces: [ ${[space1.id, space2.id, space3.id].join(', ')} ]`
        );
        const {body: failReponse2} = await this.post(
            'move-many-to-space',
            [
                {
                    taskId: task3.id,
                    origin: {
                        folderId: folder3.id,
                        spaceId: space3.id,
                    },
                    destination: {
                        folderId: folder4.id,
                        spaceId: space4.id,
                        workflowId: workflow.id,
                        workflowStateId: workflow.states[0].id,
                    },
                },
            ],
            token.accessToken
        ).expect(HttpStatus.FORBIDDEN);
        expect(failReponse2.message).toBe(`You do not have neccessary permission for the following folders: [ ${folder4.id} ]`);

        this.logger.debug('Request should succeed if user has all necessary permissions');
        await this.post('move-many-to-space', moveManyDto, token.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Verify space 3 after moved');
        const {body: boardResponse} = await this.post(`/folder-workflow/project/${folder3.id}/board`, {}, token.accessToken).expect(
            HttpStatus.CREATED
        );
        expect(boardResponse).toBeDefined();
        expect(boardResponse[0].folderIds).toHaveLength(1);
        expect(boardResponse[0].folderIds).toEqual([folder3.id]);

        expect(boardResponse[0].columns[0].tasks).toHaveLength(3);
        expect(boardResponse[0].columns[0].tasks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({id: task1.id}),
                expect.objectContaining({id: task2.id}),
                expect.objectContaining({id: task3.id}),
            ])
        );
    }

    @Test('Actions performed by service user should trigger task actions')
    async actionsByServiceUser(): Promise<void> {
        this.logger.debug('Service user login');
        const automationUser = await this.logUser(this.userFactory.getPasServiceUserLoginDto(), UserTypeOptions.MODULE_USER);
        expect(automationUser.accessToken).toBeDefined();

        this.logger.debug('create user and folder');
        const {folder, jwtToken, spaceId} = await this.createFolder();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const fakeTask = this.factory.fakeCreateTask(userId, folder.id);

        this.logger.debug('create task');
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('create tag');
        const tag = await this.tagFactory.createTag(null, spaceId);

        this.logger.debug('add tag to task by service user');
        await this.post(`tag/${task.id}/${tag.id}/${folder.id}`, {}, automationUser.accessToken).expect(HttpStatus.CREATED);

        this.logger.debug('Task action should be created');
        const foundTaskLabelAction = await this.dataSource
            .getRepository(TaskActionEntity)
            .findOneBy({taskId: task.id, action: TaskActionOptions.TAG_ADDED});
        expect(foundTaskLabelAction).not.toBeNull();
        expect(foundTaskLabelAction.parameters).toEqual(expect.objectContaining({tag: {id: tag.id}}));
        expect(foundTaskLabelAction.createdBy).toBe(automationUser.id);

        this.logger.debug('remove tag to task by service user');
        await this.delete(`tag/${tag.id}/folder/${folder.id}/task/${task.id}`, automationUser.accessToken).expect(HttpStatus.OK);

        this.logger.debug('Task action should be created');
        const foundTaskLabelAction2 = await this.dataSource
            .getRepository(TaskActionEntity)
            .findOneBy({taskId: task.id, action: TaskActionOptions.TAG_REMOVED});
        expect(foundTaskLabelAction2).not.toBeNull();
        expect(foundTaskLabelAction2.parameters).toEqual(expect.objectContaining({tag: {id: tag.id}}));
        expect(foundTaskLabelAction2.createdBy).toBe(automationUser.id);

        this.logger.debug('create custom field definition');
        const customFieldDefinitionDto = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition(
            [],
            CustomFieldDefinitionTypeOptions.TEXT
        );
        const {body: customField} = await this.post(
            `/custom-field-definition/${spaceId}`,
            customFieldDefinitionDto,
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);
        const {body: customFields} = await this.get(`/custom-field-definition/${spaceId}?show-inactive=false`, jwtToken.accessToken).expect(
            HttpStatus.OK
        );
        expect(customFields.length).toBe(1);
        const createdCF = customFields.find((cf: {id: number}) => cf.id === customField.identifiers[0].id);
        expect(createdCF.type).toBe(CustomFieldDefinitionTypeOptions.TEXT);

        this.logger.debug('assign custom field to folder');
        await this.post(
            `/folder/custom-field-value/${folder.id}/space/${spaceId}`,
            {
                insert: [{id: customField.identifiers[0].id, value: ''}],
                delete: [],
            },
            jwtToken.accessToken
        ).expect(HttpStatus.CREATED);

        this.logger.debug('Update custom field value by service user');
        const customFieldValue = faker.commerce.product();
        await this.patch(
            `custom-field/${customField.identifiers[0].id}/folder/${folder.id}/task/${task.id}?value=${customFieldValue}`,
            {},
            automationUser.accessToken
        ).expect(HttpStatus.OK);
        const foundTaskCFAction = await this.dataSource
            .getRepository(TaskActionEntity)
            .findOneBy({taskId: task.id, action: TaskActionOptions.CUSTOMFIELD_UPDATED});
        expect(foundTaskCFAction).not.toBeNull();
        expect(foundTaskCFAction.parameters).toEqual(
            expect.objectContaining({
                customField: {
                    id: createdCF.id,
                    value: customFieldValue,
                },
            })
        );
        expect(foundTaskCFAction.createdBy).toBe(automationUser.id);
    }

    @Test('Create workflows with approval constraint and create new task')
    async createWorkflowWithApprovalsConstraintAndCreateNewTask(): Promise<void> {
        this.logger.debug(`Create user`);
        const {token: jwtToken} = await this.userSuite.createSuperAdminUser();
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);

        this.logger.debug(`create workflow`);
        const {body: systemStages} = await this.get(`/displacement-group/system-stage`, jwtToken.accessToken).expect(HttpStatus.OK);
        const fakeWorkflow = await this.workflowFactory.fakeCreateWorkflow(systemStages[0]?.id);

        fakeWorkflow.states[0].approvalConstraint = {
            acceptState: fakeWorkflow.states[1].code,
            rejectState: fakeWorkflow.states[2].code,
            userIds: [userId],
            authorizedUserIds: [userId],
            requiredApprovals: 1,
            dueIn: 1,
            dueInType: ApprovalDueInTypeOptions.DAYS,
        };
        this.logger.debug('Create workflow with approval constraints');
        const {body: workflowDb} = await this.post(`/workflow/module`, fakeWorkflow, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const spaceResponse = await this.createSpace(jwtToken.accessToken, [workflowDb.id]);
        this.logger.debug('create folder');
        const fakeFolder = this.folderFactory.fakeCreateFolder(
            workflowDb.id,
            null,
            DefaultViewOptions.BOARD,
            [TASK_MANAGEMENT],
            spaceResponse.id
        );
        const {body: f1} = await this.post(`/folder`, fakeFolder, jwtToken.accessToken).expect(HttpStatus.CREATED);

        const fakeTask = this.factory.fakeCreateTask(userId, f1.id);
        const {body: task} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        expect(task.description).toBe(fakeTask.description);
        expect(task.title).toBe(fakeTask.title);
    }

    @Test('Move task to root folder')
    async moveTaskToRoot(): Promise<void> {
        this.logger.debug('create user and folder');
        const {folder, jwtToken, workflowDB} = await this.createFolder();
        this.logger.debug('get user id');
        const userId = this.getUserIdFromAccessToken(jwtToken.accessToken);
        const workflowStates = await this.workflowStateFactory.repository.find({where: {workflowId: workflowDB.id}});

        this.logger.debug('create task');
        let fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.assignees = [userId];
        const {body: task0} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.assignees = [userId];
        const {body: task1} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.assignees = [userId];
        const {body: task2} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.assignees = [userId];
        const {body: task3} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);
        fakeTask = this.factory.fakeCreateTask(userId, folder.id);
        fakeTask.assignees = [userId];
        const {body: task4} = await this.post(``, fakeTask, jwtToken.accessToken).expect(HttpStatus.CREATED);

        // Verify tasks are in the folder
        let response = await this.get(`/folder/task-tree/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        let folderTasks: TaskTreeDto[] = response.body;

        // Verify all created tags are in the folder
        const createdTags = [task0, task1, task2, task3, task4];
        createdTags.forEach((tag) => expect(folderTasks.some((task) => task.id === tag.id)).toBeTruthy());

        // Move task to root (null folderId indicates root)
        const moveDto: UpdateTaskPositionDto = {
            parentTaskNewId: task0.id,
            parentTaskOldId: null,
            index: 0,
            folderId: folder.id,
            actualFolderId: folder.id,
            columnId: workflowStates[0].id,
            view: FolderViewOptions.ROOT,
        };

        await this.patch(`position/${task1.id}`, moveDto, jwtToken.accessToken).expect(HttpStatus.OK);
        moveDto.parentTaskNewId = task1.id;
        await this.patch(`position/${task2.id}`, moveDto, jwtToken.accessToken).expect(HttpStatus.OK);
        moveDto.parentTaskNewId = task2.id;
        await this.patch(`position/${task3.id}`, moveDto, jwtToken.accessToken).expect(HttpStatus.OK);
        moveDto.parentTaskNewId = task3.id;
        await this.patch(`position/${task4.id}`, moveDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // Verify tasks are in the folder
        response = await this.get(`/folder/task-tree/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        folderTasks = response.body;
        expect(folderTasks.length).toBe(1);
        expect(folderTasks[0].id).toBe(task0.id);
        expect(folderTasks[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].id).toBe(task1.id);
        expect(folderTasks[0].children[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].children[0].id).toBe(task2.id);
        expect(folderTasks[0].children[0].children[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].children[0].children[0].id).toBe(task3.id);
        expect(folderTasks[0].children[0].children[0].children[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].children[0].children[0].children[0].id).toBe(task4.id);

        moveDto.parentTaskOldId = task1.id;
        moveDto.parentTaskNewId = null;
        await this.patch(`position/${task2.id}`, moveDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // Verify tasks are in the folder
        response = await this.get(`/folder/task-tree/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        folderTasks = response.body;
        expect(folderTasks.length).toBe(2);
        expect([task0.id, task2.id]).toContain(folderTasks[0].id);
        expect([task0.id, task2.id]).toContain(folderTasks[1].id);
        const folderTasksChildrenIds0 = folderTasks.find((task) => task.id === task0.id);
        const folderTasksChildrenIds1 = folderTasks.find((task) => task.id === task2.id);
        expect(folderTasksChildrenIds0.children.length).toBe(1);
        expect(folderTasksChildrenIds0.children[0].id).toBe(task1.id);
        expect(folderTasksChildrenIds1.children.length).toBe(1);
        expect(folderTasksChildrenIds1.children[0].id).toBe(task3.id);
        expect(folderTasksChildrenIds1.children[0].children.length).toBe(1);
        expect(folderTasksChildrenIds1.children[0].children[0].id).toBe(task4.id);

        moveDto.parentTaskOldId = null;
        moveDto.parentTaskNewId = task1.id;
        await this.patch(`position/${task2.id}`, moveDto, jwtToken.accessToken).expect(HttpStatus.OK);

        // Verify tasks are in the folder
        response = await this.get(`/folder/task-tree/${folder.id}`, jwtToken.accessToken).expect(HttpStatus.OK);
        folderTasks = response.body;
        expect(folderTasks.length).toBe(1);
        expect(folderTasks[0].id).toBe(task0.id);
        expect(folderTasks[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].id).toBe(task1.id);
        expect(folderTasks[0].children[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].children[0].id).toBe(task2.id);
        expect(folderTasks[0].children[0].children[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].children[0].children[0].id).toBe(task3.id);
        expect(folderTasks[0].children[0].children[0].children[0].children.length).toBe(1);
        expect(folderTasks[0].children[0].children[0].children[0].children[0].id).toBe(task4.id);
    }

    /**
     * Creates many custom fields.
     *
     * @param {number} [number] - number of custom fields to be created.
     * @param {CustomFieldDefinitionTypeOptions} [type] - type of custom fields to be created.
     * @param {TokenInterface} [accessToken] - The JWT token used to authenticate the user. If not provided, a new user will be created and logged in.
     * @param spaceId
     * @returns {Promise} A Promise that resolves to an object containing the created folder, the JWT token, and the workflow database entry.
     */
    async createManyCustomFields(
        number: number,
        type: CustomFieldDefinitionTypeOptions,
        accessToken: string,
        spaceId: number
    ): Promise<number[]> {
        const customFields: number[] = [];
        for (let i = 1; i <= number; i++) {
            const customFieldDefinitionDto = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition([], type);
            const {body: customField} = await this.post(
                `/custom-field-definition/${spaceId}`,
                customFieldDefinitionDto,
                accessToken
            ).expect(HttpStatus.CREATED);
            const {body: allCustomFields} = await this.get(`/custom-field-definition/${spaceId}?show-inactive=false`, accessToken).expect(
                HttpStatus.OK
            );
            expect(allCustomFields).toBeDefined();
            const foundCF = allCustomFields.filter((cf) => cf.id === customField.identifiers[0].id);
            expect(foundCF).toHaveLength(1);
            expect(foundCF[0].id).toBe(customField.identifiers[0].id);
            expect(foundCF[0].type).toBe(type);
            customFields.push(foundCF[0].id);
        }
        return customFields;
    }

    /**
     * Creates many User custom fields.
     *
     * @param {number} [number] - number of custom fields to be created.
     * @param {CustomFieldDefinitionTypeOptions} [type] - type of custom fields to be created.
     * @param {TokenInterface} [accessToken] - The JWT token used to authenticate the user. If not provided, a new user will be created and logged in.
     *
     * @param spaceId
     * @returns {Promise} A Promise that resolves to an object containing the created folder, the JWT token, and the workflow database entry.
     */
    async createManyUserCustomFields(
        number: number,
        type: CustomFieldDefinitionTypeOptions,
        accessToken: string,
        spaceId: number
    ): Promise<number[]> {
        const customFields: number[] = [];
        for (let i = 1; i <= number; i++) {
            const customFieldDefinitionDto = this.customFieldDefinitionFactory.fakeCreateCustomFieldDefinition([], type);
            const {body: customField} = await this.post(
                `/custom-field-definition/${spaceId}`,
                customFieldDefinitionDto,
                accessToken
            ).expect(HttpStatus.CREATED);
            const {body: allCustomFields} = await this.get(`/custom-field-definition/${spaceId}?show-inactive=false`, accessToken).expect(
                HttpStatus.OK
            );
            expect(allCustomFields).toBeDefined();
            const foundCF = allCustomFields.filter((cf) => cf.id === customField.identifiers[0].id);
            expect(foundCF).toHaveLength(1);
            expect(foundCF[0].id).toBe(customField.identifiers[0].id);
            expect(foundCF[0].type).toBe(type);
            customFields.push(foundCF[0].id);
        }
        return customFields;
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
            this.logger.debug('generate user token');
            const {token} = await this.userSuite.createSuperUser();
            jwtToken = token;
        }
        this.logger.debug('create workflow');
        if (workflowId === null) {
            const workflow = await this.createWorkflowForFolder(jwtToken.accessToken);
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

    private async createWorkflowForFolder(token: string): Promise<WorkFlowResponseDto> {
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

    private async createSpace(accessToken: string, workflowIds: number[], members?: GenericMemberDto[]): Promise<GetFolderDto> {
        const fakeCreateSpace = this.folderFactory.fakeCreateSpace({
            moduleWorkflows: workflowIds,
            members,
        });
        const {body: spaceResponse} = await this.post(`/space`, fakeCreateSpace, accessToken).expect(HttpStatus.CREATED);
        expect(spaceResponse).toBeDefined();
        return spaceResponse;
    }
}
