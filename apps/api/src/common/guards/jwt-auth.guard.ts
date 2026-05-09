import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorator';
import { AuthUser, SupabaseJwtPayload } from '@crm/shared';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Autoriser les routes publiques
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token JWT manquant');
    }

    try {
      const jwtSecret = this.config.getOrThrow<string>('SUPABASE_JWT_SECRET');
      const payload = jwt.verify(token, jwtSecret) as SupabaseJwtPayload;

      // Construire le contexte utilisateur à partir du payload JWT
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        organizationId: payload.app_metadata?.organization_id,
        role: payload.app_metadata?.user_role || 'member',
        contactId: payload.app_metadata?.contact_id,
      };

      if (!user.organizationId) {
        throw new UnauthorizedException('Organization non définie dans le token');
      }

      request.user = user;
      return true;
    } catch (error) {
      this.logger.warn(`JWT invalide : ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      throw new UnauthorizedException('Token JWT invalide ou expiré');
    }
  }

  private extractToken(request: { headers: Record<string, string> }): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Fallback : cookie http-only
    const cookies = (request as unknown as { cookies?: Record<string, string> }).cookies;
    return cookies?.['sb-access-token'] || null;
  }
}
