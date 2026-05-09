import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorator';
import { AuthUser, UserRole } from '@crm/shared';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Accès refusé. Rôle requis : ${requiredRoles.join(' ou ')}`,
      );
    }

    return true;
  }
}
