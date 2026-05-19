import { extractMentionEmails } from './ticket-mention.helper';

describe('extractMentionEmails', () => {
  it('returns unique lowercase emails', () => {
    expect(extractMentionEmails('Salut @Alice@test.com et @alice@test.com')).toEqual(['alice@test.com']);
  });

  it('finds several mentions', () => {
    expect(extractMentionEmails('@a@x.co @b@y.fr fin')).toEqual(['a@x.co', 'b@y.fr']);
  });

  it('returns empty when none', () => {
    expect(extractMentionEmails('Pas de mention')).toEqual([]);
  });
});
