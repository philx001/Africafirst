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
import { SupabaseService } from '../../config/supabase.service';
import { PrismaService } from '../../config/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'OPTIONS') return true;

    // Autoriser les routes publiques
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token JWT manquant');
    }

    try {
      const user = await this.resolveAuthUser(token);
      request.user = user;
      return true;
    } catch (error) {
      this.logger.warn(`JWT invalide : ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      throw new UnauthorizedException('Token JWT invalide ou expiré');
    }
  }

  private async resolveAuthUser(token: string): Promise<AuthUser> {
    // 1) Legacy/local mode: verify with shared secret (HS256).
    try {
      const jwtSecret = this.config.getOrThrow<string>('SUPABASE_JWT_SECRET');
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as SupabaseJwtPayload;
      const organizationId = payload.app_metadata?.organization_id;
      if (!organizationId) {
        throw new UnauthorizedException('Organization non définie dans le token');
      }
      const dbUser = await this.prisma.user.findFirst({
        where: { supabaseId: payload.sub, organizationId },
        select: { id: true, email: true, role: true, contactId: true },
      });
      if (!dbUser) {
        throw new UnauthorizedException('Utilisateur local introuvable');
      }
      return {
        id: dbUser.id,
        email: dbUser.email,
        organizationId,
        role: dbUser.role,
        contactId: dbUser.contactId ?? payload.app_metadata?.contact_id,
      };
    } catch {
      // 2) Supabase managed JWTs (often RS256): validate through Supabase Auth API.
      const { data, error } = await this.supabase.getAdminClient().auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedException('Session Supabase invalide');
      }
      const organizationId =
        (data.user.app_metadata?.organization_id as string | undefined) ??
        (data.user.user_metadata?.organization_id as string | undefined);
      if (!organizationId) {
        throw new UnauthorizedException('Organization non définie dans la session Supabase');
      }
      const dbUser = await this.prisma.user.findFirst({
        where: { supabaseId: data.user.id, organizationId },
        select: { id: true, email: true, role: true, contactId: true },
      });
      if (!dbUser) {
        throw new UnauthorizedException('Utilisateur local introuvable');
      }
      return {
        id: dbUser.id,
        email: dbUser.email,
        organizationId,
        role: dbUser.role,
        contactId:
          dbUser.contactId ?? ((data.user.app_metadata?.contact_id as string | undefined) ?? undefined),
      };
    }
  }

  private extractToken(request: {
    headers: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string>;
  }): string | null {
    const rawAuthHeader = request.headers['authorization'];
    const authHeader = Array.isArray(rawAuthHeader) ? rawAuthHeader[0] : rawAuthHeader;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Fallback : cookie http-only
    return request.cookies?.['sb-access-token'] || null;
  }
}
