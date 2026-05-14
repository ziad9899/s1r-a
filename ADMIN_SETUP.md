# SIR Admin — تعليمات الإعداد (المرحلة 14ب)

لوحة تحكم ويب للمسؤولين، تعمل على Next.js 16 + shadcn/ui + Supabase.

## 1) تشغيل الـ migrations الأربعة الجديدة

افتح Supabase → SQL Editor وشغّل بالترتيب (انسخ كل ملف، الصق، **Run**):

1. [`supabase/migrations/0003_admin_role.sql`](../sir_app/supabase/migrations/0003_admin_role.sql)
2. [`supabase/migrations/0004_services.sql`](../sir_app/supabase/migrations/0004_services.sql)
3. [`supabase/migrations/0005_branches.sql`](../sir_app/supabase/migrations/0005_branches.sql)
4. [`supabase/migrations/0006_audit_log.sql`](../sir_app/supabase/migrations/0006_audit_log.sql)

## 2) تفعيل JWT claim hook

هذا يحقن `user_role` في توكن الجلسة بعد كل تسجيل دخول/تجديد:

1. Authentication → **Hooks** → **Add Hook**
2. **Hook type:** Custom Access Token
3. **Hook source:** Postgres
4. **Schema:** `public`
5. **Function:** `custom_access_token_hook`
6. اضغط **Create hook**

## 3) إنشاء حساب الأدمن

داخل Supabase → Authentication → **Add user** → **Create new user**:
- **Email:** بريدك (مثلاً `admin@sir.sa`)
- **Password:** قوية (8+ حروف + أرقام)
- اضغط **Create user**

ثم في SQL Editor:

```sql
update public.profiles
set role = 'admin',
    first_name = coalesce(first_name, 'مدير'),
    phone = coalesce(phone, 'admin')
where id = (select id from auth.users where email = 'admin@sir.sa');
```

> إذا لم يتم إنشاء صف في `profiles` تلقائياً، أنشئه يدوياً:
>
> ```sql
> insert into public.profiles (id, role, first_name, phone)
> select id, 'admin', 'مدير', 'admin'
> from auth.users where email = 'admin@sir.sa'
> on conflict (id) do update set role = 'admin';
> ```

## 4) تشغيل لوحة التحكم محلياً

```powershell
cd c:\dev\sir_admin
npm run dev
```

افتح <http://localhost:3000> — سيوجّهك لـ `/login`. سجّل دخول بـ `admin@sir.sa` + كلمة المرور.

## 5) ما هو متاح الآن

- ✅ تسجيل دخول للمسؤولين فقط (يحجب أي حساب `role != 'admin'`)
- ✅ شاشة "الرئيسية" — 4 بطاقات KPI (حجوزات اليوم، إيرادات الأسبوع، عدد المستخدمين، حجوزات قادمة)
- ✅ شاشة "الحجوزات" — جدول كامل مع تصفية بالحالة + pagination
- ⏳ الخدمات / الفروع / المستخدمين / الإعدادات — صفحات placeholder، نبنيها في 14د/14هـ/14و

## 6) Build للنشر (لاحقاً على Vercel)

```powershell
npm run build
npm run start
```

## ملاحظات أمنية

- المفتاح في `.env.local` هو **publishable key** فقط — آمن.
- `service_role` key لا يدخل المشروع أبداً. كل عملية كتابة تمرّ عبر RLS مع `is_admin()`.
- كل تعديل من الأدمن يُسجَّل في جدول `audit_log` تلقائياً عبر trigger.
