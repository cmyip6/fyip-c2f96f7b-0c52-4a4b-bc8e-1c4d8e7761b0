import {ApiProperty} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsDate, IsOptional, IsString} from 'class-validator';

export class BasePropertiesDto {
    @ApiProperty({description: 'Created At timestamp', nullable: true, type: Date})
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    createdAt?: Date;

    @ApiProperty({description: 'Updated At timestamp', nullable: true, type: Date})
    @IsDate()
    @IsOptional()
    @Type(() => Date)
    updatedAt?: Date;

    @ApiProperty({description: 'Created by Id', nullable: true, type: String})
    @IsString()
    @IsOptional()
    createdBy?: string;

    @ApiProperty({description: 'Updated by Id', nullable: true, type: String})
    @IsString()
    @IsOptional()
    updatedBy?: string;
}
