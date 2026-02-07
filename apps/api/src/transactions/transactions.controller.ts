import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List transactions (placeholder)' })
  @ApiResponse({ status: 200, description: 'OK' })
  findAll() {
    return [];
  }
}
