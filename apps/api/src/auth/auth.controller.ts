import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public, CurrentUser, Roles } from '../common/decorators/auth.decorator';
import { AuthUser, RATE_LIMIT } from '@crm/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { ttl: RATE_LIMIT.AUTH_TTL * 1000, limit: RATE_LIMIT.AUTH_LIMIT } })
  @ApiOperation({ summary: 'Créer un nouveau compte et une organisation' })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email ou slug déjà utilisé' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: RATE_LIMIT.AUTH_TTL * 1000, limit: RATE_LIMIT.AUTH_LIMIT } })
  @ApiOperation({ summary: 'Connexion (retourne les tokens Supabase)' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('invite')
  @Roles('admin')
  @ApiOperation({ summary: 'Inviter un utilisateur dans l\'organisation' })
  @ApiResponse({ status: 201, description: 'Invitation envoyée' })
  invite(
    @CurrentUser() user: AuthUser,
    @Body() body: { email: string; role: 'admin' | 'member' | 'client' },
  ) {
    return this.authService.inviteUser(
      user.organizationId,
      body.email,
      body.role,
      `${user.email}`,
    );
  }
}
