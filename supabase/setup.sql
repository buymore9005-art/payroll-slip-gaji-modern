-- ============================================================================
-- Payroll & Slip Gaji Modern — Supabase One-Run Setup
-- Jalankan seluruh file ini satu kali melalui Supabase SQL Editor.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- ENUM
-- --------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('super_admin', 'hrd', 'admin_payroll');
  end if;
  if not exists (select 1 from pg_type where typname = 'employment_status') then
    create type public.employment_status as enum ('permanent', 'contract', 'probation', 'intern', 'inactive');
  end if;
  if not exists (select 1 from pg_type where typname = 'payroll_status') then
    create type public.payroll_status as enum ('draft', 'finalized', 'paid', 'cancelled');
  end if;
end
$$;

-- --------------------------------------------------------------------------
-- TABLES
-- --------------------------------------------------------------------------
create table if not exists public.company_settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null default 'PT Nusantara Karya Digital',
  address text not null default '',
  email text not null default '',
  phone text not null default '',
  tax_id text not null default '',
  logo_path text,
  currency text not null default 'IDR' check (currency = 'IDR'),
  timezone text not null default 'Asia/Jakarta',
  watermark_text text not null default 'CONFIDENTIAL',
  registration_invite_code text not null default upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 12)),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.app_role not null default 'admin_payroll',
  is_active boolean not null default true,
  avatar_path text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on update cascade on delete restrict,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (division_id, name)
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on update cascade on delete restrict,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists positions_scope_name_uidx
  on public.positions (coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  nik text not null unique,
  name text not null,
  division_id uuid not null references public.divisions(id) on update cascade on delete restrict,
  department_id uuid not null references public.departments(id) on update cascade on delete restrict,
  position_id uuid not null references public.positions(id) on update cascade on delete restrict,
  employment_status public.employment_status not null default 'permanent',
  join_date date not null,
  bank_account text not null,
  bank_name text not null,
  npwp text not null default '',
  bpjs text not null default '',
  basic_salary numeric(18,2) not null default 0 check (basic_salary >= 0),
  fixed_allowance numeric(18,2) not null default 0 check (fixed_allowance >= 0),
  variable_allowance numeric(18,2) not null default 0 check (variable_allowance >= 0),
  email text not null default '',
  phone text not null default '',
  photo_path text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payrolls (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on update cascade on delete restrict,
  period date not null check (extract(day from period) = 1),
  slip_number text not null unique,
  verification_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  basic_salary numeric(18,2) not null default 0 check (basic_salary >= 0),
  fixed_allowance numeric(18,2) not null default 0 check (fixed_allowance >= 0),
  variable_allowance numeric(18,2) not null default 0 check (variable_allowance >= 0),
  bonus numeric(18,2) not null default 0 check (bonus >= 0),
  incentive numeric(18,2) not null default 0 check (incentive >= 0),
  overtime numeric(18,2) not null default 0 check (overtime >= 0),
  thr numeric(18,2) not null default 0 check (thr >= 0),
  deduction numeric(18,2) not null default 0 check (deduction >= 0),
  loan numeric(18,2) not null default 0 check (loan >= 0),
  bpjs numeric(18,2) not null default 0 check (bpjs >= 0),
  tax numeric(18,2) not null default 0 check (tax >= 0),
  total_income numeric(18,2) generated always as (
    basic_salary + fixed_allowance + variable_allowance + bonus + incentive + overtime + thr
  ) stored,
  total_deduction numeric(18,2) generated always as (
    deduction + loan + bpjs + tax
  ) stored,
  net_salary numeric(18,2) generated always as (
    greatest(
      basic_salary + fixed_allowance + variable_allowance + bonus + incentive + overtime + thr
      - deduction - loan - bpjs - tax,
      0
    )
  ) stored,
  status public.payroll_status not null default 'draft',
  employee_snapshot jsonb not null default '{}'::jsonb,
  company_snapshot jsonb not null default '{}'::jsonb,
  finalized_at timestamptz,
  paid_at timestamptz,
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period)
);

create table if not exists public.attendance_summaries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on update cascade on delete restrict,
  period date not null check (extract(day from period) = 1),
  working_days integer not null default 0 check (working_days between 0 and 31),
  present_days integer not null default 0 check (present_days between 0 and 31),
  sick_days integer not null default 0 check (sick_days between 0 and 31),
  leave_days integer not null default 0 check (leave_days between 0 and 31),
  absent_days integer not null default 0 check (absent_days between 0 and 31),
  overtime_hours numeric(10,2) not null default 0 check (overtime_hours between 0 and 744),
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  total_rows integer not null default 0 check (total_rows >= 0),
  success_rows integer not null default 0 check (success_rows >= 0),
  failed_rows integer not null default 0 check (failed_rows >= 0),
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  device text,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- INDEXES
-- --------------------------------------------------------------------------
create index if not exists profiles_role_active_idx on public.profiles(role, is_active);
create index if not exists employees_name_idx on public.employees(lower(name));
create index if not exists employees_division_idx on public.employees(division_id);
create index if not exists employees_department_idx on public.employees(department_id);
create index if not exists employees_position_idx on public.employees(position_id);
create index if not exists employees_status_idx on public.employees(employment_status);
create index if not exists payrolls_period_idx on public.payrolls(period desc);
create index if not exists payrolls_status_period_idx on public.payrolls(status, period desc);
create index if not exists payrolls_employee_period_idx on public.payrolls(employee_id, period desc);
create index if not exists attendance_period_idx on public.attendance_summaries(period desc);
create index if not exists attendance_employee_idx on public.attendance_summaries(employee_id);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc);
create index if not exists activity_logs_user_idx on public.activity_logs(user_id, created_at desc);
create index if not exists activity_logs_action_idx on public.activity_logs(action, created_at desc);

-- --------------------------------------------------------------------------
-- REQUEST AND AUTH HELPERS
-- --------------------------------------------------------------------------
create or replace function public.request_headers()
returns jsonb
language plpgsql
stable
as $$
declare
  raw_headers text;
begin
  raw_headers := current_setting('request.headers', true);
  if raw_headers is null or raw_headers = '' then
    return '{}'::jsonb;
  end if;
  return raw_headers::jsonb;
exception when others then
  return '{}'::jsonb;
end
$$;

create or replace function public.request_ip()
returns inet
language plpgsql
stable
as $$
declare
  headers jsonb := public.request_headers();
  raw_ip text;
begin
  raw_ip := coalesce(
    nullif(split_part(headers ->> 'x-forwarded-for', ',', 1), ''),
    nullif(headers ->> 'x-real-ip', '')
  );
  if raw_ip is null then
    return null;
  end if;
  return trim(raw_ip)::inet;
exception when others then
  return null;
end
$$;

create or replace function public.request_user_agent()
returns text
language sql
stable
as $$
  select nullif(public.request_headers() ->> 'user-agent', '')
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  )
$$;

create or replace function public.has_any_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.current_user_role() = any(roles), false)
$$;

-- --------------------------------------------------------------------------
-- GENERIC TIMESTAMP AND ACTOR TRIGGERS
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create or replace function public.set_actor_columns()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'company_settings', 'profiles', 'divisions', 'departments', 'positions',
    'employees', 'payrolls', 'attendance_summaries'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', table_name);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end
$$;

drop trigger if exists trg_employee_actor on public.employees;
create trigger trg_employee_actor
before insert or update on public.employees
for each row execute function public.set_actor_columns();

drop trigger if exists trg_payroll_actor on public.payrolls;
create trigger trg_payroll_actor
before insert or update on public.payrolls
for each row execute function public.set_actor_columns();

drop trigger if exists trg_attendance_actor on public.attendance_summaries;
create trigger trg_attendance_actor
before insert or update on public.attendance_summaries
for each row execute function public.set_actor_columns();

-- --------------------------------------------------------------------------
-- AUTH BOOTSTRAP
-- First registered account becomes Super Admin.
-- Subsequent accounts require the invite code and start as Admin Payroll.
-- --------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_count integer;
  expected_invite text;
  supplied_invite text;
  assigned_role public.app_role;
  display_name text;
begin
  select count(*) into profile_count from public.profiles;
  select registration_invite_code into expected_invite
  from public.company_settings
  where id = 1;

  supplied_invite := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  display_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));

  if profile_count = 0 then
    assigned_role := 'super_admin';
  else
    if expected_invite is null or supplied_invite = '' or supplied_invite <> upper(expected_invite) then
      raise exception 'Kode undangan registrasi tidak valid.';
    end if;
    assigned_role := 'admin_payroll';
  end if;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (new.id, coalesce(new.email, ''), coalesce(nullif(display_name, ''), 'Pengguna'), assigned_role, true);

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- --------------------------------------------------------------------------
-- PROFILE PROTECTION
-- --------------------------------------------------------------------------
create or replace function public.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_user_role() is distinct from 'super_admin'::public.app_role then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end
$$;

create or replace function public.protect_last_super_admin()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  remaining integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'super_admin' and old.is_active then
      select count(*) into remaining
      from public.profiles
      where id <> old.id and role = 'super_admin' and is_active = true;
      if remaining = 0 then
        raise exception 'Super Admin aktif terakhir tidak dapat dihapus.';
      end if;
    end if;
    return old;
  end if;

  if old.role = 'super_admin'
     and old.is_active
     and (new.role <> 'super_admin' or new.is_active = false) then
    select count(*) into remaining
    from public.profiles
    where id <> old.id and role = 'super_admin' and is_active = true;
    if remaining = 0 then
      raise exception 'Role atau status Super Admin aktif terakhir tidak dapat diubah.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_10_profile_protection on public.profiles;
create trigger trg_10_profile_protection
before update on public.profiles
for each row execute function public.protect_profile_update();

drop trigger if exists trg_20_last_super_admin_update on public.profiles;
create trigger trg_20_last_super_admin_update
before update on public.profiles
for each row execute function public.protect_last_super_admin();

drop trigger if exists trg_20_last_super_admin_delete on public.profiles;
create trigger trg_20_last_super_admin_delete
before delete on public.profiles
for each row execute function public.protect_last_super_admin();

-- --------------------------------------------------------------------------
-- ORGANIZATION CONSISTENCY
-- --------------------------------------------------------------------------
create or replace function public.validate_employee_organization()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  department_division uuid;
  position_department uuid;
begin
  select division_id into department_division
  from public.departments
  where id = new.department_id;

  if department_division is null or department_division <> new.division_id then
    raise exception 'Departemen tidak berada pada divisi yang dipilih.';
  end if;

  select department_id into position_department
  from public.positions
  where id = new.position_id;

  if not found then
    raise exception 'Jabatan tidak ditemukan.';
  end if;

  if position_department is not null and position_department <> new.department_id then
    raise exception 'Jabatan tidak berada pada departemen yang dipilih.';
  end if;

  return new;
end
$$;

drop trigger if exists trg_validate_employee_organization on public.employees;
create trigger trg_validate_employee_organization
before insert or update of division_id, department_id, position_id on public.employees
for each row execute function public.validate_employee_organization();

-- --------------------------------------------------------------------------
-- ATTENDANCE VALIDATION
-- --------------------------------------------------------------------------
create or replace function public.validate_attendance_summary()
returns trigger
language plpgsql
as $$
begin
  new.period := date_trunc('month', new.period)::date;
  if new.present_days + new.sick_days + new.leave_days + new.absent_days > new.working_days then
    raise exception 'Total hadir, sakit, izin, dan alpa tidak boleh melebihi hari kerja.';
  end if;
  return new;
end
$$;

drop trigger if exists trg_validate_attendance on public.attendance_summaries;
create trigger trg_validate_attendance
before insert or update on public.attendance_summaries
for each row execute function public.validate_attendance_summary();

-- --------------------------------------------------------------------------
-- PAYROLL SNAPSHOT, NUMBERING, IMMUTABILITY, AND STATUS LIFECYCLE
-- --------------------------------------------------------------------------
create or replace function public.refresh_payroll_snapshots(target_employee uuid)
returns table(employee_snapshot jsonb, company_snapshot jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    jsonb_build_object(
      'id', e.id,
      'nik', e.nik,
      'name', e.name,
      'division_id', e.division_id,
      'division_name', d.name,
      'department_id', e.department_id,
      'department_name', dep.name,
      'position_id', e.position_id,
      'position_name', pos.name,
      'employment_status', e.employment_status,
      'join_date', e.join_date,
      'bank_account', e.bank_account,
      'bank_name', e.bank_name,
      'npwp', e.npwp,
      'bpjs', e.bpjs,
      'email', e.email,
      'phone', e.phone
    ),
    jsonb_build_object(
      'company_name', cs.company_name,
      'address', cs.address,
      'email', cs.email,
      'phone', cs.phone,
      'tax_id', cs.tax_id,
      'logo_path', cs.logo_path,
      'currency', cs.currency,
      'timezone', cs.timezone,
      'watermark_text', cs.watermark_text
    )
  from public.employees e
  cross join public.company_settings cs
  join public.divisions d on d.id = e.division_id
  join public.departments dep on dep.id = e.department_id
  join public.positions pos on pos.id = e.position_id
  where e.id = target_employee and cs.id = 1;
end
$$;

create or replace function public.prepare_payroll()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  employee_data jsonb;
  company_data jsonb;
  employee_nik text;
begin
  new.period := date_trunc('month', new.period)::date;

  if tg_op = 'INSERT' then
    select nik into employee_nik from public.employees where id = new.employee_id;
    if employee_nik is null then
      raise exception 'Karyawan payroll tidak ditemukan.';
    end if;

    if new.slip_number is null or trim(new.slip_number) = '' then
      new.slip_number :=
        'SLP-' || to_char(new.period, 'YYYYMM') || '-' ||
        upper(regexp_replace(employee_nik, '[^a-zA-Z0-9]', '', 'g')) || '-' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;

    select r.employee_snapshot, r.company_snapshot
      into employee_data, company_data
    from public.refresh_payroll_snapshots(new.employee_id) r;

    if employee_data is null then
      raise exception 'Snapshot payroll tidak dapat dibuat.';
    end if;

    new.employee_snapshot := employee_data;
    new.company_snapshot := company_data;

    if new.status in ('finalized', 'paid') and new.finalized_at is null then
      new.finalized_at := now();
    end if;
    if new.status = 'paid' and new.paid_at is null then
      new.paid_at := now();
    end if;

    return new;
  end if;

  if new.employee_id is distinct from old.employee_id or new.period is distinct from old.period then
    raise exception 'Karyawan dan periode payroll tidak dapat diubah.';
  end if;

  if old.status <> 'draft' and (
    new.slip_number is distinct from old.slip_number or
    new.verification_token is distinct from old.verification_token or
    new.basic_salary is distinct from old.basic_salary or
    new.fixed_allowance is distinct from old.fixed_allowance or
    new.variable_allowance is distinct from old.variable_allowance or
    new.bonus is distinct from old.bonus or
    new.incentive is distinct from old.incentive or
    new.overtime is distinct from old.overtime or
    new.thr is distinct from old.thr or
    new.deduction is distinct from old.deduction or
    new.loan is distinct from old.loan or
    new.bpjs is distinct from old.bpjs or
    new.tax is distinct from old.tax or
    new.employee_snapshot is distinct from old.employee_snapshot or
    new.company_snapshot is distinct from old.company_snapshot or
    new.notes is distinct from old.notes
  ) then
    raise exception 'Payroll final tidak dapat diubah.';
  end if;

  if old.status = 'draft' and new.status not in ('draft', 'finalized', 'cancelled') then
    raise exception 'Transisi status payroll tidak valid.';
  elsif old.status = 'finalized' and new.status not in ('finalized', 'paid', 'cancelled') then
    raise exception 'Transisi status payroll tidak valid.';
  elsif old.status = 'paid' and new.status <> 'paid' then
    raise exception 'Payroll yang sudah dibayar tidak dapat diubah.';
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'Payroll yang dibatalkan tidak dapat diaktifkan kembali.';
  end if;

  if old.status = 'draft' then
    select r.employee_snapshot, r.company_snapshot
      into employee_data, company_data
    from public.refresh_payroll_snapshots(new.employee_id) r;
    new.employee_snapshot := employee_data;
    new.company_snapshot := company_data;
  end if;

  if old.status = 'draft' and new.status = 'finalized' then
    new.finalized_at := now();
  end if;

  if old.status = 'finalized' and new.status = 'paid' then
    new.paid_at := now();
  end if;

  return new;
end
$$;

create or replace function public.prevent_non_draft_payroll_delete()
returns trigger
language plpgsql
as $$
begin
  if old.status <> 'draft' then
    raise exception 'Hanya payroll berstatus draft yang dapat dihapus.';
  end if;
  return old;
end
$$;

drop trigger if exists trg_10_prepare_payroll on public.payrolls;
create trigger trg_10_prepare_payroll
before insert or update on public.payrolls
for each row execute function public.prepare_payroll();

drop trigger if exists trg_prevent_non_draft_payroll_delete on public.payrolls;
create trigger trg_prevent_non_draft_payroll_delete
before delete on public.payrolls
for each row execute function public.prevent_non_draft_payroll_delete();

-- --------------------------------------------------------------------------
-- ACTIVITY LOGGING
-- --------------------------------------------------------------------------
create or replace function public.log_activity(
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_description text default '',
  p_metadata jsonb default '{}'::jsonb,
  p_device text default null
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inserted_id bigint;
begin
  if auth.uid() is null then
    raise exception 'Autentikasi diperlukan.';
  end if;

  insert into public.activity_logs (
    user_id, action, entity_type, entity_id, description, metadata,
    ip_address, user_agent, device
  )
  values (
    auth.uid(),
    upper(trim(p_action)),
    lower(trim(p_entity_type)),
    p_entity_id,
    coalesce(nullif(trim(p_description), ''), upper(trim(p_action)) || ' ' || lower(trim(p_entity_type))),
    coalesce(p_metadata, '{}'::jsonb),
    public.request_ip(),
    public.request_user_agent(),
    p_device
  )
  returning id into inserted_id;

  return inserted_id;
end
$$;

create or replace function public.audit_organization_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  row_id text;
  row_name text;
  action_name text;
begin
  if tg_op = 'DELETE' then
    row_id := old.id::text;
    row_name := old.name;
  else
    row_id := new.id::text;
    row_name := new.name;
  end if;

  if auth.uid() is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  action_name := case tg_op when 'INSERT' then 'TAMBAH' when 'UPDATE' then 'EDIT' else 'HAPUS' end;

  insert into public.activity_logs (
    user_id, action, entity_type, entity_id, description, metadata,
    ip_address, user_agent
  )
  values (
    auth.uid(),
    action_name,
    tg_table_name,
    row_id,
    action_name || ' ' || tg_table_name || ' ' || coalesce(row_name, ''),
    jsonb_build_object('operation', tg_op),
    public.request_ip(),
    public.request_user_agent()
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['divisions', 'departments', 'positions']
  loop
    execute format('drop trigger if exists trg_audit_organization on public.%I', table_name);
    execute format(
      'create trigger trg_audit_organization after insert or update or delete on public.%I for each row execute function public.audit_organization_change()',
      table_name
    );
  end loop;
end
$$;

-- --------------------------------------------------------------------------
-- VIEWS
-- --------------------------------------------------------------------------
create or replace view public.v_employee_directory
with (security_invoker = true)
as
select
  e.*,
  d.name as division_name,
  dep.name as department_name,
  pos.name as position_name
from public.employees e
join public.divisions d on d.id = e.division_id
join public.departments dep on dep.id = e.department_id
join public.positions pos on pos.id = e.position_id;

create or replace view public.v_payroll_details
with (security_invoker = true)
as
select
  p.*,
  coalesce(nullif(p.employee_snapshot ->> 'name', ''), e.name) as employee_name,
  coalesce(nullif(p.employee_snapshot ->> 'nik', ''), e.nik) as nik,
  e.division_id,
  e.department_id,
  e.position_id,
  coalesce(nullif(p.employee_snapshot ->> 'position_name', ''), pos.name) as position_name,
  coalesce(nullif(p.employee_snapshot ->> 'division_name', ''), d.name) as division_name,
  coalesce(nullif(p.employee_snapshot ->> 'department_name', ''), dep.name) as department_name
from public.payrolls p
join public.employees e on e.id = p.employee_id
join public.divisions d on d.id = e.division_id
join public.departments dep on dep.id = e.department_id
join public.positions pos on pos.id = e.position_id;

create or replace view public.v_attendance_details
with (security_invoker = true)
as
select
  a.*,
  e.name as employee_name,
  e.nik,
  d.name as division_name,
  dep.name as department_name
from public.attendance_summaries a
join public.employees e on e.id = a.employee_id
join public.divisions d on d.id = e.division_id
join public.departments dep on dep.id = e.department_id;

create or replace view public.v_activity_logs
with (security_invoker = true)
as
select
  l.*,
  p.full_name as user_name,
  p.email as user_email
from public.activity_logs l
left join public.profiles p on p.id = l.user_id;

create or replace view public.v_monthly_payroll
with (security_invoker = true)
as
select
  period,
  count(*) as payroll_count,
  sum(total_income) as total_income,
  sum(total_deduction) as total_deduction,
  sum(net_salary) as net_salary,
  sum(bonus) as total_bonus
from public.payrolls
where status in ('finalized', 'paid')
group by period;

create or replace view public.v_division_payroll
with (security_invoker = true)
as
select
  p.period,
  e.division_id,
  d.name as division_name,
  count(*) as payroll_count,
  sum(p.net_salary) as net_salary
from public.payrolls p
join public.employees e on e.id = p.employee_id
join public.divisions d on d.id = e.division_id
where p.status in ('finalized', 'paid')
group by p.period, e.division_id, d.name;

create or replace view public.v_department_payroll
with (security_invoker = true)
as
select
  p.period,
  e.department_id,
  d.name as department_name,
  count(*) as payroll_count,
  sum(p.net_salary) as net_salary
from public.payrolls p
join public.employees e on e.id = p.employee_id
join public.departments d on d.id = e.department_id
where p.status in ('finalized', 'paid')
group by p.period, e.department_id, d.name;

-- --------------------------------------------------------------------------
-- APPLICATION RPC FUNCTIONS
-- --------------------------------------------------------------------------
create or replace function public.get_registration_state()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'has_users', exists(select 1 from public.profiles),
    'invite_required', exists(select 1 from public.profiles)
  )
$$;

create or replace function public.get_company_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.is_active_user() then
    raise exception 'Akses ditolak.';
  end if;

  select to_jsonb(cs) ||
    jsonb_build_object(
      'registration_invite_code',
      case
        when public.current_user_role() = 'super_admin' then cs.registration_invite_code
        else ''
      end
    )
  into result
  from public.company_settings cs
  where cs.id = 1;

  return result;
end
$$;

create or replace function public.update_user_access(
  p_user_id uuid,
  p_role public.app_role,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.current_user_role() <> 'super_admin' then
    raise exception 'Hanya Super Admin yang dapat mengubah akses pengguna.';
  end if;

  if p_user_id = auth.uid() and p_is_active = false then
    raise exception 'Anda tidak dapat menonaktifkan akun sendiri.';
  end if;

  if p_user_id = auth.uid() and p_role <> public.current_user_role() then
    raise exception 'Role akun sendiri harus diubah oleh Super Admin lain.';
  end if;

  update public.profiles
  set role = p_role, is_active = p_is_active
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna tidak ditemukan.';
  end if;
end
$$;

create or replace function public.regenerate_registration_invite_code()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_code text;
begin
  if public.current_user_role() <> 'super_admin' then
    raise exception 'Hanya Super Admin yang dapat merotasi kode undangan.';
  end if;

  new_code := upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 12));
  update public.company_settings
  set registration_invite_code = new_code
  where id = 1;

  return new_code;
end
$$;

create or replace function public.generate_payroll_batch(p_period date)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_period date := date_trunc('month', p_period)::date;
  inserted_count integer := 0;
  active_count integer := 0;
begin
  if not public.has_any_role(array['super_admin', 'admin_payroll']::public.app_role[]) then
    raise exception 'Anda tidak memiliki izin untuk membuat payroll.';
  end if;

  select count(*) into active_count
  from public.employees
  where employment_status <> 'inactive';

  insert into public.payrolls (
    employee_id,
    period,
    slip_number,
    basic_salary,
    fixed_allowance,
    variable_allowance,
    bonus,
    incentive,
    overtime,
    thr,
    deduction,
    loan,
    bpjs,
    tax,
    status,
    notes,
    created_by,
    updated_by
  )
  select
    e.id,
    normalized_period,
    '',
    e.basic_salary,
    e.fixed_allowance,
    e.variable_allowance,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    'draft'::public.payroll_status,
    'Dibuat melalui generate payroll massal',
    auth.uid(),
    auth.uid()
  from public.employees e
  where e.employment_status <> 'inactive'
  on conflict (employee_id, period) do nothing;

  get diagnostics inserted_count = row_count;

  return jsonb_build_object(
    'inserted', inserted_count,
    'skipped', greatest(active_count - inserted_count, 0)
  );
end
$$;

create or replace function public.verify_payslip(
  p_slip_number text,
  p_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
  employee_nik text;
begin
  select coalesce(p.employee_snapshot ->> 'nik', ''),
    jsonb_build_object(
      'slip_number', p.slip_number,
      'period', p.period,
      'employee_name', coalesce(p.employee_snapshot ->> 'name', ''),
      'nik_masked', '',
      'position_name', coalesce(p.employee_snapshot ->> 'position_name', ''),
      'company_name', coalesce(p.company_snapshot ->> 'company_name', ''),
      'net_salary', p.net_salary,
      'status', p.status,
      'finalized_at', p.finalized_at,
      'valid', true
    )
  into employee_nik, result
  from public.payrolls p
  where p.slip_number = p_slip_number
    and p.verification_token = p_token
    and p.status in ('finalized', 'paid')
  limit 1;

  if result is null then
    return null;
  end if;

  result := jsonb_set(
    result,
    '{nik_masked}',
    to_jsonb(
      case
        when length(employee_nik) <= 4 then repeat('*', length(employee_nik))
        else left(employee_nik, 2) || repeat('*', greatest(length(employee_nik) - 4, 1)) || right(employee_nik, 2)
      end
    )
  );

  return result;
end
$$;

create or replace function public.get_dashboard_summary(p_period date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  normalized_period date := date_trunc('month', p_period)::date;
  result jsonb;
  configured_timezone text;
begin
  if not public.is_active_user() then
    raise exception 'Akses ditolak.';
  end if;

  select timezone into configured_timezone
  from public.company_settings
  where id = 1;

  with
  employee_summary as (
    select count(*)::integer as total
    from public.employees
    where employment_status <> 'inactive'
  ),
  payroll_summary as (
    select
      count(*) filter (where status in ('finalized', 'paid'))::integer as payslips,
      coalesce(sum(net_salary) filter (where status in ('finalized', 'paid')), 0) as salary_expense,
      coalesce(sum(bonus) filter (where status in ('finalized', 'paid')), 0) as bonus,
      coalesce(sum(total_deduction) filter (where status in ('finalized', 'paid')), 0) as deductions
    from public.payrolls
    where period = normalized_period
  ),
  today_summary as (
    select
      count(*)::integer as payroll_count,
      coalesce(sum(net_salary), 0) as payroll_amount
    from public.payrolls
    where (updated_at at time zone coalesce(configured_timezone, 'Asia/Jakarta'))::date =
          (now() at time zone coalesce(configured_timezone, 'Asia/Jakarta'))::date
  ),
  monthly_series as (
    select generate_series(
      normalized_period - interval '5 months',
      normalized_period,
      interval '1 month'
    )::date as period
  ),
  monthly_data as (
    select jsonb_agg(
      jsonb_build_object(
        'period', ms.period,
        'expense', coalesce(sum(p.net_salary) filter (where p.status in ('finalized', 'paid')), 0),
        'bonus', coalesce(sum(p.bonus) filter (where p.status in ('finalized', 'paid')), 0),
        'deductions', coalesce(sum(p.total_deduction) filter (where p.status in ('finalized', 'paid')), 0)
      )
      order by ms.period
    ) as value
    from monthly_series ms
    left join public.payrolls p on p.period = ms.period
  ),
  division_data as (
    select coalesce(jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc), '[]'::jsonb) as value
    from (
      select d.name, count(e.id)::integer as value
      from public.divisions d
      left join public.employees e on e.division_id = d.id and e.employment_status <> 'inactive'
      group by d.id, d.name
      having count(e.id) > 0
    ) source
  ),
  department_data as (
    select coalesce(jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc), '[]'::jsonb) as value
    from (
      select d.name, count(e.id)::integer as value
      from public.departments d
      left join public.employees e on e.department_id = d.id and e.employment_status <> 'inactive'
      group by d.id, d.name
      having count(e.id) > 0
      order by count(e.id) desc
      limit 8
    ) source
  ),
  attendance_data as (
    select jsonb_build_array(
      jsonb_build_object('label', 'Hadir', 'value', coalesce(sum(present_days), 0)),
      jsonb_build_object('label', 'Sakit', 'value', coalesce(sum(sick_days), 0)),
      jsonb_build_object('label', 'Izin', 'value', coalesce(sum(leave_days), 0)),
      jsonb_build_object('label', 'Alpa', 'value', coalesce(sum(absent_days), 0))
    ) as value
    from public.attendance_summaries
    where period = normalized_period
  )
  select jsonb_build_object(
    'total_employees', es.total,
    'total_payslips', ps.payslips,
    'total_salary_expense', ps.salary_expense,
    'total_bonus', ps.bonus,
    'total_deductions', ps.deductions,
    'today_payroll_count', ts.payroll_count,
    'today_payroll_amount', ts.payroll_amount,
    'monthly', md.value,
    'divisions', dd.value,
    'departments', dp.value,
    'attendance', ad.value
  )
  into result
  from employee_summary es
  cross join payroll_summary ps
  cross join today_summary ts
  cross join monthly_data md
  cross join division_data dd
  cross join department_data dp
  cross join attendance_data ad;

  return result;
end
$$;

-- --------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- --------------------------------------------------------------------------
alter table public.company_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.divisions enable row level security;
alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.employees enable row level security;
alter table public.payrolls enable row level security;
alter table public.attendance_summaries enable row level security;
alter table public.import_batches enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.current_user_role() = 'super_admin'
);

drop policy if exists profiles_update_self_policy on public.profiles;
create policy profiles_update_self_policy
on public.profiles for update to authenticated
using (id = auth.uid() and public.is_active_user())
with check (id = auth.uid());

drop policy if exists profiles_update_admin_policy on public.profiles;
create policy profiles_update_admin_policy
on public.profiles for update to authenticated
using (public.current_user_role() = 'super_admin')
with check (public.current_user_role() = 'super_admin');

drop policy if exists company_settings_select_admin_policy on public.company_settings;
create policy company_settings_select_admin_policy
on public.company_settings for select to authenticated
using (public.current_user_role() = 'super_admin');

drop policy if exists company_settings_update_policy on public.company_settings;
create policy company_settings_update_policy
on public.company_settings for update to authenticated
using (public.current_user_role() = 'super_admin')
with check (public.current_user_role() = 'super_admin' and id = 1);

drop policy if exists divisions_select_policy on public.divisions;
create policy divisions_select_policy
on public.divisions for select to authenticated
using (public.is_active_user());

drop policy if exists divisions_write_policy on public.divisions;
create policy divisions_write_policy
on public.divisions for all to authenticated
using (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]));

drop policy if exists departments_select_policy on public.departments;
create policy departments_select_policy
on public.departments for select to authenticated
using (public.is_active_user());

drop policy if exists departments_write_policy on public.departments;
create policy departments_write_policy
on public.departments for all to authenticated
using (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]));

drop policy if exists positions_select_policy on public.positions;
create policy positions_select_policy
on public.positions for select to authenticated
using (public.is_active_user());

drop policy if exists positions_write_policy on public.positions;
create policy positions_write_policy
on public.positions for all to authenticated
using (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]));

drop policy if exists employees_select_policy on public.employees;
create policy employees_select_policy
on public.employees for select to authenticated
using (public.is_active_user());

drop policy if exists employees_write_policy on public.employees;
create policy employees_write_policy
on public.employees for all to authenticated
using (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]));

drop policy if exists attendance_select_policy on public.attendance_summaries;
create policy attendance_select_policy
on public.attendance_summaries for select to authenticated
using (public.is_active_user());

drop policy if exists attendance_write_policy on public.attendance_summaries;
create policy attendance_write_policy
on public.attendance_summaries for all to authenticated
using (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]));

drop policy if exists payroll_select_policy on public.payrolls;
create policy payroll_select_policy
on public.payrolls for select to authenticated
using (public.is_active_user());

drop policy if exists payroll_write_policy on public.payrolls;
create policy payroll_write_policy
on public.payrolls for all to authenticated
using (public.has_any_role(array['super_admin', 'admin_payroll']::public.app_role[]))
with check (public.has_any_role(array['super_admin', 'admin_payroll']::public.app_role[]));

drop policy if exists import_batches_select_policy on public.import_batches;
create policy import_batches_select_policy
on public.import_batches for select to authenticated
using (public.has_any_role(array['super_admin', 'hrd']::public.app_role[]));

drop policy if exists import_batches_insert_policy on public.import_batches;
create policy import_batches_insert_policy
on public.import_batches for insert to authenticated
with check (
  public.has_any_role(array['super_admin', 'hrd']::public.app_role[])
  and created_by = auth.uid()
);

drop policy if exists activity_logs_select_policy on public.activity_logs;
create policy activity_logs_select_policy
on public.activity_logs for select to authenticated
using (public.current_user_role() = 'super_admin');

-- --------------------------------------------------------------------------
-- STORAGE BUCKET AND POLICIES
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payroll-assets',
  'payroll-assets',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payroll_assets_select on storage.objects;
create policy payroll_assets_select
on storage.objects for select to authenticated
using (
  bucket_id = 'payroll-assets'
  and public.is_active_user()
);

drop policy if exists payroll_assets_insert on storage.objects;
create policy payroll_assets_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payroll-assets'
  and (
    (
      (storage.foldername(name))[1] = 'employees'
      and public.has_any_role(array['super_admin', 'hrd']::public.app_role[])
    )
    or (
      (storage.foldername(name))[1] = 'company'
      and public.current_user_role() = 'super_admin'
    )
    or (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
      and public.is_active_user()
    )
  )
);

drop policy if exists payroll_assets_update on storage.objects;
create policy payroll_assets_update
on storage.objects for update to authenticated
using (
  bucket_id = 'payroll-assets'
  and (
    (
      (storage.foldername(name))[1] = 'employees'
      and public.has_any_role(array['super_admin', 'hrd']::public.app_role[])
    )
    or (
      (storage.foldername(name))[1] = 'company'
      and public.current_user_role() = 'super_admin'
    )
    or (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
)
with check (
  bucket_id = 'payroll-assets'
  and (
    (
      (storage.foldername(name))[1] = 'employees'
      and public.has_any_role(array['super_admin', 'hrd']::public.app_role[])
    )
    or (
      (storage.foldername(name))[1] = 'company'
      and public.current_user_role() = 'super_admin'
    )
    or (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

drop policy if exists payroll_assets_delete on storage.objects;
create policy payroll_assets_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'payroll-assets'
  and (
    (
      (storage.foldername(name))[1] = 'employees'
      and public.has_any_role(array['super_admin', 'hrd']::public.app_role[])
    )
    or (
      (storage.foldername(name))[1] = 'company'
      and public.current_user_role() = 'super_admin'
    )
    or (
      (storage.foldername(name))[1] = 'avatars'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- --------------------------------------------------------------------------
-- GRANTS
-- --------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on
  public.v_employee_directory,
  public.v_payroll_details,
  public.v_attendance_details,
  public.v_activity_logs,
  public.v_monthly_payroll,
  public.v_division_payroll,
  public.v_department_payroll
to authenticated;

revoke all on function public.refresh_payroll_snapshots(uuid) from public, anon, authenticated;

revoke all on function public.get_registration_state() from public;
grant execute on function public.get_registration_state() to anon, authenticated;

revoke all on function public.verify_payslip(text, text) from public;
grant execute on function public.verify_payslip(text, text) to anon, authenticated;

revoke all on function public.get_company_settings() from public;
grant execute on function public.get_company_settings() to authenticated;

revoke all on function public.update_user_access(uuid, public.app_role, boolean) from public;
grant execute on function public.update_user_access(uuid, public.app_role, boolean) to authenticated;

revoke all on function public.regenerate_registration_invite_code() from public;
grant execute on function public.regenerate_registration_invite_code() to authenticated;

revoke all on function public.generate_payroll_batch(date) from public;
grant execute on function public.generate_payroll_batch(date) to authenticated;

revoke all on function public.get_dashboard_summary(date) from public;
grant execute on function public.get_dashboard_summary(date) to authenticated;

revoke all on function public.log_activity(text, text, text, text, jsonb, text) from public;
grant execute on function public.log_activity(text, text, text, text, jsonb, text) to authenticated;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.has_any_role(public.app_role[]) to authenticated;

-- Prevent anonymous table access; verification and registration state use RPC only.
revoke all on all tables in schema public from anon;
grant usage on schema public to anon;
grant execute on function public.get_registration_state() to anon;
grant execute on function public.verify_payslip(text, text) to anon;

-- --------------------------------------------------------------------------
-- SEED DATA
-- --------------------------------------------------------------------------
insert into public.company_settings (
  id, company_name, address, email, phone, tax_id, currency, timezone,
  watermark_text, registration_invite_code
)
values (
  1,
  'PT Nusantara Karya Digital',
  'Jl. Jenderal Sudirman No. 88, Jakarta Selatan',
  'hr@nusantarakarya.co.id',
  '+62 21 555 0199',
  '01.234.567.8-091.000',
  'IDR',
  'Asia/Jakarta',
  'CONFIDENTIAL',
  'PAYROLL2026'
)
on conflict (id) do nothing;

insert into public.divisions (id, name, description) values
  ('11111111-1111-4111-8111-111111111111', 'Corporate Services', 'Fungsi pendukung dan tata kelola perusahaan.'),
  ('11111111-1111-4111-8111-111111111112', 'Technology', 'Pengembangan produk, platform, dan infrastruktur teknologi.'),
  ('11111111-1111-4111-8111-111111111113', 'Commercial', 'Penjualan, pemasaran, dan pengembangan bisnis.')
on conflict do nothing;

insert into public.departments (id, division_id, name, description) values
  ('21111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Human Resources', 'Pengelolaan talenta dan budaya.'),
  ('21111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', 'Finance & Accounting', 'Keuangan, akuntansi, dan pajak.'),
  ('21111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111112', 'Engineering', 'Pengembangan perangkat lunak.'),
  ('21111111-1111-4111-8111-111111111114', '11111111-1111-4111-8111-111111111112', 'IT Operations', 'Infrastruktur dan operasional TI.'),
  ('21111111-1111-4111-8111-111111111115', '11111111-1111-4111-8111-111111111113', 'Sales', 'Akuisisi dan pengelolaan pelanggan.'),
  ('21111111-1111-4111-8111-111111111116', '11111111-1111-4111-8111-111111111113', 'Marketing', 'Brand, kampanye, dan komunikasi.')
on conflict do nothing;

insert into public.positions (id, department_id, name, description) values
  ('31111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111111', 'HR Manager', 'Memimpin fungsi HR.'),
  ('31111111-1111-4111-8111-111111111112', '21111111-1111-4111-8111-111111111111', 'HR Generalist', 'Operasional dan layanan HR.'),
  ('31111111-1111-4111-8111-111111111113', '21111111-1111-4111-8111-111111111112', 'Finance Manager', 'Memimpin fungsi keuangan.'),
  ('31111111-1111-4111-8111-111111111114', '21111111-1111-4111-8111-111111111112', 'Accounting Staff', 'Pembukuan dan rekonsiliasi.'),
  ('31111111-1111-4111-8111-111111111115', '21111111-1111-4111-8111-111111111113', 'Software Engineer', 'Mengembangkan aplikasi dan platform.'),
  ('31111111-1111-4111-8111-111111111116', '21111111-1111-4111-8111-111111111113', 'Engineering Lead', 'Memimpin tim engineering.'),
  ('31111111-1111-4111-8111-111111111117', '21111111-1111-4111-8111-111111111114', 'IT Support', 'Dukungan pengguna dan perangkat.'),
  ('31111111-1111-4111-8111-111111111118', '21111111-1111-4111-8111-111111111115', 'Account Executive', 'Penjualan dan hubungan pelanggan.'),
  ('31111111-1111-4111-8111-111111111119', '21111111-1111-4111-8111-111111111116', 'Marketing Specialist', 'Kampanye dan konten pemasaran.')
on conflict do nothing;

insert into public.employees (
  id, nik, name, division_id, department_id, position_id, employment_status,
  join_date, bank_account, bank_name, npwp, bpjs, basic_salary,
  fixed_allowance, variable_allowance, email, phone
) values
  (
    '41111111-1111-4111-8111-111111111111', 'EMP-001', 'Rizky Pratama',
    '11111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111112',
    '31111111-1111-4111-8111-111111111113', 'permanent', current_date - 1200,
    '001234567890', 'BCA', '12.345.678.9-012.000', '0001234567890',
    16000000, 2500000, 750000, 'rizky.pratama@nusantarakarya.co.id', '081211110001'
  ),
  (
    '41111111-1111-4111-8111-111111111112', 'EMP-002', 'Dewi Lestari',
    '11111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111111',
    '31111111-1111-4111-8111-111111111111', 'permanent', current_date - 980,
    '009876543210', 'Mandiri', '22.345.678.9-012.000', '0002234567890',
    15000000, 2200000, 500000, 'dewi.lestari@nusantarakarya.co.id', '081211110002'
  ),
  (
    '41111111-1111-4111-8111-111111111113', 'EMP-003', 'Bagus Santoso',
    '11111111-1111-4111-8111-111111111112', '21111111-1111-4111-8111-111111111113',
    '31111111-1111-4111-8111-111111111116', 'permanent', current_date - 900,
    '000111222333', 'BNI', '32.345.678.9-012.000', '0003234567890',
    19000000, 3000000, 1000000, 'bagus.santoso@nusantarakarya.co.id', '081211110003'
  ),
  (
    '41111111-1111-4111-8111-111111111114', 'EMP-004', 'Ayu Wulandari',
    '11111111-1111-4111-8111-111111111112', '21111111-1111-4111-8111-111111111113',
    '31111111-1111-4111-8111-111111111115', 'permanent', current_date - 640,
    '000444555666', 'BCA', '42.345.678.9-012.000', '0004234567890',
    12500000, 1800000, 600000, 'ayu.wulandari@nusantarakarya.co.id', '081211110004'
  ),
  (
    '41111111-1111-4111-8111-111111111115', 'EMP-005', 'Fajar Ramadhan',
    '11111111-1111-4111-8111-111111111112', '21111111-1111-4111-8111-111111111114',
    '31111111-1111-4111-8111-111111111117', 'contract', current_date - 380,
    '000777888999', 'BRI', '52.345.678.9-012.000', '0005234567890',
    8500000, 1000000, 350000, 'fajar.ramadhan@nusantarakarya.co.id', '081211110005'
  ),
  (
    '41111111-1111-4111-8111-111111111116', 'EMP-006', 'Nadia Putri',
    '11111111-1111-4111-8111-111111111113', '21111111-1111-4111-8111-111111111115',
    '31111111-1111-4111-8111-111111111118', 'permanent', current_date - 720,
    '000222333444', 'CIMB Niaga', '62.345.678.9-012.000', '0006234567890',
    11000000, 1800000, 900000, 'nadia.putri@nusantarakarya.co.id', '081211110006'
  ),
  (
    '41111111-1111-4111-8111-111111111117', 'EMP-007', 'Andi Saputra',
    '11111111-1111-4111-8111-111111111113', '21111111-1111-4111-8111-111111111116',
    '31111111-1111-4111-8111-111111111119', 'probation', current_date - 70,
    '000555666777', 'BCA', '', '0007234567890',
    7500000, 900000, 250000, 'andi.saputra@nusantarakarya.co.id', '081211110007'
  ),
  (
    '41111111-1111-4111-8111-111111111118', 'EMP-008', 'Siti Rahma',
    '11111111-1111-4111-8111-111111111111', '21111111-1111-4111-8111-111111111111',
    '31111111-1111-4111-8111-111111111112', 'permanent', current_date - 540,
    '000888999000', 'Mandiri', '72.345.678.9-012.000', '0008234567890',
    9000000, 1200000, 300000, 'siti.rahma@nusantarakarya.co.id', '081211110008'
  )
on conflict (nik) do nothing;

insert into public.payrolls (
  employee_id, period, slip_number, basic_salary, fixed_allowance,
  variable_allowance, bonus, incentive, overtime, thr, deduction,
  loan, bpjs, tax, status, notes
)
select
  e.id,
  gs.period::date,
  '',
  e.basic_salary,
  e.fixed_allowance,
  e.variable_allowance,
  case when extract(month from gs.period)::integer % 3 = 0 then 500000 else 0 end,
  case when e.division_id = '11111111-1111-4111-8111-111111111113'::uuid then 750000 else 250000 end,
  case when e.position_id in (
    '31111111-1111-4111-8111-111111111115'::uuid,
    '31111111-1111-4111-8111-111111111117'::uuid
  ) then 400000 else 150000 end,
  0,
  100000,
  0,
  round((e.basic_salary * 0.01)::numeric, 2),
  round((e.basic_salary * 0.025)::numeric, 2),
  case
    when gs.period::date < date_trunc('month', current_date)::date then 'paid'::public.payroll_status
    else 'finalized'::public.payroll_status
  end,
  'Seed payroll demonstrasi'
from public.employees e
cross join lateral generate_series(
  date_trunc('month', current_date) - interval '5 months',
  date_trunc('month', current_date),
  interval '1 month'
) as gs(period)
where e.employment_status <> 'inactive'
on conflict (employee_id, period) do nothing;

insert into public.attendance_summaries (
  employee_id, period, working_days, present_days, sick_days,
  leave_days, absent_days, overtime_hours, notes
)
select
  e.id,
  date_trunc('month', current_date)::date,
  22,
  case when e.nik in ('EMP-004', 'EMP-007') then 20 else 21 end,
  case when e.nik = 'EMP-004' then 1 else 0 end,
  case when e.nik in ('EMP-002', 'EMP-007') then 1 else 0 end,
  case when e.nik = 'EMP-007' then 1 else 0 end,
  case
    when e.division_id = '11111111-1111-4111-8111-111111111112'::uuid then 8
    when e.division_id = '11111111-1111-4111-8111-111111111113'::uuid then 5
    else 2
  end,
  'Seed rekap kehadiran'
from public.employees e
where e.employment_status <> 'inactive'
on conflict (employee_id, period) do nothing;

insert into public.activity_logs (
  user_id, action, entity_type, entity_id, description, metadata, device
)
values (
  null,
  'SETUP',
  'system',
  'one-run',
  'Supabase one-run setup selesai dan seed data berhasil dibuat.',
  jsonb_build_object('version', '1.0.0'),
  'Supabase SQL Editor'
);

commit;
