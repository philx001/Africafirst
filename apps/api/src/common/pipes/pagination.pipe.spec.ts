import { PaginationDto } from './pagination.pipe';

describe('PaginationDto', () => {
  it('provides sane default values', () => {
    const dto = new PaginationDto();

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('accepts extra filter fields used by list endpoints', () => {
    const dto = new PaginationDto();
    dto.status = 'todo';
    dto.projectId = 'proj_123';
    dto.assigneeId = 'user_456';
    dto.contactId = 'contact_789';
    dto.dealId = 'deal_111';
    dto.type = 'note';

    expect(dto.status).toBe('todo');
    expect(dto.projectId).toBe('proj_123');
    expect(dto.assigneeId).toBe('user_456');
    expect(dto.contactId).toBe('contact_789');
    expect(dto.dealId).toBe('deal_111');
    expect(dto.type).toBe('note');
  });
});
