import { ApiProperty } from '@nestjs/swagger';
import { IsCuid } from '../../common/decorators/is-cuid.decorator';

export class GetUserDto {
  @ApiProperty({
    description: 'User ID (CUID)',
    example: 'clxx123456789012345678901',
    pattern: '^c[0-9a-z]{24}$',
  })
  @IsCuid()
  id: string;
}
