import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Version,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { GetAccountDto } from './dto/get-account.dto';
import { GetAllAccountsQueryDto } from './dto/get-all-accounts-query.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
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

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create account',
    description: 'Creates a new account for the current user',
  })
  @ApiResponse({
    status: 201,
    description: 'Account created',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 409,
    description: 'Account with this name already exists',
  })
  async create(
    @Request() req: AuthedRequestGuarded,
    @Body() body: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.createAccount(req.user, body);
  }

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

  @Get(':id')
  @Version('1')
  @ApiOperation({
    summary: 'Get account by ID',
    description: 'Returns the account with the given ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Account found',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your account' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findOne(
    @Request() req: AuthedRequestGuarded,
    @Param() params: GetAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.getAccount(req.user, params.id);
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({
    summary: 'Update account',
    description: 'Updates the account with the given ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Account updated',
    type: AccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - No valid fields or invalid data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your account' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async update(
    @Request() req: AuthedRequestGuarded,
    @Param() params: GetAccountDto,
    @Body() body: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.updateAccount(req.user, params.id, body);
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({
    summary: 'Delete account (admin only)',
    description: 'Deletes the account with the given ID',
  })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async remove(
    @Request() req: AuthedRequestGuarded,
    @Param() params: GetAccountDto,
  ): Promise<void> {
    return this.accountsService.deleteAccount(req.user, params.id);
  }
}
