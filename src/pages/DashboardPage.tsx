import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CalendarDays,
  Gift,
  ReceiptText,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { currentPeriod, formatCurrency, formatNumber, formatPeriod } from '@/utils/format';
import { getDashboardSummary } from '@/services/dashboard.service';

const pieColors = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48'];

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const period = currentPeriod();
  const query = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => getDashboardSummary(period),
  });

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Dashboard Payroll" description="Ringkasan operasional dan finansial perusahaan." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-36" />)}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-96" /><Skeleton className="h-96" />
        </div>
      </>
    );
  }

  if (query.isError || !query.data) {
    throw query.error instanceof Error ? query.error : new Error('Dashboard tidak dapat dimuat.');
  }

  const data = query.data;
  const monthly = data.monthly.map(item => ({
    ...item,
    label: formatPeriod(item.period).replace(/\s\d{4}$/, ''),
  }));

  return (
    <>
      <PageHeader
        title="Dashboard Payroll"
        description={`Pantau karyawan, beban gaji, bonus, potongan, dan kehadiran periode ${formatPeriod(period)}.`}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard index={0} label="Total Karyawan" value={formatNumber(data.total_employees)} description="Karyawan aktif" icon={Users} />
        <StatCard index={1} label="Total Slip Gaji" value={formatNumber(data.total_payslips)} description="Slip final & dibayar" icon={ReceiptText} />
        <StatCard index={2} label="Pengeluaran Gaji" value={formatCurrency(data.total_salary_expense)} description="Akumulasi periode ini" icon={WalletCards} />
        <StatCard index={3} label="Total Bonus" value={formatCurrency(data.total_bonus)} description="Bonus periode ini" icon={Gift} />
        <StatCard index={4} label="Total Potongan" value={formatCurrency(data.total_deductions)} description="Seluruh komponen potongan" icon={Banknote} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <ChartCard title="Grafik Payroll" description="Tren pengeluaran, bonus, dan potongan enam bulan terakhir.">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="salaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={value => `${Math.round(Number(value) / 1_000_000)}jt`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={value => formatCurrency(Number(value))} />
              <Legend />
              <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#4f46e5" fill="url(#salaryGradient)" strokeWidth={3} />
              <Area type="monotone" dataKey="bonus" name="Bonus" stroke="#059669" fillOpacity={0} strokeWidth={2} />
              <Area type="monotone" dataKey="deductions" name="Potongan" stroke="#e11d48" fillOpacity={0} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="overflow-hidden bg-gradient-to-br from-brand-700 to-violet-700 text-white">
          <CardContent className="flex h-full min-h-80 flex-col justify-between p-7">
            <div>
              <div className="inline-flex rounded-2xl bg-white/15 p-3 backdrop-blur">
                <CalendarDays className="size-6" />
              </div>
              <p className="mt-6 text-sm font-semibold text-white/70">Ringkasan Payroll Hari Ini</p>
              <p className="mt-2 text-4xl font-black">{formatNumber(data.today_payroll_count)}</p>
              <p className="mt-1 text-sm text-white/65">aktivitas payroll dibuat atau diperbarui</p>
            </div>
            <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-white/60">Nilai Payroll Hari Ini</p>
              <p className="mt-2 text-2xl font-black">{formatCurrency(data.today_payroll_amount)}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Grafik Divisi" description="Distribusi jumlah karyawan per divisi.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.divisions} dataKey="value" nameKey="name" innerRadius={62} outerRadius={105} paddingAngle={3}>
                {data.divisions.map((entry, index) => <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />)}
              </Pie>
              <Tooltip formatter={value => `${formatNumber(Number(value))} karyawan`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Grafik Departemen" description="Jumlah karyawan pada departemen terbesar.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.departments} layout="vertical" margin={{ left: 28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} />
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={value => `${formatNumber(Number(value))} karyawan`} />
              <Bar dataKey="value" name="Karyawan" fill="#7c3aed" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Grafik Kehadiran" description="Akumulasi status kehadiran periode berjalan.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.attendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.18} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={value => `${formatNumber(Number(value))} hari`} />
              <Bar dataKey="value" name="Hari" fill="#0891b2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white">Statistik Bulanan</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Perbandingan ringkas enam periode terakhir.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {monthly.slice().reverse().map(item => (
              <div key={item.period} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div>
                  <p className="text-sm font-bold">{formatPeriod(item.period)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bonus {formatCurrency(item.bonus)} · Potongan {formatCurrency(item.deductions)}
                  </p>
                </div>
                <p className="text-sm font-black text-brand-600 dark:text-brand-300">{formatCurrency(item.expense)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
