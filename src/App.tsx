import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { RouteLoading } from '@/components/common/RouteLoading';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const EmployeesPage = lazy(() => import('@/pages/EmployeesPage'));
const OrganizationPage = lazy(() => import('@/pages/OrganizationPage'));
const EmployeeImportPage = lazy(() => import('@/pages/EmployeeImportPage'));
const PayrollImportPage = lazy(() => import('@/pages/PayrollImportPage'));
const AttendancePage = lazy(() => import('@/pages/AttendancePage'));
const PayrollPage = lazy(() => import('@/pages/PayrollPage'));
const PayslipsPage = lazy(() => import('@/pages/PayslipsPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const ActivityLogPage = lazy(() => import('@/pages/ActivityLogPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const VerifyPayslipPage = lazy(() => import('@/pages/VerifyPayslipPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PublicRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoading />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/verify/:slipNumber" element={<PublicRoute><VerifyPayslipPage /></PublicRoute>} />

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
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="payroll.write" />}>
              <Route path="import-payroll" element={<PayrollImportPage />} />
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

        <Route path="*" element={<PublicRoute><NotFoundPage /></PublicRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
