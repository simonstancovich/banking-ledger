import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

/**
 * Public user shape for API responses. Never includes firebaseUid or other internal fields.
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'User ID (CUID)',
    example: 'clxx123456789012345678901',
    pattern: '^c[0-9a-z]{24}$',
  })
  @IsCuid()
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

export class GetUserResponseDto extends UserResponseDto {}

export class GetOrCreateUserResponseDto {
  @ApiProperty({ type: UserResponseDto, description: 'User data' })
  user: UserResponseDto;

  @ApiProperty({ description: 'Whether the user was just created' })
  created: boolean;
}

/** Paginated list of users (admin only). */
export class GetAllUsersResponseDto {
  @ApiProperty({
    type: [UserResponseDto],
    description: 'Users for the current page',
  })
  data: UserResponseDto[];

  @ApiProperty({ description: 'Total number of users' })
  total: number;

  @ApiProperty({ description: 'Current page (1-based)' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
