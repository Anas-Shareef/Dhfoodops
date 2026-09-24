-- =====================================================================
-- DH DINING MANAGEMENT SYSTEM (Phase 1 & Phase 2)
-- Realistic Seed Data for Development and Testing
-- =====================================================================

-- 1. SEED DEPARTMENTS
INSERT INTO public.departments (id, name, code) VALUES
    ('d1111111-1111-1111-1111-111111111111', 'Aalimiah Program', 'AL'),
    ('d2222222-2222-2222-2222-222222222222', 'Qira''at & Studies Year 1', 'QS1'),
    ('d3333333-3333-3333-3333-333333333333', 'Qira''at & Studies Year 2', 'QS2'),
    ('d4444444-4444-4444-4444-444444444444', 'Hifz & Studies Year 2', 'HS2')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 1B. SEED DINING HALLS & FLOORS (PRD Phase 3 Architecture Freeze Section 5)
INSERT INTO public.dining_halls (id, name, code, status) VALUES
    ('dh111111-1111-1111-1111-111111111111', 'PG Dining Hall', 'PG_HALL', 'active')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.dining_floors (id, dining_hall_id, name, floor_number) VALUES
    ('df111111-1111-1111-1111-111111111111', 'dh111111-1111-1111-1111-111111111111', 'Ground Floor', 0),
    ('df222222-2222-2222-2222-222222222222', 'dh111111-1111-1111-1111-111111111111', 'First Floor', 1)
ON CONFLICT (dining_hall_id, floor_number) DO UPDATE SET name = EXCLUDED.name;

-- 2. SEED DINING AREAS (Phase 2 & 3 Hierarchy)
INSERT INTO public.dining_areas (id, dining_floor_id, name, floor, section, area_type, status) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'df222222-2222-2222-2222-222222222222', 'First Floor CHS Side', 'First Floor', 'CHS Side', 'STUDENT', 'active'),
    ('a2222222-2222-2222-2222-222222222222', 'df222222-2222-2222-2222-222222222222', 'First Floor PG Side', 'First Floor', 'PG Side', 'STUDENT', 'active'),
    ('a3333333-3333-3333-3333-333333333333', 'df111111-1111-1111-1111-111111111111', 'Ground Floor PG Side', 'Ground Floor', 'PG Side', 'STUDENT', 'active'),
    ('a4444444-4444-4444-4444-444444444444', 'df111111-1111-1111-1111-111111111111', 'Ground Floor CHS Side', 'Ground Floor', 'CHS Side', 'STUDENT', 'active'),
    ('a5555555-5555-5555-5555-555555555555', 'df222222-2222-2222-2222-222222222222', 'First Floor CHS Teacher Area', 'First Floor', 'Teacher Side', 'TEACHER', 'active')
ON CONFLICT (name) DO UPDATE SET 
    dining_floor_id = EXCLUDED.dining_floor_id,
    area_type = EXCLUDED.area_type,
    status = EXCLUDED.status;

-- 3. SEED TABLES (Phase 2)
INSERT INTO public.tables (id, table_number, dining_area_id, capacity, status, map_position) VALUES
    ('t3111111-1111-1111-1111-111111111131', 31, 'a1111111-1111-1111-1111-111111111111', 8, 'Active', '{"row": 1, "col": 1}'),
    ('t3222222-2222-2222-2222-222222222232', 32, 'a1111111-1111-1111-1111-111111111111', 8, 'Active', '{"row": 1, "col": 2}'),
    ('t3333333-3333-3333-3333-333333333333', 33, 'a1111111-1111-1111-1111-111111111111', 8, 'Active', '{"row": 2, "col": 1}'),
    ('t3444444-4444-4444-4444-444444444434', 34, 'a1111111-1111-1111-1111-111111111111', 8, 'Active', '{"row": 2, "col": 2}'),
    ('t1222222-2222-2222-2222-222222222212', 12, 'a3333333-3333-3333-3333-333333333333', 8, 'Active', '{"row": 1, "col": 1}'),
    ('t1555555-5555-5555-5555-555555555515', 15, 'a4444444-4444-4444-4444-444444444444', 8, 'Active', '{"row": 1, "col": 1}'),
    ('t2111111-1111-1111-1111-111111111121', 21, 'a2222222-2222-2222-2222-222222222222', 8, 'Active', '{"row": 1, "col": 1}'),
    ('t2222222-2222-2222-2222-222222222222', 22, 'a2222222-2222-2222-2222-222222222222', 8, 'Active', '{"row": 1, "col": 2}')
ON CONFLICT (table_number) DO UPDATE SET dining_area_id = EXCLUDED.dining_area_id, capacity = EXCLUDED.capacity;

-- 4. SEED MEAL SCHEDULES
INSERT INTO public.meal_schedules (id, meal_type, meal_time, attendance_start_time, attendance_end_time, is_active) VALUES
    ('m1111111-1111-1111-1111-111111111111', 'breakfast', '08:30:00', '07:15:00', '07:45:00', true),
    ('m2222222-2222-2222-2222-222222222222', 'lunch', '13:00:00', '11:45:00', '12:15:00', true),
    ('m3333333-3333-3333-3333-333333333333', 'dinner', '20:00:00', '18:45:00', '19:15:00', true)
ON CONFLICT DO NOTHING;

-- 5. SEED USERS & PROFILES
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
        VALUES 
            ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@example.com', crypt('AdminPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"System Admin","role":"ADMIN"}', now(), now(), 'authenticated'),
            ('s0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'student@example.com', crypt('StudentPass123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Muhammed","role":"STUDENT"}', now(), now(), 'authenticated')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

INSERT INTO public.profiles (id, auth_user_id, role) VALUES
    ('p0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ADMIN'),
    ('p0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000001', 'STUDENT')
ON CONFLICT (auth_user_id) DO NOTHING;

-- 6. SEED STUDENTS (Including exact Table 31 roster from PRD Section 7 & 17)
-- Table 31: 6 from QS2, 2 from QS1
INSERT INTO public.students (id, auth_user_id, enrollment_no, name, email, department_id, year, table_number, status) VALUES
    ('b1111111-1111-1111-1111-111111111111', 's0000000-0000-0000-0000-000000000001', '16889', 'Muhammed', 'student@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active'),
    ('b1111111-1111-1111-1111-111111111112', NULL, '16960', 'Muhammed Alfas', 'alfas.16960@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active'),
    ('b1111111-1111-1111-1111-111111111113', NULL, '17028', 'Moosa Fayiz', 'fayiz.17028@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active'),
    ('b1111111-1111-1111-1111-111111111114', NULL, '17047', 'Mohammed Muzammil', 'muzammil.17047@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active'),
    ('b1111111-1111-1111-1111-111111111115', NULL, '17106', 'Muhammad Sabith', 'sabith.17106@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active'),
    ('b1111111-1111-1111-1111-111111111116', NULL, '17195', 'Muhammed Hinan', 'hinan.17195@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active'),
    ('b1111111-1111-1111-1111-111111111117', NULL, '17207', 'Muhammed Irfan', 'irfan.17207@example.com', 'd2222222-2222-2222-2222-222222222222', 1, 31, 'active'), -- QS1
    ('b1111111-1111-1111-1111-111111111118', NULL, '17209', 'Muhammed Sanad', 'sanad.17209@example.com', 'd2222222-2222-2222-2222-222222222222', 1, 31, 'active')  -- QS1
ON CONFLICT (enrollment_no) DO UPDATE 
SET name = EXCLUDED.name, department_id = EXCLUDED.department_id, table_number = EXCLUDED.table_number;

-- Other tables members (Table 32, Table 12, Table 15)
INSERT INTO public.students (id, auth_user_id, enrollment_no, name, email, department_id, year, table_number, status) VALUES
    ('b2222222-2222-2222-2222-222222222221', NULL, '15101', 'Abdullah Hashmi', 'abdullah.h@example.com', 'd1111111-1111-1111-1111-111111111111', 3, 12, 'active'),
    ('b2222222-2222-2222-2222-222222222222', NULL, '15102', 'Ibrahim Patel', 'ibrahim.p@example.com', 'd1111111-1111-1111-1111-111111111111', 3, 12, 'active'),
    ('b2222222-2222-2222-2222-222222222223', NULL, '15103', 'Yusuf Rawat', 'yusuf.r@example.com', 'd1111111-1111-1111-1111-111111111111', 3, 12, 'active'),
    ('b3333333-3333-3333-3333-333333333331', NULL, '17201', 'Khalid Mahmood', 'khalid.m@example.com', 'd4444444-4444-4444-4444-444444444444', 1, 15, 'active'),
    ('b3333333-3333-3333-3333-333333333332', NULL, '17202', 'Omar Farooq', 'omar.f@example.com', 'd4444444-4444-4444-4444-444444444444', 1, 15, 'active'),
    ('b4444444-4444-4444-4444-444444444431', NULL, '16501', 'Zayd Ansari', 'zayd.a@example.com', 'd2222222-2222-2222-2222-222222222222', 1, 32, 'active'),
    ('b4444444-4444-4444-4444-444444444432', NULL, '16502', 'Farhan Qadir', 'farhan.q@example.com', 'd2222222-2222-2222-2222-222222222222', 1, 32, 'active'),
    ('b4444444-4444-4444-4444-444444444433', NULL, '16503', 'Rashid V.P.', 'rashid.vp@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 32, 'active')
ON CONFLICT (enrollment_no) DO NOTHING;

-- 7. SEED TABLE ASSIGNMENTS (Phase 2 Time-bounded assignments)
INSERT INTO public.table_assignments (student_id, table_id, assigned_from, status)
SELECT s.id, t.id, now() - INTERVAL '30 days', 'active'
FROM public.students s
JOIN public.tables t ON t.table_number = s.table_number
ON CONFLICT DO NOTHING;

-- 8. GENERATE SESSIONS FOR TODAY & RECENT DATES
SELECT public.generate_daily_meal_sessions(CURRENT_DATE);
SELECT public.generate_daily_meal_sessions(CURRENT_DATE - INTERVAL '1 day');

-- 9. SEED TODAY'S ATTENDANCE FOR TABLE 31 (7 Attending, 1 Not Attending as per PRD Section 15 & 25)
DO $$
DECLARE
    v_session_id UUID;
    v_student_rec RECORD;
    v_count INT := 0;
BEGIN
    SELECT id INTO v_session_id 
    FROM public.meal_sessions 
    WHERE session_date = CURRENT_DATE AND meal_type = 'breakfast' 
    LIMIT 1;

    IF v_session_id IS NOT NULL THEN
        FOR v_student_rec IN SELECT id FROM public.students WHERE table_number = 31 ORDER BY enrollment_no LOOP
            v_count := v_count + 1;
            INSERT INTO public.meal_attendance (meal_session_id, student_id, status)
            VALUES (
                v_session_id,
                v_student_rec.id,
                CASE WHEN v_count <= 7 THEN 'attending' ELSE 'not_attending' END
            )
            ON CONFLICT (meal_session_id, student_id) DO UPDATE SET status = EXCLUDED.status;
        END LOOP;
    END IF;
END $$;

-- 10. SEED SUPPLIERS (Phase 3: Ijas K and Ahmed K)
INSERT INTO public.students (id, auth_user_id, enrollment_no, name, email, department_id, year, table_number, status) VALUES
    ('b5555555-5555-5555-5555-555555555551', NULL, '16880', 'Ijas K', 'ijas.k@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active'),
    ('b5555555-5555-5555-5555-555555555552', NULL, '16881', 'Ahmed K', 'ahmed.k@example.com', 'd3333333-3333-3333-3333-333333333333', 2, 31, 'active')
ON CONFLICT (enrollment_no) DO NOTHING;

-- 11. SEED SUPPLIER DUTY PERIODS (September 2026)
INSERT INTO public.supplier_duty_periods (id, name, start_date, end_date, status) VALUES
    ('p-sep-2026', 'September 2026 Supplier Duty', '2026-09-01', '2026-09-30', 'active')
ON CONFLICT DO NOTHING;

-- 12. SEED SUPPLIER ASSIGNMENTS (PRD Phase 3 Architecture: Table, Area, and Teacher Area Scopes)
INSERT INTO public.supplier_assignments (duty_period_id, scope_type, scope_id, table_id, dining_area_id, student_id, role, valid_from, valid_until, status) VALUES
    ('p-sep-2026', 'TABLE', 't3111111-1111-1111-1111-111111111131', 't3111111-1111-1111-1111-111111111131', 'a1111111-1111-1111-1111-111111111111', 'b5555555-5555-5555-5555-555555555551', 'primary', '2026-09-01', '2026-09-30', 'active'),
    ('p-sep-2026', 'TABLE', 't3111111-1111-1111-1111-111111111131', 't3111111-1111-1111-1111-111111111131', 'a1111111-1111-1111-1111-111111111111', 'b5555555-5555-5555-5555-555555555552', 'backup', '2026-09-01', '2026-09-30', 'active'),
    ('p-sep-2026', 'AREA', 'a1111111-1111-1111-1111-111111111111', NULL, 'a1111111-1111-1111-1111-111111111111', 'b5555555-5555-5555-5555-555555555551', 'area_main', '2026-09-01', '2026-09-30', 'active'),
    ('p-sep-2026', 'TEACHER_AREA', 'a5555555-5555-5555-5555-555555555555', NULL, 'a5555555-5555-5555-5555-555555555555', 'b4444444-4444-4444-4444-444444444433', 'teacher_supplier', '2026-09-01', '2026-09-30', 'active'),
    ('p-sep-2026', 'TABLE', 't3222222-2222-2222-2222-222222222232', 't3222222-2222-2222-2222-222222222232', 'a1111111-1111-1111-1111-111111111111', 'b4444444-4444-4444-4444-444444444431', 'primary', '2026-09-01', '2026-09-30', 'active'),
    ('p-sep-2026', 'TABLE', 't3222222-2222-2222-2222-222222222232', 't3222222-2222-2222-2222-222222222232', 'a1111111-1111-1111-1111-111111111111', 'b4444444-4444-4444-4444-444444444432', 'backup', '2026-09-01', '2026-09-30', 'active'),
    ('p-sep-2026', 'TABLE', 't3444444-4444-4444-4444-444444444434', 't3444444-4444-4444-4444-444444444434', 'a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222221', 'primary', '2026-09-01', '2026-09-30', 'active')
ON CONFLICT DO NOTHING;

-- 12B. SEED SUPPLIER POOLS & ROTATION RULES (PRD Section 10 & 11)
INSERT INTO public.supplier_rotation_rules (id, name, rule_type, frequency) VALUES
    ('rr-round-robin', 'Standard Round-Robin Rotation', 'ROUND_ROBIN', 'MONTHLY')
ON CONFLICT DO NOTHING;

INSERT INTO public.supplier_pools (id, name, dining_area_id, duty_period_id, status) VALUES
    ('pool-chs-first', 'First Floor CHS Supplier Pool', 'a1111111-1111-1111-1111-111111111111', 'p-sep-2026', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.supplier_pool_members (pool_id, student_id, priority, is_backup_eligible) VALUES
    ('pool-chs-first', 'b5555555-5555-5555-5555-555555555551', 1, true),
    ('pool-chs-first', 'b5555555-5555-5555-5555-555555555552', 2, true),
    ('pool-chs-first', 'b4444444-4444-4444-4444-444444444431', 3, true),
    ('pool-chs-first', 'b4444444-4444-4444-4444-444444444432', 4, true)
ON CONFLICT DO NOTHING;
-- 13. SEED FOOD ITEMS (Phase 4)
INSERT INTO public.food_items (id, name, category, unit, default_consumption_factor, is_active) VALUES
    ('f0000001-0000-0000-0000-000000000001', 'Idli', 'main_dish', 'portions', 1.000, true),
    ('f0000002-0000-0000-0000-000000000002', 'Sambar', 'curry', 'litres', 0.200, true),
    ('f0000003-0000-0000-0000-000000000003', 'Coconut Chutney', 'side', 'kg', 0.050, true),
    ('f0000004-0000-0000-0000-000000000004', 'Hot Tea', 'beverage', 'litres', 0.200, true),
    ('f0000005-0000-0000-0000-000000000005', 'Ghee Rice', 'staple', 'kg', 0.250, true),
    ('f0000006-0000-0000-0000-000000000006', 'Chicken Curry', 'curry', 'portions', 1.000, true),
    ('f0000007-0000-0000-0000-000000000007', 'Steamed Rice', 'staple', 'kg', 0.300, true)
ON CONFLICT DO NOTHING;

-- 14. SEED PHASE 4 DEMO SCENARIO (PRD Section 39: 24 Sep Breakfast 08:30 AM)
-- Attending: 286, Not Attending: 31, No Response: 8. Buffer: 5%. Recommended: 301. Prepared: 300. Served: 281. Leftover: 19.
DO $$
DECLARE
    v_session_id UUID;
    v_req_id UUID := 'r4444444-4444-4444-4444-444444444444';
BEGIN
    SELECT id INTO v_session_id 
    FROM public.meal_sessions 
    WHERE session_date = '2026-09-24' AND meal_type = 'breakfast' 
    LIMIT 1;

    IF v_session_id IS NOT NULL THEN
        -- Requirement
        INSERT INTO public.meal_requirements (
            id, meal_session_id, attending_count, not_attending_count, no_response_count,
            buffer_percent, base_quantity, recommended_quantity, status, calculation_version
        ) VALUES (
            v_req_id, v_session_id, 286, 31, 8,
            5.00, 286, 301, 'completed', 1
        ) ON CONFLICT (meal_session_id, calculation_version) DO NOTHING;

        -- Requirement Items
        INSERT INTO public.meal_requirement_items (
            meal_requirement_id, food_item_id, consumption_factor, base_quantity, buffer_quantity, recommended_quantity, unit
        ) VALUES 
            (v_req_id, 'f0000001-0000-0000-0000-000000000001', 1.000, 286.00, 15.00, 301.00, 'portions'),
            (v_req_id, 'f0000002-0000-0000-0000-000000000002', 0.200, 57.20, 2.90, 60.10, 'litres'),
            (v_req_id, 'f0000004-0000-0000-0000-000000000004', 0.200, 57.20, 2.90, 60.10, 'litres')
        ON CONFLICT DO NOTHING;

        -- Preparation Record (Planned: 301, Prepared: 300)
        INSERT INTO public.meal_preparation_records (
            meal_requirement_id, food_item_id, planned_quantity, prepared_quantity, unit, remarks
        ) VALUES 
            (v_req_id, 'f0000001-0000-0000-0000-000000000001', 301.00, 300.00, 'portions', 'Prepared 300 portions as per kitchen capacity')
        ON CONFLICT DO NOTHING;

        -- Serving Record (Served: 281)
        INSERT INTO public.meal_serving_records (
            meal_session_id, food_item_id, served_quantity, unit, serving_status, remarks
        ) VALUES 
            (v_session_id, 'f0000001-0000-0000-0000-000000000001', 281.00, 'portions', 'completed', 'All 281 present students served on time')
        ON CONFLICT DO NOTHING;

        -- Leftover Record (Leftover: 19 portions, classification: usable / stored)
        INSERT INTO public.meal_leftover_records (
            meal_session_id, food_item_id, quantity, unit, classification, remarks
        ) VALUES 
            (v_session_id, 'f0000001-0000-0000-0000-000000000001', 19.00, 'portions', 'stored', 'Chilled in clean warmer container for afternoon snack redistribution')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 15. SEED UTENSIL TYPES (Phase 5: Plates, Glasses, Jugs)
INSERT INTO public.utensil_types (id, name, code, unit, active) VALUES
    ('u0000001-0000-0000-0000-000000000001', 'Dining Plate', 'PLATE', 'pieces', true),
    ('u0000002-0000-0000-0000-000000000002', 'Drinking Glass', 'GLASS', 'pieces', true),
    ('u0000003-0000-0000-0000-000000000003', 'Water Jug', 'JUG', 'pieces', true)
ON CONFLICT (code) DO NOTHING;

-- 16. SEED TABLE UTENSIL CONFIGURATIONS (Table 31 Standard: 8 Plates, 8 Glasses, 1 Jug)
INSERT INTO public.table_utensil_configurations (table_id, utensil_type_id, expected_quantity, effective_from)
SELECT 
    t.id,
    u.id,
    CASE 
        WHEN u.code = 'PLATE' THEN 8
        WHEN u.code = 'GLASS' THEN 8
        WHEN u.code = 'JUG' THEN 1
        ELSE 8
    END,
    '2026-09-01'::DATE
FROM public.tables t
CROSS JOIN public.utensil_types u
WHERE t.table_number IN (31, 32, 33, 34)
ON CONFLICT DO NOTHING;

-- 17. SEED PHASE 5 TABLE 31 DEMO SCENARIO (PRD Section 41)
DO $$
DECLARE
    v_session_id UUID;
    v_table31_id UUID;
    v_table32_id UUID;
    v_op_session_id UUID := 'op311111-1111-1111-1111-111111111131';
    v_glass_type_id UUID := 'u0000002-0000-0000-0000-000000000002';
    v_ijas_id UUID := 'b5555555-5555-5555-5555-555555555551';
BEGIN
    SELECT id INTO v_session_id FROM public.meal_sessions WHERE session_date = '2026-09-24' AND meal_type = 'breakfast' LIMIT 1;
    SELECT id INTO v_table31_id FROM public.tables WHERE table_number = 31 LIMIT 1;
    SELECT id INTO v_table32_id FROM public.tables WHERE table_number = 32 LIMIT 1;

    IF v_table31_id IS NOT NULL AND v_session_id IS NOT NULL THEN
        -- Shelf operational session (Reconciled and Locked after recovery)
        INSERT INTO public.utensil_operation_sessions (
            id, table_id, meal_session_id, status, opened_at, distribution_started_at,
            collection_started_at, verification_started_at, verified_at, closed_at
        ) VALUES (
            v_op_session_id, v_table31_id, v_session_id, 'LOCKED',
            '2026-09-24 07:35:00+05:30', '2026-09-24 07:45:00+05:30',
            '2026-09-24 08:45:00+05:30', '2026-09-24 09:00:00+05:30',
            '2026-09-24 09:10:00+05:30', '2026-09-24 09:12:00+05:30'
        ) ON CONFLICT DO NOTHING;

        -- Operation items (Expected 8/8/1, Returned 8/8/1 after recovery)
        INSERT INTO public.utensil_operation_items (operation_session_id, utensil_type_id, expected_quantity, distributed_quantity, returned_quantity, unresolved_quantity)
        VALUES 
            (v_op_session_id, 'u0000001-0000-0000-0000-000000000001', 8, 8, 8, 0),
            (v_op_session_id, 'u0000002-0000-0000-0000-000000000002', 8, 8, 8, 0),
            (v_op_session_id, 'u0000003-0000-0000-0000-000000000003', 1, 1, 1, 0)
        ON CONFLICT DO NOTHING;

        -- Discrepancy record (1 Glass found at Table 32 -> RECOVERED)
        INSERT INTO public.utensil_discrepancies (
            operation_session_id, utensil_type_id, quantity, status,
            origin_table_id, current_table_id, reported_at, resolved_at, resolution_note
        ) VALUES (
            v_op_session_id, v_glass_type_id, 1, 'RECOVERED',
            v_table31_id, v_table32_id, '2026-09-24 09:00:00+05:30', '2026-09-24 09:10:00+05:30',
            'Glass stamped with Table 31 found at Table 32 and returned to Table 31 shelf'
        ) ON CONFLICT DO NOTHING;

        -- Immutable audit events
        INSERT INTO public.utensil_events (operation_session_id, table_id, event_type, metadata)
        VALUES
            (v_op_session_id, v_table31_id, 'SHELF_OPENED', '{"opened_by": "Ijas K", "time": "07:35 AM"}'::jsonb),
            (v_op_session_id, v_table31_id, 'DISTRIBUTION_STARTED', '{"plates": 8, "glasses": 8, "jug": 1}'::jsonb),
            (v_op_session_id, v_table31_id, 'COLLECTION_STARTED', '{"plates": 8, "glasses": 7, "jug": 1}'::jsonb),
            (v_op_session_id, v_table31_id, 'DISCREPANCY_REPORTED', '{"item": "GLASS", "missing": 1}'::jsonb),
            (v_op_session_id, v_table31_id, 'ITEM_MARKED_MISPLACED', '{"item": "GLASS", "found_at_table": 32}'::jsonb),
            (v_op_session_id, v_table31_id, 'ITEM_RECOVERED', '{"item": "GLASS", "returned_to_table": 31}'::jsonb),
            (v_op_session_id, v_table31_id, 'SHELF_CLOSED', '{"status": "All 8 Plates, 8 Glasses, 1 Jug verified"}'::jsonb);
    END IF;
END $$;



