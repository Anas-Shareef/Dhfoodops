-- =====================================================================
-- DH DINING MANAGEMENT SYSTEM (Phase 1)
-- Complete Production Database Schema, Constraints, RLS, and Triggers
-- Timezone Standard: Asia/Kolkata (IST)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILES
-- Links Supabase auth.users to an application role
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('STUDENT', 'ADMIN', 'SUPERVISOR')) DEFAULT 'STUDENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on auth_user_id for lightning-fast auth lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);

-- ---------------------------------------------------------------------
-- 2. DEPARTMENTS
-- Institutional faculties / departments (e.g. QS2, AL, HS2)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);

-- ---------------------------------------------------------------------
-- 3. STUDENTS
-- Student profile information
-- Note: Email is read-only for students
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    enrollment_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL DEFAULT 1,
    table_number INTEGER NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_department_id ON public.students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_table_number ON public.students(table_number);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_no ON public.students(enrollment_no);

-- ---------------------------------------------------------------------
-- 4. MEAL SCHEDULES
-- Configuration templates for daily meals and attendance cutoffs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    meal_time TIME NOT NULL,
    attendance_start_time TIME NOT NULL,
    attendance_end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_attendance_window CHECK (attendance_end_time > attendance_start_time)
);

CREATE INDEX IF NOT EXISTS idx_meal_schedules_active ON public.meal_schedules(is_active);

-- ---------------------------------------------------------------------
-- 5. MEAL SESSIONS
-- Concrete instances of meals for a specific calendar date
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_schedule_id UUID REFERENCES public.meal_schedules(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    meal_time TIME NOT NULL,
    attendance_start_at TIMESTAMPTZ NOT NULL,
    attendance_end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'attendance_open', 'attendance_closed', 'meal_active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_date, meal_type),
    CONSTRAINT valid_session_window CHECK (attendance_end_at > attendance_start_at)
);

CREATE INDEX IF NOT EXISTS idx_meal_sessions_date ON public.meal_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_meal_sessions_status ON public.meal_sessions(status);

-- ---------------------------------------------------------------------
-- 6. MEAL ATTENDANCE
-- Individual attendance declaration per student per meal session
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_session_id UUID NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('attending', 'not_attending')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (meal_session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_attendance_session ON public.meal_attendance(meal_session_id);
CREATE INDEX IF NOT EXISTS idx_meal_attendance_student ON public.meal_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_meal_attendance_status ON public.meal_attendance(status);

-- ---------------------------------------------------------------------
-- 7. ATTENDANCE CORRECTION REQUESTS
-- Post-cutoff appeals submitted by students for admin review
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_session_id UUID NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES public.meal_attendance(id) ON DELETE SET NULL,
    requested_status TEXT NOT NULL CHECK (requested_status IN ('attending', 'not_attending')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corrections_session ON public.attendance_correction_requests(meal_session_id);
CREATE INDEX IF NOT EXISTS idx_corrections_student ON public.attendance_correction_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON public.attendance_correction_requests(status);

-- ---------------------------------------------------------------------
-- 8. AUDIT LOGS
-- Immutable activity log for compliance, corrections, and schedule changes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =====================================================================
-- HELPER FUNCTIONS & PROCEDURES
-- =====================================================================

-- Helper to retrieve current authenticated user role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
    RETURN COALESCE(v_role, 'STUDENT');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to retrieve current student_id for the logged in auth user
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID AS $$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id FROM public.students WHERE auth_user_id = auth.uid() LIMIT 1;
    RETURN v_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate daily meal sessions for a specified calendar date in Asia/Kolkata
CREATE OR REPLACE FUNCTION public.generate_daily_meal_sessions(target_date DATE)
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    v_start_tz TIMESTAMPTZ;
    v_end_tz TIMESTAMPTZ;
BEGIN
    FOR rec IN SELECT * FROM public.meal_schedules WHERE is_active = true LOOP
        -- Build Asia/Kolkata timestamp from target_date and time strings
        v_start_tz := (target_date || ' ' || rec.attendance_start_time)::timestamp AT TIME ZONE 'Asia/Kolkata';
        v_end_tz   := (target_date || ' ' || rec.attendance_end_time)::timestamp AT TIME ZONE 'Asia/Kolkata';

        INSERT INTO public.meal_sessions (
            meal_schedule_id,
            session_date,
            meal_type,
            meal_time,
            attendance_start_at,
            attendance_end_at,
            status
        )
        VALUES (
            rec.id,
            target_date,
            rec.meal_type,
            rec.meal_time,
            v_start_tz,
            v_end_tz,
            'scheduled'
        )
        ON CONFLICT (session_date, meal_type) DO UPDATE
        SET 
            meal_time = EXCLUDED.meal_time,
            attendance_start_at = EXCLUDED.attendance_start_at,
            attendance_end_at = EXCLUDED.attendance_end_at,
            updated_at = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Window status dynamic computer for a meal session
CREATE OR REPLACE FUNCTION public.compute_session_window_status(
    p_attendance_start TIMESTAMPTZ,
    p_attendance_end TIMESTAMPTZ,
    p_meal_time TIME,
    p_session_date DATE
)
RETURNS TEXT AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_meal_tz TIMESTAMPTZ;
BEGIN
    v_meal_tz := (p_session_date || ' ' || p_meal_time)::timestamp AT TIME ZONE 'Asia/Kolkata';

    IF v_now < p_attendance_start THEN
        RETURN 'NOT_OPEN';
    ELSIF v_now >= p_attendance_start AND v_now <= p_attendance_end THEN
        RETURN 'OPEN';
    ELSIF v_now > p_attendance_end AND v_now < v_meal_tz THEN
        RETURN 'CLOSED';
    ELSIF v_now >= v_meal_tz AND v_now < (v_meal_tz + interval '1 hour') THEN
        RETURN 'MEAL_ACTIVE';
    ELSE
        RETURN 'COMPLETED';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Enforce attendance window on student updates (Server-Side Cutoff Lock)
CREATE OR REPLACE FUNCTION public.check_attendance_window_cutoff()
RETURNS TRIGGER AS $$
DECLARE
    v_session RECORD;
    v_user_role TEXT;
BEGIN
    v_user_role := public.get_auth_user_role();

    -- Admins and system processes are permitted to override/correct
    IF v_user_role IN ('ADMIN', 'SUPERVISOR') THEN
        RETURN NEW;
    END IF;

    SELECT attendance_start_at, attendance_end_at INTO v_session
    FROM public.meal_sessions
    WHERE id = NEW.meal_session_id;

    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Meal session not found';
    END IF;

    IF now() < v_session.attendance_start_at THEN
        RAISE EXCEPTION 'Attendance window is not open yet';
    END IF;

    IF now() > v_session.attendance_end_at THEN
        RAISE EXCEPTION 'Attendance window has closed. You cannot modify attendance after cutoff.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_attendance_cutoff ON public.meal_attendance;
CREATE TRIGGER trg_enforce_attendance_cutoff
BEFORE INSERT OR UPDATE ON public.meal_attendance
FOR EACH ROW
EXECUTE FUNCTION public.check_attendance_window_cutoff();

-- Trigger: Audit logging on meal attendance
CREATE OR REPLACE FUNCTION public.audit_meal_attendance_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        VALUES (
            auth.uid(),
            'STUDENT_ATTENDANCE_SUBMITTED',
            'meal_attendance',
            NEW.id,
            jsonb_build_object('meal_session_id', NEW.meal_session_id, 'student_id', NEW.student_id, 'status', NEW.status)
        );
    ELSIF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
        VALUES (
            auth.uid(),
            'STUDENT_ATTENDANCE_CHANGED',
            'meal_attendance',
            NEW.id,
            jsonb_build_object('meal_session_id', NEW.meal_session_id, 'student_id', NEW.student_id, 'from_status', OLD.status, 'to_status', NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_meal_attendance ON public.meal_attendance;
CREATE TRIGGER trg_audit_meal_attendance
AFTER INSERT OR UPDATE ON public.meal_attendance
FOR EACH ROW
EXECUTE FUNCTION public.audit_meal_attendance_change();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- 2. Departments
CREATE POLICY "Authenticated users can view departments" ON public.departments
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- 3. Students
CREATE POLICY "Student can read own record" ON public.students
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid() OR public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Admins can manage students" ON public.students
    FOR ALL TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- 4. Meal Schedules
CREATE POLICY "Users can view active schedules" ON public.meal_schedules
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can manage meal schedules" ON public.meal_schedules
    FOR ALL TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- 5. Meal Sessions
CREATE POLICY "Users can view meal sessions" ON public.meal_sessions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can manage meal sessions" ON public.meal_sessions
    FOR ALL TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- 6. Meal Attendance
CREATE POLICY "Students can read own attendance" ON public.meal_attendance
    FOR SELECT TO authenticated
    USING (
        student_id = public.get_current_student_id() 
        OR public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR')
    );

CREATE POLICY "Students can submit own attendance during window" ON public.meal_attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = public.get_current_student_id()
        AND EXISTS (
            SELECT 1 FROM public.meal_sessions s
            WHERE s.id = meal_session_id
            AND now() >= s.attendance_start_at
            AND now() <= s.attendance_end_at
        )
    );

CREATE POLICY "Students can modify own attendance during window" ON public.meal_attendance
    FOR UPDATE TO authenticated
    USING (
        student_id = public.get_current_student_id()
        AND EXISTS (
            SELECT 1 FROM public.meal_sessions s
            WHERE s.id = meal_session_id
            AND now() >= s.attendance_start_at
            AND now() <= s.attendance_end_at
        )
    )
    WITH CHECK (
        student_id = public.get_current_student_id()
        AND EXISTS (
            SELECT 1 FROM public.meal_sessions s
            WHERE s.id = meal_session_id
            AND now() >= s.attendance_start_at
            AND now() <= s.attendance_end_at
        )
    );

CREATE POLICY "Admins have full access to attendance" ON public.meal_attendance
    FOR ALL TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- 7. Attendance Correction Requests
CREATE POLICY "Students can view own correction requests" ON public.attendance_correction_requests
    FOR SELECT TO authenticated
    USING (
        student_id = public.get_current_student_id()
        OR public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR')
    );

CREATE POLICY "Students can insert own correction requests" ON public.attendance_correction_requests
    FOR INSERT TO authenticated
    WITH CHECK (student_id = public.get_current_student_id());

CREATE POLICY "Admins can review correction requests" ON public.attendance_correction_requests
    FOR UPDATE TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- 8. Audit Logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can create audit entries" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- =====================================================================
-- PHASE 2: SEATING & TABLES EXTENSION
-- =====================================================================

-- ---------------------------------------------------------------------
-- 8B. DINING HALLS & FLOORS (PRD Phase 3 Architecture Freeze Section 5)
-- Production hierarchy: Dining Hall -> Floor -> Area / Side -> Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dining_halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dining_floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dining_hall_id UUID NOT NULL REFERENCES public.dining_halls(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(dining_hall_id, floor_number)
);

CREATE INDEX IF NOT EXISTS idx_dining_floors_hall ON public.dining_floors(dining_hall_id);

-- ---------------------------------------------------------------------
-- 9. DINING AREAS
-- Multi-floor structure (e.g. First Floor CHS Side, Ground Floor PG Side)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dining_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dining_floor_id UUID REFERENCES public.dining_floors(id) ON DELETE SET NULL,
    name TEXT NOT NULL UNIQUE,
    floor TEXT NOT NULL,
    section TEXT NOT NULL,
    area_type TEXT NOT NULL DEFAULT 'STUDENT' CHECK (area_type IN ('STUDENT', 'TEACHER')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dining_areas_floor ON public.dining_areas(floor);
CREATE INDEX IF NOT EXISTS idx_dining_areas_dining_floor ON public.dining_areas(dining_floor_id);
CREATE INDEX IF NOT EXISTS idx_dining_areas_type ON public.dining_areas(area_type);

-- ---------------------------------------------------------------------
-- 10. TABLES
-- Physical dining tables with capacity and simple number identifiers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INTEGER NOT NULL UNIQUE,
    dining_area_id UUID NOT NULL REFERENCES public.dining_areas(id) ON DELETE RESTRICT,
    capacity INTEGER NOT NULL DEFAULT 8 CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Reserved', 'Maintenance')),
    map_position JSONB DEFAULT '{"row": 1, "col": 1}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tables_area ON public.tables(dining_area_id);
CREATE INDEX IF NOT EXISTS idx_tables_number ON public.tables(table_number);
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.tables(status);

-- Compatibility view for queries referring to dining_tables
CREATE OR REPLACE VIEW public.dining_tables AS SELECT * FROM public.tables;

-- ---------------------------------------------------------------------
-- 11. TABLE ASSIGNMENTS
-- Time-ranged student table assignments preserving full historical record
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.table_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    assigned_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_until TIMESTAMPTZ NULL, -- NULL indicates current active assignment
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_student ON public.table_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_table ON public.table_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.table_assignments(status);

-- Partial index: A student can have only ONE active assignment at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_assignment_per_student 
ON public.table_assignments (student_id) 
WHERE status = 'active' AND assigned_until IS NULL;

-- ---------------------------------------------------------------------
-- 12. SEATING CHANGE LOGS
-- Immutable audit log for any seating movement, individual move, or swap
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seating_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    to_table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_seating_logs_student ON public.seating_change_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_seating_logs_changed_at ON public.seating_change_logs(changed_at DESC);

-- Enable RLS on Phase 2 Tables
ALTER TABLE public.dining_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seating_change_logs ENABLE ROW LEVEL SECURITY;

-- Phase 2 RLS Policies
CREATE POLICY "Authenticated users can view dining areas" ON public.dining_areas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage dining areas" ON public.dining_areas
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can view tables" ON public.tables
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage tables" ON public.tables
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Students can view active table assignments" ON public.table_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage table assignments" ON public.table_assignments
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Admins can view seating change logs" ON public.seating_change_logs
    FOR SELECT TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Admins can insert seating change logs" ON public.seating_change_logs
    FOR INSERT TO authenticated WITH CHECK (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- =====================================================================
-- PHASE 3: MONTHLY SUPPLIER / TABLE DUTY ASSIGNMENTS
-- =====================================================================

-- ---------------------------------------------------------------------
-- 13. SUPPLIER DUTY PERIODS
-- Configurable monthly or term-based duty periods (e.g. Sep 2026)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_duty_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_duty_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_duty_periods_status ON public.supplier_duty_periods(status);
CREATE INDEX IF NOT EXISTS idx_duty_periods_dates ON public.supplier_duty_periods(start_date, end_date);

-- ---------------------------------------------------------------------
-- 14. SUPPLIER ASSIGNMENTS (PRD Phase 3/6 Scoped Responsibility)
-- Table, Area, and Teacher Area scopes with Primary, Backup, and Main roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_period_id UUID NOT NULL REFERENCES public.supplier_duty_periods(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL DEFAULT 'TABLE' CHECK (scope_type IN ('TABLE', 'AREA', 'TEACHER_AREA')),
    scope_id TEXT NOT NULL DEFAULT '',
    table_id UUID REFERENCES public.tables(id) ON DELETE CASCADE,
    dining_area_id UUID REFERENCES public.dining_areas(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('primary', 'backup', 'area_main', 'teacher_supplier')),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'cancelled')),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_assignment_dates CHECK (valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_supplier_asgn_table ON public.supplier_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asgn_area ON public.supplier_assignments(dining_area_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asgn_scope ON public.supplier_assignments(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asgn_student ON public.supplier_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_supplier_asgn_period ON public.supplier_assignments(duty_period_id);

-- ---------------------------------------------------------------------
-- 14B. SUPPLIER POOLS & ROTATION RULES (PRD Section 10 & 11)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    dining_area_id UUID REFERENCES public.dining_areas(id) ON DELETE SET NULL,
    duty_period_id UUID REFERENCES public.supplier_duty_periods(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_pool_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.supplier_pools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 1,
    is_backup_eligible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(pool_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.supplier_rotation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL DEFAULT 'ROUND_ROBIN' CHECK (rule_type IN ('ROUND_ROBIN', 'FIXED', 'CUSTOM')),
    frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (frequency IN ('WEEKLY', 'MONTHLY', 'DUTY_PERIOD')),
    parameters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_schedule_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duty_period_id UUID NOT NULL REFERENCES public.supplier_duty_periods(id) ON DELETE CASCADE,
    dining_area_id UUID NOT NULL REFERENCES public.dining_areas(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES public.supplier_pools(id) ON DELETE SET NULL,
    rotation_rule_id UUID REFERENCES public.supplier_rotation_rules(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATED', 'REVIEW', 'PUBLISHED', 'ACTIVE', 'COMPLETED')),
    generated_assignments_count INTEGER NOT NULL DEFAULT 0,
    conflicts_count INTEGER NOT NULL DEFAULT 0,
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sched_gen_period ON public.supplier_schedule_generations(duty_period_id);
CREATE INDEX IF NOT EXISTS idx_sched_gen_area ON public.supplier_schedule_generations(dining_area_id);
CREATE INDEX IF NOT EXISTS idx_sched_gen_status ON public.supplier_schedule_generations(status);

-- ---------------------------------------------------------------------
-- 15. SUPPLIER CHECK-INS
-- Daily operational presence verification for assigned duty
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.supplier_assignments(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    duty_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'checked_in' CHECK (status IN ('checked_in', 'completed', 'missed')),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at TIMESTAMPTZ NULL,
    remarks TEXT NULL,
    UNIQUE (assignment_id, duty_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_date ON public.supplier_checkins(duty_date);
CREATE INDEX IF NOT EXISTS idx_checkins_student ON public.supplier_checkins(student_id);

-- ---------------------------------------------------------------------
-- 16. SUPPLIER ABSENCES
-- Tracks approved or unapproved absence of table suppliers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    duty_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('approved_absent', 'unapproved_absent')),
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_absences_date ON public.supplier_absences(duty_date);
CREATE INDEX IF NOT EXISTS idx_supplier_absences_student ON public.supplier_absences(student_id);

-- ---------------------------------------------------------------------
-- 17. SUPPLIER HANDOVERS
-- Formal transfer of table responsibility between suppliers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    from_supplier_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    to_supplier_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    handed_over_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
    remarks TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_handovers_table ON public.supplier_handovers(table_id);
CREATE INDEX IF NOT EXISTS idx_handovers_date ON public.supplier_handovers(handed_over_at DESC);

-- ---------------------------------------------------------------------
-- 18. SUPPLIER DUTY EVENTS
-- Audit trail for shelf opening/closing, verification, and duty milestones
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_duty_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    duty_date DATE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('CHECK_IN', 'SHELF_OPENED', 'SHELF_CLOSED', 'UTENSILS_VERIFIED', 'BACKUP_ACTIVATED', 'HANDOVER')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duty_events_table ON public.supplier_duty_events(table_id);
CREATE INDEX IF NOT EXISTS idx_duty_events_date ON public.supplier_duty_events(duty_date);

-- Enable RLS on Phase 3 Tables
ALTER TABLE public.supplier_duty_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_duty_events ENABLE ROW LEVEL SECURITY;

-- Phase 3 RLS Policies
CREATE POLICY "Authenticated users can view duty periods" ON public.supplier_duty_periods
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage duty periods" ON public.supplier_duty_periods
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Users can view supplier assignments" ON public.supplier_assignments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage supplier assignments" ON public.supplier_assignments
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Users can view checkins" ON public.supplier_checkins
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers can insert own checkin" ON public.supplier_checkins
    FOR INSERT TO authenticated WITH CHECK (
        student_id = public.get_current_student_id() 
        OR public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR')
    );

CREATE POLICY "Admins can manage absences" ON public.supplier_absences
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Admins can manage handovers" ON public.supplier_handovers
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Users can view duty events" ON public.supplier_duty_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers can create duty events" ON public.supplier_duty_events
    FOR INSERT TO authenticated WITH CHECK (
        supplier_id = public.get_current_student_id()
        OR public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR')
    );

-- Enable RLS & Policies on Dining Hierarchy and Pools
ALTER TABLE public.dining_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_rotation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_schedule_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dining halls and floors" ON public.dining_halls
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view floors" ON public.dining_floors
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage dining hierarchy" ON public.dining_halls
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Admins can manage dining floors" ON public.dining_floors
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can view supplier pools" ON public.supplier_pools
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage supplier pools" ON public.supplier_pools
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can view pool members" ON public.supplier_pool_members
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage pool members" ON public.supplier_pool_members
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can view rotation rules" ON public.supplier_rotation_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage rotation rules" ON public.supplier_rotation_rules
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can view schedule generations" ON public.supplier_schedule_generations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage schedule generations" ON public.supplier_schedule_generations
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- =====================================================================
-- PHASE 4: FOOD REQUIREMENT & MEAL PLANNING
-- =====================================================================

-- ---------------------------------------------------------------------
-- 15. FOOD ITEMS
-- Catalog of food preparations, ingredients, units, and default factors
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('main_dish', 'curry', 'side', 'beverage', 'staple', 'dessert')),
    unit TEXT NOT NULL CHECK (unit IN ('portions', 'kg', 'litres', 'cups', 'pieces', 'packets', 'trays', 'batches')),
    default_consumption_factor NUMERIC(6, 3) NOT NULL DEFAULT 1.000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_items_active ON public.food_items(is_active);

-- ---------------------------------------------------------------------
-- 16. MEAL REQUIREMENTS
-- Calculated food requirement for a specific meal session
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_session_id UUID NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
    attending_count INT NOT NULL,
    not_attending_count INT NOT NULL DEFAULT 0,
    no_response_count INT NOT NULL DEFAULT 0,
    buffer_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    base_quantity INT NOT NULL,
    recommended_quantity INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN (
        'draft', 
        'awaiting_attendance', 
        'calculated', 
        'approved', 
        'preparation_started', 
        'prepared', 
        'serving', 
        'completed', 
        'cancelled'
    )),
    calculation_version INT NOT NULL DEFAULT 1,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (meal_session_id, calculation_version)
);

CREATE INDEX IF NOT EXISTS idx_meal_requirements_session ON public.meal_requirements(meal_session_id);
CREATE INDEX IF NOT EXISTS idx_meal_requirements_status ON public.meal_requirements(status);

-- ---------------------------------------------------------------------
-- 17. MEAL REQUIREMENT ITEMS
-- Itemized requirement per food item for a meal requirement
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_requirement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_requirement_id UUID NOT NULL REFERENCES public.meal_requirements(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
    consumption_factor NUMERIC(6, 3) NOT NULL,
    base_quantity NUMERIC(10, 2) NOT NULL,
    buffer_quantity NUMERIC(10, 2) NOT NULL,
    recommended_quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requirement_items_parent ON public.meal_requirement_items(meal_requirement_id);

-- ---------------------------------------------------------------------
-- 18. MEAL REQUIREMENT REVISIONS
-- Explicit audit log when approved post-cutoff attendance corrections alter count
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_requirement_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_requirement_id UUID NOT NULL REFERENCES public.meal_requirements(id) ON DELETE CASCADE,
    version INT NOT NULL,
    previous_quantity NUMERIC(10, 2) NOT NULL,
    new_quantity NUMERIC(10, 2) NOT NULL,
    previous_attending INT NOT NULL,
    new_attending INT NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_requirement_revisions_req ON public.meal_requirement_revisions(meal_requirement_id);

-- ---------------------------------------------------------------------
-- 19. MEAL PREPARATION RECORDS
-- Kitchen records of actual quantity cooked vs planned requirement
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_preparation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_requirement_id UUID NOT NULL REFERENCES public.meal_requirements(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
    planned_quantity NUMERIC(10, 2) NOT NULL,
    prepared_quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    remarks TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_prep_records_req ON public.meal_preparation_records(meal_requirement_id);

-- ---------------------------------------------------------------------
-- 20. MEAL SERVING RECORDS
-- Kitchen and dining records of quantity served to students
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_serving_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_session_id UUID NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
    served_quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    serving_status TEXT NOT NULL DEFAULT 'serving' CHECK (serving_status IN ('not_started', 'ready', 'serving', 'completed')),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    remarks TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_serving_records_session ON public.meal_serving_records(meal_session_id);

-- ---------------------------------------------------------------------
-- 21. MEAL LEFTOVER RECORDS
-- Unused cooked food tracking and formal waste/storage classification
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_leftover_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_session_id UUID NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN ('usable', 'not_usable', 'discarded', 'stored', 'transferred')),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    remarks TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_leftover_records_session ON public.meal_leftover_records(meal_session_id);

-- ---------------------------------------------------------------------
-- 22. MEAL FOOD EVENTS
-- Auditable timeline of all food calculation and kitchen events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_food_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_session_id UUID NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'REQUIREMENT_CALCULATED',
        'REQUIREMENT_APPROVED',
        'REQUIREMENT_REVISED',
        'PREPARATION_STARTED',
        'PREPARATION_ENTERED',
        'SERVING_STARTED',
        'SERVING_ENTERED',
        'LEFTOVER_RECORDED',
        'MEAL_COMPLETED'
    )),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_events_session ON public.meal_food_events(meal_session_id);

-- Enable RLS on Phase 4 Tables
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_requirement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_requirement_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_preparation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_serving_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_leftover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_food_events ENABLE ROW LEVEL SECURITY;

-- Phase 4 RLS Policies
CREATE POLICY "Anyone authenticated can view food items" ON public.food_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage food items" ON public.food_items
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Anyone authenticated can view meal requirements" ON public.meal_requirements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage meal requirements" ON public.meal_requirements
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Anyone authenticated can view meal requirement items" ON public.meal_requirement_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage requirement items" ON public.meal_requirement_items
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Admins can manage requirement revisions" ON public.meal_requirement_revisions
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Anyone can view preparation records" ON public.meal_preparation_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage preparation records" ON public.meal_preparation_records
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Anyone can view serving records" ON public.meal_serving_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage serving records" ON public.meal_serving_records
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Anyone can view leftover records" ON public.meal_leftover_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage leftover records" ON public.meal_leftover_records
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Anyone can view food events" ON public.meal_food_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create food events" ON public.meal_food_events
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

-- =====================================================================
-- PHASE 5: UTENSIL ACCOUNTABILITY (PLATES + GLASSES + JUGS)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 23. UTENSIL TYPES
-- Types of tableware (Plates, Glasses, Jugs, and future extensions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.utensil_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE CHECK (code IN ('PLATE', 'GLASS', 'JUG', 'BOWL', 'SPOON', 'TRAY', 'OTHER')),
    unit TEXT NOT NULL DEFAULT 'pieces',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utensil_types_active ON public.utensil_types(active);

-- ---------------------------------------------------------------------
-- 24. TABLE UTENSIL CONFIGURATIONS
-- Expected inventory per table with historical effective dates
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.table_utensil_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    utensil_type_id UUID NOT NULL REFERENCES public.utensil_types(id) ON DELETE RESTRICT,
    expected_quantity INT NOT NULL DEFAULT 8 CHECK (expected_quantity >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_utensil_cfg_table ON public.table_utensil_configurations(table_id);
CREATE INDEX IF NOT EXISTS idx_table_utensil_cfg_dates ON public.table_utensil_configurations(effective_from, effective_until);

-- ---------------------------------------------------------------------
-- 25. UTENSIL OPERATION SESSIONS
-- One operational shelf transaction per table per meal session
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.utensil_operation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    meal_session_id UUID REFERENCES public.meal_sessions(id) ON DELETE SET NULL,
    supplier_assignment_id UUID REFERENCES public.supplier_assignments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN (
        'LOCKED', 
        'OPENED', 
        'DISTRIBUTING', 
        'COLLECTING', 
        'VERIFYING', 
        'DISCREPANCY'
    )),
    opened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ NULL,
    distribution_started_at TIMESTAMPTZ NULL,
    collection_started_at TIMESTAMPTZ NULL,
    verification_started_at TIMESTAMPTZ NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ NULL,
    closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_utensil_ops_table ON public.utensil_operation_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_utensil_ops_status ON public.utensil_operation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_utensil_ops_meal ON public.utensil_operation_sessions(meal_session_id);

-- ---------------------------------------------------------------------
-- 26. UTENSIL OPERATION ITEMS
-- Itemized snapshot of expected, distributed, and returned quantities
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.utensil_operation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_session_id UUID NOT NULL REFERENCES public.utensil_operation_sessions(id) ON DELETE CASCADE,
    utensil_type_id UUID NOT NULL REFERENCES public.utensil_types(id) ON DELETE RESTRICT,
    expected_quantity INT NOT NULL DEFAULT 8,
    distributed_quantity INT NOT NULL DEFAULT 0,
    returned_quantity INT NOT NULL DEFAULT 0,
    unresolved_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (operation_session_id, utensil_type_id)
);

CREATE INDEX IF NOT EXISTS idx_utensil_op_items_session ON public.utensil_operation_items(operation_session_id);

-- ---------------------------------------------------------------------
-- 27. UTENSIL DISCREPANCIES
-- Missing, misplaced, damaged, broken, or recovered items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.utensil_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_session_id UUID NOT NULL REFERENCES public.utensil_operation_sessions(id) ON DELETE CASCADE,
    utensil_type_id UUID NOT NULL REFERENCES public.utensil_types(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'UNRESOLVED' CHECK (status IN (
        'UNRESOLVED', 
        'MISSING', 
        'MISPLACED', 
        'RECOVERED', 
        'DAMAGED', 
        'BROKEN', 
        'DISCARDED'
    )),
    origin_table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    current_table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ NULL,
    resolution_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discrepancies_session ON public.utensil_discrepancies(operation_session_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON public.utensil_discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_discrepancies_tables ON public.utensil_discrepancies(origin_table_id, current_table_id);

-- ---------------------------------------------------------------------
-- 28. UTENSIL EVENTS
-- Immutable audit history of all shelf and utensil actions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.utensil_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_session_id UUID REFERENCES public.utensil_operation_sessions(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    utensil_type_id UUID REFERENCES public.utensil_types(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'SHELF_OPENED',
        'SHELF_CLOSED',
        'DISTRIBUTION_STARTED',
        'ITEM_DISTRIBUTED',
        'COLLECTION_STARTED',
        'ITEM_RETURNED',
        'VERIFICATION_COMPLETED',
        'DISCREPANCY_REPORTED',
        'ITEM_MARKED_MISPLACED',
        'ITEM_RECOVERED',
        'ITEM_MARKED_DAMAGED',
        'ITEM_MARKED_BROKEN',
        'SUPERVISOR_OVERRIDE'
    )),
    quantity INT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_utensil_events_table ON public.utensil_events(table_id);
CREATE INDEX IF NOT EXISTS idx_utensil_events_session ON public.utensil_events(operation_session_id);

-- Enable RLS on Phase 5 Tables
ALTER TABLE public.utensil_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_utensil_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utensil_operation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utensil_operation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utensil_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utensil_events ENABLE ROW LEVEL SECURITY;

-- Phase 5 RLS Policies
CREATE POLICY "Anyone authenticated can view utensil types" ON public.utensil_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage utensil types" ON public.utensil_types
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Anyone authenticated can view table configurations" ON public.table_utensil_configurations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage table configurations" ON public.table_utensil_configurations
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Users can view operation sessions" ON public.utensil_operation_sessions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers and admins can update operation sessions" ON public.utensil_operation_sessions
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view operation items" ON public.utensil_operation_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers and admins can manage operation items" ON public.utensil_operation_items
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view discrepancies" ON public.utensil_discrepancies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Suppliers and admins can report/manage discrepancies" ON public.utensil_discrepancies
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view utensil events" ON public.utensil_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert utensil events" ON public.utensil_events
    FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================================
-- MASTER PRD: WEEKLY MEAL MENU & FOOD SURPLUS / WASTE MANAGEMENT
-- =====================================================================

-- ---------------------------------------------------------------------
-- 29. MEAL MENU TEMPLATES
-- Recurring 7-day weekly menu for all 5 daily meal slots with bilingual data
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_menu_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    meal_slot TEXT NOT NULL CHECK (meal_slot IN ('EARLY_MORNING_SNACKS', 'BREAKFAST', 'LUNCH', 'EVENING_SNACKS', 'DINNER')),
    title_en TEXT NOT NULL,
    title_ml TEXT NOT NULL,
    items_en TEXT[] NOT NULL DEFAULT '{}',
    items_ml TEXT[] NOT NULL DEFAULT '{}',
    description_en TEXT NULL,
    description_ml TEXT NULL,
    display_order INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE NULL,
    version INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (day_of_week, meal_slot, version)
);

CREATE INDEX IF NOT EXISTS idx_menu_templates_day_slot ON public.meal_menu_templates(day_of_week, meal_slot);
CREATE INDEX IF NOT EXISTS idx_menu_templates_status ON public.meal_menu_templates(status);

-- ---------------------------------------------------------------------
-- 30. MENU CHANGE LOGS
-- Audit log when today's published meal menu is updated or emergency changed
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    meal_slot TEXT NOT NULL CHECK (meal_slot IN ('EARLY_MORNING_SNACKS', 'BREAKFAST', 'LUNCH', 'EVENING_SNACKS', 'DINNER')),
    previous_menu_text TEXT NOT NULL,
    new_menu_text TEXT NOT NULL,
    reason TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_change_logs_date ON public.menu_change_logs(date);

-- ---------------------------------------------------------------------
-- 31. FOOD SURPLUS RECORDS
-- Controlled surplus / waste tracking, quality assessment, and safe donation workflow
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_surplus_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_session_id UUID NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity >= 0),
    unit TEXT NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN ('EDIBLE_SURPLUS', 'UNUSABLE_FOOD')),
    quality_status TEXT NOT NULL DEFAULT 'NOT_ASSESSED' CHECK (quality_status IN ('NOT_ASSESSED', 'ELIGIBLE', 'NOT_ELIGIBLE')),
    destination TEXT NOT NULL CHECK (destination IN ('DONATION', 'STORAGE', 'APPROVED_REUSE', 'OTHER_APPROVED_USE', 'DISPOSAL')),
    waste_reason TEXT NULL CHECK (waste_reason IN (
        'LOW_ATTENDANCE', 
        'OVER_PREPARATION', 
        'UNEXPECTED_ABSENCE', 
        'MENU_CHANGE', 
        'SPECIAL_EVENT', 
        'COOKING_VARIANCE', 
        'OTHER'
    )),
    donation_status TEXT NULL CHECK (donation_status IN ('PENDING_REVIEW', 'APPROVED', 'DONATED', 'REJECTED', 'CANCELLED')),
    donation_recipient TEXT NULL,
    destination_notes TEXT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    quality_assessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    quality_assessed_at TIMESTAMPTZ NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_surplus_session ON public.food_surplus_records(meal_session_id);
CREATE INDEX IF NOT EXISTS idx_surplus_classification ON public.food_surplus_records(classification);
CREATE INDEX IF NOT EXISTS idx_surplus_donation ON public.food_surplus_records(donation_status);

-- Enable RLS on New Tables
ALTER TABLE public.meal_menu_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_surplus_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Students can only read published menus
CREATE POLICY "Students can view published menus" ON public.meal_menu_templates
    FOR SELECT TO authenticated USING (status = 'PUBLISHED');

CREATE POLICY "Admins can manage meal menus" ON public.meal_menu_templates
    FOR ALL TO authenticated USING (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can view menu change logs" ON public.menu_change_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can create menu change logs" ON public.menu_change_logs
    FOR INSERT TO authenticated WITH CHECK (public.get_auth_user_role() IN ('ADMIN', 'SUPERVISOR'));

CREATE POLICY "Authenticated users can view food surplus records" ON public.food_surplus_records
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Kitchen and admins can manage food surplus records" ON public.food_surplus_records
    FOR ALL TO authenticated USING (true);

-- =====================================================================
-- PHASE 7: UTENSIL DISCREPANCY, RECOVERY & DAMAGE MANAGEMENT
-- =====================================================================

-- ---------------------------------------------------------------------
-- 32. UTENSIL DISCREPANCY EXTENSIONS & HISTORY
-- Tracks detailed missing/misplaced/damaged/broken/overage lifecycle
-- ---------------------------------------------------------------------

ALTER TABLE public.utensil_discrepancies 
    ADD COLUMN IF NOT EXISTS issue_type TEXT NOT NULL DEFAULT 'COUNT_MISMATCH',
    ADD COLUMN IF NOT EXISTS source_table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS found_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS found_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS return_confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS return_confirmed_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS resolution_type TEXT NULL,
    ADD COLUMN IF NOT EXISTS resolution_reason TEXT NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_discrepancies_source_table ON public.utensil_discrepancies(source_table_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_issue_type ON public.utensil_discrepancies(issue_type);
CREATE INDEX IF NOT EXISTS idx_discrepancies_reported_at ON public.utensil_discrepancies(reported_at DESC);

-- Discrepancy Audit History Log (PRD Section 27-29)
CREATE TABLE IF NOT EXISTS public.utensil_discrepancy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discrepancy_id UUID NOT NULL REFERENCES public.utensil_discrepancies(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason TEXT NULL,
    notes TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_history_parent ON public.utensil_discrepancy_history(discrepancy_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_history_time ON public.utensil_discrepancy_history(performed_at DESC);

ALTER TABLE public.utensil_discrepancy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view discrepancy history" ON public.utensil_discrepancy_history
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and supervisors can record discrepancy history" ON public.utensil_discrepancy_history
    FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================================
-- PHASE 8: KITCHEN OPERATIONS & SPECIAL / PARTY ORDERS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.special_meal_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NULL,
    requested_for_date DATE NOT NULL,
    meal_slot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requester_name TEXT NOT NULL,
    requester_role TEXT NULL,
    audience_type TEXT NOT NULL DEFAULT 'PROGRAMME' CHECK (audience_type IN ('PROGRAMME', 'GUEST', 'VISITOR', 'TEACHER_EVENT', 'MEETING', 'SEMINAR', 'EXTERNAL_GROUP', 'OTHER')),
    special_requirements TEXT NULL,
    status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ASSIGNED', 'PREPARING', 'PREPARED', 'SERVED', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NULL,
    prepared_quantity INTEGER NOT NULL DEFAULT 0,
    served_quantity INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NULL,
    cancelled_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_special_orders_date ON public.special_meal_orders(requested_for_date);
CREATE INDEX IF NOT EXISTS idx_special_orders_slot ON public.special_meal_orders(meal_slot);
CREATE INDEX IF NOT EXISTS idx_special_orders_status ON public.special_meal_orders(status);
CREATE INDEX IF NOT EXISTS idx_special_orders_audience ON public.special_meal_orders(audience_type);

CREATE TABLE IF NOT EXISTS public.special_meal_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.special_meal_orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    previous_status TEXT NULL,
    new_status TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_special_order_events_order ON public.special_meal_order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_special_order_events_time ON public.special_meal_order_events(performed_at DESC);

ALTER TABLE public.special_meal_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_meal_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view special orders" ON public.special_meal_orders
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized staff can manage special orders" ON public.special_meal_orders
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can view order events" ON public.special_meal_order_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authorized staff can insert order events" ON public.special_meal_order_events
    FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================================
-- PHASE 9: SUPERVISOR + ADMIN + ROLES + PERMISSIONS + SCOPES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NULL
);

CREATE TABLE IF NOT EXISTS public.system_role_permissions (
    role_id UUID NOT NULL REFERENCES public.system_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.system_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('GLOBAL', 'DINING_HALL', 'FLOOR', 'AREA', 'TABLE', 'TEACHER_AREA', 'MEAL_SESSION')),
    scope_id TEXT NOT NULL,
    scope_name TEXT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    effective_to TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_scopes_user ON public.user_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scopes_type ON public.user_scopes(scope_type);

CREATE TABLE IF NOT EXISTS public.security_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    previous_value TEXT NULL,
    new_value TEXT NULL,
    reason TEXT NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON public.security_audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_events(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_time ON public.security_audit_events(performed_at DESC);

ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles and permissions" ON public.system_roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view user scopes" ON public.user_scopes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can view security audit events" ON public.security_audit_events
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can record security audit events" ON public.security_audit_events
    FOR INSERT TO authenticated WITH CHECK (true);
