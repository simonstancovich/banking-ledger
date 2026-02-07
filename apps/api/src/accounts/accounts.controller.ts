import { Controller, Get, Query, Version, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { GetAllAccountsQueryDto } from './dto/get-all-accounts-query.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import { GetAllAccountsResponseDto } from './dto/account-with-user-response.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import type { AuthedRequestGuarded } from '../auth/firebase-auth.guard';

@ApiTags('accounts')
@ApiBearerAuth('JWT-auth')
@Controller('accounts')
@UseGuards(FirebaseAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @Version('1')
  @ApiOperation({
    summary: 'List accounts',
    description:
      'Returns the current user’s accounts, or for admins a paginated list of all accounts. Admins can use page, limit, sortBy, sortOrder query params.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accounts (array for users, paginated for admins)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async findAll(
    @Request() req: AuthedRequestGuarded,
    @Query() query: GetAllAccountsQueryDto,
  ): Promise<AccountResponseDto[] | GetAllAccountsResponseDto> {
    return this.accountsService.getAllAccounts(req.user, query);
  }
}
