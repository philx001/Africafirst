import { Injectable, UnauthorizedException, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { PrismaService } from '../config/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@crm/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Inscription : crée l'organisation + l'utilisateur dans Supabase Auth + Prisma
   */
  async register(dto: RegisterDto) {
    const adminClient = this.supabase.getAdminClient();

    // Vérifier si le slug de l'organisation est disponible
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });
    if (existingOrg) {
      throw new ConflictException('Ce nom d\'organisation est déjà pris');
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      app_metadata: {
        user_role: 'admin' as UserRole,
      },
    });

    if (authError || !authData.user) {
      this.logger.error('Erreur création Supabase Auth', authError);
      throw new UnauthorizedException(authError?.message || 'Erreur lors de la création du compte');
    }

    // Créer l'organisation et l'utilisateur en base via une transaction
    const { organization, user } = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: dto.organizationSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          supabaseId: authData.user!.id,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'admin',
          organizationId: organization.id,
        },
      });

      return { organization, user };
    });

    // Mettre à jour les app_metadata avec organization_id
    await adminClient.auth.admin.updateUserById(authData.user.id, {
      app_metadata: {
        organization_id: organization.id,
        user_role: 'admin' as UserRole,
      },
    });

    this.logger.log(`Nouveau tenant créé : ${organization.slug} (admin: ${user.email})`);

    return {
      message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.',
      organizationId: organization.id,
    };
  }

  /**
   * Connexion : délégué à Supabase Auth
   * Le frontend utilise directement @supabase/ssr pour la connexion
   * Cette méthode est pour la documentation Swagger
   */
  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.getClient().auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.user_role,
        organizationId: data.user.app_metadata?.organization_id,
      },
    };
  }

  /**
   * Inviter un utilisateur dans une organisation existante
   */
  async inviteUser(
    organizationId: string,
    email: string,
    role: UserRole,
    inviterName: string,
  ) {
    const adminClient = this.supabase.getAdminClient();
    const webUrl =
      this.config.get<string>('NEXT_PUBLIC_WEB_URL') ||
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ||
      'http://localhost:3000';

    const { data: authData, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_id: organizationId,
        user_role: role,
      },
      // Le lien d'invitation doit revenir vers le frontend (et non l'API).
      redirectTo: `${webUrl}/login`,
    });

    if (error) {
      throw new ConflictException(error.message);
    }

    // Pré-créer l'entrée utilisateur dans Prisma
    await this.prisma.user.create({
      data: {
        supabaseId: authData.user.id,
        email,
        role,
        organizationId,
      },
    });

    this.logger.log(`Invitation envoyée à ${email} (org: ${organizationId}, rôle: ${role}) par ${inviterName}`);
    return { message: `Invitation envoyée à ${email}` };
  }
}
