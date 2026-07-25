import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck2, Search, Users, WalletCards } from 'lucide-react';
import { ExportMenu } from '@/components/common/ExportMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { listAttendance } from '@/services/attendance.service';
import { listEmployees } from '@/services/employee.service';
import { getOrganization } from '@/services/lookup.service';
import { listPayrolls } from '@/services/payroll.service';
import {
  formatCurrency,
  formatNumber,
  formatPeriod,
  fromMonthInput,
  toMonthInput,
  currentPeriod,
} from '@/utils/format';

type ReportTab = 'payroll' | 'employees' | 'attendance';

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('payroll');
  const [period, setPeriod] = useState(toMonthInput(currentPeriod()));
  const [divisionId, setDivisionId] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [year, month] = period.split('-');

  const organization = useQuery({ queryKey: ['organization'], queryFn: getOrganization });
  const payroll = useQuery({
    queryKey: ['reports-payroll', period, divisionId, debounced],
    queryFn: () => listPayrolls({ year, month, divisionId, search: debounced }),
    enabled: tab === 'payroll',
  });
  const employees = useQuery({
    queryKey: ['reports-employees', divisionId, debounced],
    queryFn: () => listEmployees({ divisionId, search: debounced, archive: 'all' }),
    enabled: tab === 'employees',
  });
  const attendance = useQuery({
    queryKey: ['reports-attendance', period, debounced],
    queryFn: () => listAttendance({ period: fromMonthInput(period), search: debounced }),
    enabled: tab === 'attendance',
  });

  const payrollTotals = useMemo(() => (payroll.data ?? []).reduce((acc, row) => ({
    gross: acc.gross + Number(row.total_income),
    deduction: acc.deduction + Number(row.total_deduction),
    net: acc.net + Number(row.net_salary),
  }), { gross: 0, deduction: 0, net: 0 }), [payroll.data]);

  const attendanceTotals = useMemo(() => (attendance.data ?? []).reduce((acc, row) => ({
    present: acc.present + row.present_days,
    absent: acc.absent + row.absent_days,
    overtime: acc.overtime + Number(row.overtime_hours),
  }), { present: 0, absent: 0, overtime: 0 }), [attendance.data]);

  const loading = tab === 'payroll' ? payroll.isLoading : tab === 'employees' ? employees.isLoading : attendance.isLoading;

  return (
    <>
      <PageHeader
        title="Laporan"
        description="Laporan payroll, karyawan, dan kehadiran yang dapat difilter serta diekspor ke Excel, CSV, atau PDF."
        actions={
          tab === 'payroll' ? (
            <ExportMenu options={{
              rows: payroll.data ?? [],
              columns: [
                { label: 'Nomor Slip', value: row => row.slip_number },
                { label: 'Periode', value: row => row.period },
                { label: 'NIK', value: row => row.nik },
                { label: 'Nama', value: row => row.employee_name },
                { label: 'Divisi', value: row => row.division_name },
                { label: 'Departemen', value: row => row.department_name },
                { label: 'Jabatan', value: row => row.position_name },
                { label: 'Pendapatan', value: row => Number(row.total_income) },
                { label: 'Potongan', value: row => Number(row.total_deduction) },
                { label: 'Total Bersih', value: row => Number(row.net_salary) },
                { label: 'Status', value: row => row.status },
              ],
              fileName: `laporan-payroll-${period}`,
              title: `Laporan Payroll ${formatPeriod(fromMonthInput(period))}`,
              entityType: 'reports',
            }} />
          ) : tab === 'employees' ? (
            <ExportMenu options={{
              rows: employees.data ?? [],
              columns: [
                { label: 'NIK', value: row => row.nik },
                { label: 'Nama', value: row => row.name },
                { label: 'Divisi', value: row => row.division_name },
                { label: 'Departemen', value: row => row.department_name },
                { label: 'Jabatan', value: row => row.position_name },
                { label: 'Status', value: row => row.employment_status },
                { label: 'Tanggal Masuk', value: row => row.join_date },
                { label: 'Gaji Pokok', value: row => Number(row.basic_salary) },
                { label: 'Email', value: row => row.email },
                { label: 'Diarsipkan', value: row => row.deleted_at ?? '' },
              ],
              fileName: 'laporan-karyawan',
              title: 'Laporan Karyawan',
              entityType: 'reports',
            }} />
          ) : (
            <ExportMenu options={{
              rows: attendance.data ?? [],
              columns: [
                { label: 'NIK', value: row => row.nik },
                { label: 'Nama', value: row => row.employee_name },
                { label: 'Divisi', value: row => row.division_name },
                { label: 'Departemen', value: row => row.department_name },
                { label: 'Periode', value: row => row.period },
                { label: 'Hari Kerja', value: row => row.working_days },
                { label: 'Hadir', value: row => row.present_days },
                { label: 'Sakit', value: row => row.sick_days },
                { label: 'Izin', value: row => row.leave_days },
                { label: 'Alpa', value: row => row.absent_days },
                { label: 'Jam Lembur', value: row => Number(row.overtime_hours) },
              ],
              fileName: `laporan-kehadiran-${period}`,
              title: `Laporan Kehadiran ${formatPeriod(fromMonthInput(period))}`,
              entityType: 'reports',
            }} />
          )
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab('payroll')}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'payroll' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              <WalletCards className="mr-2 inline size-4" /> Laporan Payroll
            </button>
            <button
              onClick={() => setTab('employees')}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'employees' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              <Users className="mr-2 inline size-4" /> Laporan Karyawan
            </button>
            <button
              onClick={() => setTab('attendance')}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'attendance' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              <CalendarCheck2 className="mr-2 inline size-4" /> Laporan Kehadiran
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[220px_1fr_1fr]">
            <Input type="month" value={period} onChange={event => setPeriod(event.target.value)} disabled={tab === 'employees'} />
            <Select value={divisionId} onChange={event => setDivisionId(event.target.value)}>
              <option value="">Semua Divisi</option>
              {organization.data?.divisions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Pencarian instan..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {tab === 'payroll' && (
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Pendapatan" value={formatCurrency(payrollTotals.gross)} icon={WalletCards} />
          <StatCard label="Total Potongan" value={formatCurrency(payrollTotals.deduction)} icon={WalletCards} index={1} />
          <StatCard label="Total Bersih" value={formatCurrency(payrollTotals.net)} icon={WalletCards} index={2} />
        </section>
      )}
      {tab === 'employees' && (
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Karyawan" value={formatNumber(employees.data?.length ?? 0)} icon={Users} />
          <StatCard label="Karyawan Aktif" value={formatNumber((employees.data ?? []).filter(row => !row.deleted_at && row.employment_status !== 'inactive').length)} icon={Users} index={1} />
          <StatCard label="Karyawan Diarsipkan" value={formatNumber((employees.data ?? []).filter(row => row.deleted_at).length)} icon={Users} index={2} />
        </section>
      )}
      {tab === 'attendance' && (
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Hari Hadir" value={formatNumber(attendanceTotals.present)} icon={CalendarCheck2} />
          <StatCard label="Total Hari Alpa" value={formatNumber(attendanceTotals.absent)} icon={CalendarCheck2} index={1} />
          <StatCard label="Total Jam Lembur" value={formatNumber(attendanceTotals.overtime)} icon={CalendarCheck2} index={2} />
        </section>
      )}

      <Card className="mt-5 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} columns={8} />
        ) : tab === 'payroll' ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1100px]">
              <thead><tr><th>Nomor Slip</th><th>Karyawan</th><th>Periode</th><th>Divisi</th><th>Pendapatan</th><th>Potongan</th><th>Total Bersih</th><th>Status</th></tr></thead>
              <tbody>{(payroll.data ?? []).map(row => <tr key={row.id}>
                <td className="font-mono text-xs">{row.slip_number}</td><td><p className="font-bold">{row.employee_name}</p><p className="text-xs text-slate-500">{row.nik}</p></td>
                <td>{formatPeriod(row.period)}</td><td>{row.division_name}</td><td>{formatCurrency(row.total_income)}</td>
                <td>{formatCurrency(row.total_deduction)}</td><td className="font-black text-emerald-600">{formatCurrency(row.net_salary)}</td><td>{row.status}</td>
              </tr>)}</tbody>
            </table>
          </div>
        ) : tab === 'employees' ? (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1000px]">
              <thead><tr><th>NIK</th><th>Nama</th><th>Divisi</th><th>Departemen</th><th>Jabatan</th><th>Status</th><th>Tanggal Masuk</th><th>Gaji Pokok</th></tr></thead>
              <tbody>{(employees.data ?? []).map(row => <tr key={row.id}><td>{row.nik}</td><td className="font-bold">{row.name}</td><td>{row.division_name}</td><td>{row.department_name}</td><td>{row.position_name}</td><td>{row.deleted_at ? 'Diarsipkan' : row.employment_status}</td><td>{row.join_date}</td><td>{formatCurrency(row.basic_salary)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[1000px]">
              <thead><tr><th>NIK</th><th>Nama</th><th>Periode</th><th>Hari Kerja</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alpa</th><th>Lembur</th></tr></thead>
              <tbody>{(attendance.data ?? []).map(row => <tr key={row.id}><td>{row.nik}</td><td className="font-bold">{row.employee_name}</td><td>{formatPeriod(row.period)}</td><td>{row.working_days}</td><td>{row.present_days}</td><td>{row.sick_days}</td><td>{row.leave_days}</td><td>{row.absent_days}</td><td>{formatNumber(row.overtime_hours)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
