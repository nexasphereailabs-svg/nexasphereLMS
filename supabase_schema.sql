-- Teachers create these to represent areas of expertise (e.g., "Math", "Science")
CREATE TABLE IF NOT EXISTS teacher_profiles (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
title TEXT NOT NULL,
description TEXT,
category TEXT,
avatar_url TEXT,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. COURSES
-- Belong to a specific Subject Profile
CREATE TABLE IF NOT EXISTS courses (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
profile_id UUID REFERENCES teacher_profiles(id) ON DELETE CASCADE,
teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
title TEXT NOT NULL,
description TEXT,
thumbnail_url TEXT,
level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. MODULES (SECTIONS)
-- Nested educational content inside a course
CREATE TABLE IF NOT EXISTS modules (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
title TEXT NOT NULL,
content TEXT, -- Store your Rich Text here
order_index INTEGER DEFAULT 0,
created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 4. ENROLLMENTS
-- Tracks which students are taking which courses
CREATE TABLE IF NOT EXISTS enrollments (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
enrolled_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(student_id, course_id)
);
-- 5. PROGRESS TRACKING
-- Tracks which modules a specific student has completed
CREATE TABLE IF NOT EXISTS module_progress (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
is_completed BOOLEAN DEFAULT TRUE,
completed_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(student_id, module_id)
);