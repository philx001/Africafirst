import { escapeCsvCell, toCsv } from './csv';

describe('csv utils', () => {
  it('escapes quotes', () => {
    expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""');
  });

  it('builds csv with bom', () => {
    const csv = toCsv(['a', 'b'], [[1, 'x'], [null, 'y']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"a","b"');
    expect(csv).toContain('"1","x"');
    expect(csv).toContain('"","y"');
  });
});
