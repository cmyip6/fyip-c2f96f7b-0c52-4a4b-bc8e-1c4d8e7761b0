import {faker} from '@faker-js/faker';
import {FINANCIAL_OUTLOOK, TASK_MANAGEMENT} from '@lib/base-library';
import {Injectable} from '@nestjs/common';
import {BaseFactory} from '@test-lib/test-base-library';
import * as moment from 'moment';
import {FindOptionsSelect, FindOptionsWhere, UpdateResult} from 'typeorm';
import {CreateTaskDto, UpdateTaskDto} from '../../src/dto/task';
import {TaskEntity} from '../../src/model';
import {TaskTypeOptions} from '@lib/base-library';

@Injectable()
export class TaskFactory extends BaseFactory<TaskEntity> {
    constructor() {
        super(TaskEntity);
    }

    fakeCreateTask(
        userId: string,
        folderId: number,
        parentTaskId?: number,
        tagsId: number[] = [],
        customTitle?: string,
        requestedEndDate?: Date,
        manuallyScheduled = false
    ): CreateTaskDto {
        const startDate = faker.date.past();
        const endDate = requestedEndDate ?? faker.date.future();
        const duration = moment(endDate).diff(moment(startDate), 'd', true);

        const ret: CreateTaskDto = {
            folderId,
            owner: userId,
            parentTaskId,
            title: customTitle ? customTitle : faker.string.alpha(20) + faker.number.bigInt(),
            description: faker.commerce.productDescription(),
            startDate,
            endDate,
            taskType: TaskTypeOptions.TASK,
            Tags: tagsId,
            duration,
            complete: faker.number.int({min: 1, max: 100}),
            effort: faker.number.int({min: 1, max: 100}),
            manuallyScheduled,
            source: TASK_MANAGEMENT,
            showOn: [TASK_MANAGEMENT],
            extra: null,
            index: 0,
            expanded: false,
        };
        return ret;
    }

    fakeCreateTaskV2(
        userId: string,
        folderId: number,
        options: {
            parentTaskId?: number;
            customTitle?: string;
            requestedEndDate?: Date;
            manuallyScheduled?: boolean;
            tagsId?: number[];
            workflowStateId?: number;
            prominentTagId?: number;
        } = {}
    ): CreateTaskDto {
        const {parentTaskId, customTitle, requestedEndDate, manuallyScheduled, tagsId, workflowStateId, prominentTagId} = options;
        const startDate = faker.date.past();
        const endDate = requestedEndDate ?? faker.date.future();
        const duration = moment(endDate).diff(moment(startDate), 'd', true);

        const ret: CreateTaskDto = {
            folderId,
            owner: userId,
            parentTaskId,
            title: customTitle ? customTitle : faker.string.alpha(20) + faker.number.bigInt(),
            description: faker.commerce.productDescription(),
            startDate,
            endDate,
            taskType: TaskTypeOptions.TASK,
            Tags: tagsId,
            duration,
            complete: faker.number.int({min: 1, max: 100}),
            effort: faker.number.int({min: 1, max: 100}),
            manuallyScheduled,
            source: TASK_MANAGEMENT,
            showOn: [TASK_MANAGEMENT],
            extra: null,
            index: 0,
            expanded: false,
            ...(workflowStateId ? {workflowStateId} : {}),
            ...(prominentTagId ? {prominentTagId} : {}),
        };
        return ret;
    }

    fakeUpdateTask(folderId: number): UpdateTaskDto {
        const startDate = faker.date.past(),
            endDate = faker.date.future();
        const duration = moment(endDate).diff(startDate, 'd', true);
        const ret: UpdateTaskDto = {
            folderId,
            title: faker.commerce.productAdjective() + Date.now(),
            taskType: TaskTypeOptions.TASK,
            description: faker.commerce.productDescription(),
            complete: faker.number.int({min: 1, max: 100}),
            effort: faker.number.int({min: 1, max: 100}),
            showOn: [TASK_MANAGEMENT, FINANCIAL_OUTLOOK],
            startDate,
            endDate,
            duration,
        };
        return ret;
    }

    // async createTask(task: TaskEntity): Promise<TaskEntity> {
    //     return await this.repository.save(task);
    // }

    async findTasks(select: FindOptionsSelect<TaskEntity>, where: FindOptionsWhere<TaskEntity>): Promise<TaskEntity[]> {
        return await this.repository.find({select, where});
    }

    async removeImportanceByIndex(index: number): Promise<UpdateResult> {
        return await this.repository
            .createQueryBuilder('T')
            .update()
            .set({importanceId: null, id: () => 'id', fakeId: () => 'id'})
            .where(`importanceId IN (SELECT id FROM importance WHERE INDEX_POS = :index)`, {index})
            .execute();
    }

    // async removeImportanceByDefault(): Promise<UpdateResult> {
    //     return await this.repository
    //         .createQueryBuilder('T')
    //         .update()
    //         .set({importanceId: null, id: () => 'id', fakeId: () => 'id'})
    //         .where(`importanceId IN (SELECT id FROM importance WHERE "default" = TRUE)`)
    //         .execute();
    // }
    //
    // async removeAllImportance(): Promise<UpdateResult> {
    //     return await this.repository
    //         .createQueryBuilder('T')
    //         .update()
    //         .set({importanceId: null, id: () => 'id', fakeId: () => 'id'})
    //         .execute();
    // }
}
