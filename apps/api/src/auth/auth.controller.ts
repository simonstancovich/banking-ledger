import {
  Controller,
  Post,
  Get,
  Version,
  UseGuards,
  UseInterceptors,
  Req,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FirebaseAuthGuard, AuthedRequestUser } from './firebase-auth.guard';
import { UsersService } from '../users/users.service';
import { GetOrCreateUserResponseDto } from '../users/dto/user-response.dto';
import { Request as ExpressRequest } from 'express';
import { AuthResponseInterceptor } from './auth-response.interceptor';

interface AuthedRequest extends ExpressRequest {
  user: AuthedRequestUser;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Shared authentication handler
   * Extracts user from request and calls service
   */
  private async handleAuthentication(
    req: AuthedRequest,
  ): Promise<GetOrCreateUserResponseDto> {
    const { firebaseUid, email } = req.user;
    return this.usersService.getOrCreateUser(firebaseUid, email);
  }

  @Post('register')
  @Version('1')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(AuthResponseInterceptor)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account from Firebase authentication token. This endpoint is idempotent - calling it multiple times with the same token will return the existing user if already registered.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User already exists',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(
    @Req() req: AuthedRequest,
  ): Promise<GetOrCreateUserResponseDto> {
    return this.handleAuthentication(req);
  }

  @Post('login')
  @Version('1')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(AuthResponseInterceptor)
  @ApiOperation({
    summary: 'Login existing user',
    description:
      'Authenticates and returns user data from Firebase token. If user does not exist in database, it will be created automatically.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({
    status: 201,
    description: 'User created during login',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async login(@Req() req: AuthedRequest): Promise<GetOrCreateUserResponseDto> {
    return this.handleAuthentication(req);
  }

  @Get('me')
  @Version('1')
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the current authenticated user profile based on Firebase token',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: GetOrCreateUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  async getMe(@Request() req: AuthedRequest): Promise<GetOrCreateUserResponseDto> {
    return this.handleAuthentication(req);
  }
}
