import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { SupabaseService } from '../config/supabase.service';
import { AuthUser, UserRole } from '@crm/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async findMe(user: AuthUser) {
    return this.findOne(user.id, user.organizationId);
  }

  async updateRole(id: string, role: UserRole, actor: AuthUser) {
    await this.findOne(id, actor.organizationId);

    // Mettre à jour le rôle dans Prisma
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    // Mettre à jour le rôle sans écraser organization_id/contact_id dans app_metadata.
    const supabaseUser = await this.prisma.user.findUnique({ where: { id }, select: { supabaseId: true } });
    if (supabaseUser) {
      const adminClient = this.supabase.getAdminClient();
      const { data } = await adminClient.auth.admin.getUserById(supabaseUser.supabaseId);
      await adminClient.auth.admin.updateUserById(supabaseUser.supabaseId, {
        app_metadata: {
          ...(data.user?.app_metadata ?? {}),
          user_role: role,
        },
      });
    }

    return updated;
  }

  async deactivate(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
