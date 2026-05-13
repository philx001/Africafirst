import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, UserRole } from '@crm/shared';

@ApiTags('users')
@ApiBearerAuth('supabase-jwt')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Lister les membres de l\'organisation' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user.organizationId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Utilisateur courant' })
  findMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findMe(user);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Détail d\'un utilisateur' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.findOne(id, user.organizationId);
  }

  @Patch(':id/role')
  @Roles('admin')
  @ApiOperation({ summary: 'Modifier le rôle d\'un utilisateur' })
  updateRole(@Param('id') id: string, @Body() body: { role: UserRole }, @CurrentUser() user: AuthUser) {
    return this.usersService.updateRole(id, body.role, user);
  }

  @Patch(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Désactiver un utilisateur' })
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.deactivate(id, user.organizationId);
  }
}
