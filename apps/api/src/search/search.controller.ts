import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { CurrentUser } from '../common/decorators/auth.decorator';
import { AuthUser } from '@crm/shared';

@ApiTags('search')
@ApiBearerAuth('supabase-jwt')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Recherche globale (contacts, accounts, deals, projets, tâches)' })
  search(@Query('q') query: string, @CurrentUser() user: AuthUser) {
    return this.searchService.globalSearch(query, user);
  }
}
