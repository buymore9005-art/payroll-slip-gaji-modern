export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type AppRole = 'super_admin' | 'hrd' | 'admin_payroll';
export type EmploymentStatus = 'permanent' | 'contract' | 'probation' | 'intern' | 'inactive';
export type PayrollStatus = 'draft' | 'finalized' | 'paid' | 'cancelled';

export interface ProfileRow {
  id: string; email: string; full_name: string; role: AppRole; is_active: boolean;
  avatar_path: string | null; last_login_at: string | null; created_at: string; updated_at: string;
}
export interface CompanySettingsRow {
  id: number; company_name: string; address: string; email: string; phone: string; tax_id: string;
  logo_path: string | null; currency: string; timezone: string; watermark_text: string;
  registration_invite_code: string; updated_at: string;
}
export interface DivisionRow { id: string; name: string; description: string; created_at: string; updated_at: string }
export interface DepartmentRow { id: string; division_id: string; name: string; description: string; created_at: string; updated_at: string }
export interface PositionRow { id: string; department_id: string | null; name: string; description: string; created_at: string; updated_at: string }
export interface EmployeeRow {
  id: string; nik: string; name: string; division_id: string; department_id: string; position_id: string;
  employment_status: EmploymentStatus; join_date: string; bank_account: string; bank_name: string;
  npwp: string; bpjs: string; basic_salary: number; fixed_allowance: number; variable_allowance: number;
  email: string; phone: string; photo_path: string | null; created_by: string | null; updated_by: string | null;
  created_at: string; updated_at: string;
}
export interface EmployeeDirectoryRow extends EmployeeRow {
  division_name: string; department_name: string; position_name: string;
}
export interface PayrollRow {
  id: string; employee_id: string; period: string; slip_number: string; verification_token: string;
  basic_salary: number; fixed_allowance: number; variable_allowance: number; bonus: number; incentive: number;
  overtime: number; thr: number; deduction: number; loan: number; bpjs: number; tax: number;
  total_income: number; total_deduction: number; net_salary: number; status: PayrollStatus;
  employee_snapshot: Json; company_snapshot: Json; finalized_at: string | null; paid_at: string | null;
  notes: string; created_by: string | null; updated_by: string | null; created_at: string; updated_at: string;
}
export interface PayrollDetailRow extends PayrollRow {
  employee_name: string; nik: string; division_id: string; department_id: string; position_id: string;
  position_name: string; division_name: string; department_name: string;
}
export interface AttendanceRow {
  id: string; employee_id: string; period: string; working_days: number; present_days: number; sick_days: number;
  leave_days: number; absent_days: number; overtime_hours: number; notes: string;
  created_by: string | null; updated_by: string | null; created_at: string; updated_at: string;
}
export interface AttendanceDetailRow extends AttendanceRow {
  employee_name: string; nik: string; division_name: string; department_name: string;
}
export interface ActivityLogRow {
  id: number; user_id: string | null; action: string; entity_type: string; entity_id: string | null;
  description: string; metadata: Json; ip_address: string | null; user_agent: string | null;
  device: string | null; created_at: string; user_name?: string | null; user_email?: string | null;
}
export interface DashboardSummary {
  total_employees: number; total_payslips: number; total_salary_expense: number; total_bonus: number;
  total_deductions: number; today_payroll_count: number; today_payroll_amount: number;
  monthly: Array<{ period: string; expense: number; bonus: number; deductions: number }>;
  divisions: Array<{ name: string; value: number }>;
  departments: Array<{ name: string; value: number }>;
  attendance: Array<{ label: string; value: number }>;
}
export interface VerifiedPayslip {
  slip_number: string; period: string; employee_name: string; nik_masked: string; position_name: string;
  company_name: string; net_salary: number; status: PayrollStatus; finalized_at: string | null; valid: boolean;
}
