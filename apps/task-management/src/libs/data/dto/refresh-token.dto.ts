import {ApiProperty} from '@nestjs/swagger';
import {IsString} from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({
        description: 'The refresh token',
        required: true,
        type: String,
    })
    @IsString()
    refreshToken: string;
}
