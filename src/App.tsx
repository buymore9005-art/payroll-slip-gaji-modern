import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Skeleton } from '@/components/ui/Skeleton';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'));
const OrganizationPage = lazy(() => import('@/pages/OrganizationPage'));
const EmployeeImportPage = lazy(() => import('@/pages/EmployeeImportPage'));
const AttendancePage = lazy(() => import('@/pages/AttendancePage'));
const PayrollPage = lazy(() => import('@/pages/PayrollPage'));
const PayslipsPage = lazy(() => import('@/pages/PayslipsPage'));
const ActivityLogPage = lazy(() => import('@/pages/ActivityLogPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const VerifyPayslipPage = lazy(() => import('@/pages/VerifyPayslipPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function RouteLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6 sm:p-10">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-[min(36rem,90%)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify/:slipNumber" element={<VerifyPayslipPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />

              <Route element={<ProtectedRoute permission="dashboard.read" />}>
                <Route path="dashboard" element={<DashboardPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="employees.read" />}>
                <Route path="employees" element={<EmployeesPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="organization.write" />}>
                <Route path="organization" element={<OrganizationPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="employees.import" />}>
                <Route path="import-employees" element={<EmployeeImportPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="attendance.read" />}>
                <Route path="attendance" element={<AttendancePage />} />
              </Route>

              <Route element={<ProtectedRoute permission="payroll.read" />}>
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="payslips" element={<PayslipsPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="activity.read" />}>
                <Route path="activity" element={<ActivityLogPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="users.manage" />}>
                <Route path="users" element={<UsersPage />} />
              </Route>

              <Route element={<ProtectedRoute permission="settings.manage" />}>
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
