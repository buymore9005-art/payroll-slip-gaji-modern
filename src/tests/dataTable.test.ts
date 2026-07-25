import { describe, expect, it } from 'vitest';
import { sortRows, type TableColumn } from '@/hooks/useDataTable';

type Row = { name: string; salary: number; division: string };
const columns: Array<TableColumn<Row, 'name' | 'salary' | 'division'>> = [
  { key: 'name', label: 'Nama', accessor: row => row.name },
  { key: 'salary', label: 'Gaji', accessor: row => row.salary },
  { key: 'division', label: 'Divisi', accessor: row => row.division },
];

describe('sortRows', () => {
  it('mengurutkan satu kolom angka', () => {
    const rows = [
      { name: 'B', salary: 2, division: 'X' },
      { name: 'A', salary: 1, division: 'Y' },
    ];
    expect(sortRows(rows, columns, [{ key: 'salary', direction: 'asc' }]).map(row => row.salary))
      .toEqual([1, 2]);
  });

  it('mendukung multi-column sort', () => {
    const rows = [
      { name: 'B', salary: 1, division: 'X' },
      { name: 'A', salary: 1, division: 'X' },
      { name: 'C', salary: 1, division: 'Y' },
    ];
    expect(sortRows(rows, columns, [
      { key: 'division', direction: 'asc' },
      { key: 'name', direction: 'asc' },
    ]).map(row => row.name)).toEqual(['A', 'B', 'C']);
  });
});
