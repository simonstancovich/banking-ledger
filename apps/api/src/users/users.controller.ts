import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Version,
  UseGuards,
  Request,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AuthedRequestUser,
  FirebaseAuthGuard,
} from '../auth/firebase-auth.guard';
import { GetOrCreateUserResponseDto } from './dto/user-response.dto';
import { Request as ExpressRequest } from 'express';

interface AuthedRequest extends ExpressRequest {
  user: AuthedRequestUser;
}

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('me')
  @Version('1')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: 'Get or create user from Firebase token',
    description:
      'Retrieves existing user or creates a new one based on Firebase authentication token. Returns 200 if user exists, 201 if newly created.',
  })
  @ApiResponse({
    status: 200,
    description: 'User found and returned',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getOrCreateUser(
    @Request() req: AuthedRequest,
    @Res() res: Response,
  ): Promise<Response> {
    const { firebaseUid, email } = req.user;
    const result = await this.usersService.getOrCreateUser(firebaseUid, email);

    // Return appropriate status code based on whether user was created
    const statusCode = result.created ? HttpStatus.CREATED : HttpStatus.OK;

    return res.status(statusCode).json(result);
  }

  @Get('me')
  @Version('1')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the current authenticated user profile based on Firebase token',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async getMe(@Request() req: AuthedRequest): Promise<GetOrCreateUserResponseDto> {
    const { firebaseUid, email } = req.user;
    return await this.usersService.getOrCreateUser(firebaseUid, email);
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
