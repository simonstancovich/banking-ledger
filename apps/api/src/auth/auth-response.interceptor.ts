import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GetOrCreateUserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class AuthResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: GetOrCreateUserResponseDto) => {
        // Return 201 if user was created, 200 if user already exists
        // Applies to both register and login endpoints
        if (data.created) {
          throw new HttpException(data, HttpStatus.CREATED);
        }
        return data;
      }),
    );
  }
}
