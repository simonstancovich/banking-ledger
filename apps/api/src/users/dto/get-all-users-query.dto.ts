import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export const SORTABLE_USER_FIELDS = [
  'createdAt',
  'updatedAt',
  'email',
  'role',
] as const;
export type SortableUserField = (typeof SORTABLE_USER_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class GetAllUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: DEFAULT_PAGE,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: SORTABLE_USER_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(SORTABLE_USER_FIELDS)
  sortBy?: SortableUserField = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SORT_ORDERS,
    default: 'desc',
  })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'desc';
}

export const GET_ALL_USERS_DEFAULTS = {
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
  sortBy: 'createdAt' as SortableUserField,
  sortOrder: 'desc' as SortOrder,
} as const;
