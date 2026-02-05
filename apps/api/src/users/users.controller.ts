import {
  Controller,
  Get,
  Post,
  Param,
  Query,
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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { GetUserDto } from './dto/get-user.dto';
import { GetAllUsersQueryDto } from './dto/get-all-users-query.dto';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import type { AuthedRequestGuarded } from '../auth/firebase-auth.guard';
import {
  GetOrCreateUserResponseDto,
  GetUserResponseDto,
  GetAllUsersResponseDto,
} from './dto/user-response.dto';

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
    @Request() req: AuthedRequestGuarded,
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
    description:
      'Returns the current authenticated user profile based on Firebase token',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async getMe(
    @Request() req: AuthedRequestGuarded,
  ): Promise<GetOrCreateUserResponseDto> {
    const { firebaseUid, email } = req.user;
    return await this.usersService.getOrCreateUser(firebaseUid, email);
  }

  @Get()
  @Version('1')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: 'List all users (admin only)',
    description:
      'Returns a paginated list of users. Supports page, limit, sortBy, and sortOrder query params.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    type: GetAllUsersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin only',
  })
  async getAllUsers(
    @Request() req: AuthedRequestGuarded,
    @Query() query: GetAllUsersQueryDto,
  ): Promise<GetAllUsersResponseDto> {
    return await this.usersService.getAllUsers(req.user, query);
  }

  @Get(':id')
  @Version('1')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Returns the user profile by ID',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: GetUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Request() req: AuthedRequestGuarded,
    @Param() params: GetUserDto,
  ): Promise<GetUserResponseDto> {
    return await this.usersService.getUser(params.id, req.user);
  }
}
