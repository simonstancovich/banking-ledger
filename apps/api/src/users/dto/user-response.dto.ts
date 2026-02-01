import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ enum: Role, description: 'User role' })
  role: Role;

  @ApiProperty({ description: 'User creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'User last update timestamp' })
  updatedAt: Date;
}

export class GetOrCreateUserResponseDto {
  @ApiProperty({ type: UserResponseDto, description: 'User data' })
  user: UserResponseDto;

  @ApiProperty({ description: 'Whether the user was just created' })
  created: boolean;
}
