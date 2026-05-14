# SIR Admin — تعليمات النشر (Vercel)

اللوحة جاهزة للنشر. أسرع طريقة: Vercel CLI من الترمنال.

---

## 1) إنشاء حساب Vercel

افتح <https://vercel.com/signup> واربطه بـ GitHub أو سجّل بإيميل.

## 2) تثبيت Vercel CLI

```powershell
npm install -g vercel
```

## 3) تسجيل دخول من الترمنال

```powershell
cd c:\dev\sir_admin
vercel login
```

اختر طريقة الدخول، تابع الرابط في المتصفح.

## 4) النشر الأوّل (Preview)

```powershell
vercel
```

سيسألك:
- **Set up and deploy?** → Y
- **Which scope?** → اختر حسابك
- **Link to existing project?** → N
- **Project name?** → `sir-admin` (أو أيّ اسم)
- **In which directory is your code?** → `./` (Enter)
- **Override settings?** → N

ينتهي بإعطائك رابطاً مثل `https://sir-admin-abc123.vercel.app`.

## 5) إضافة متغيّرات البيئة

من dashboard Vercel → Project → **Settings** → **Environment Variables**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nzncjikcbuwcpwngatvg.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_jlSja1Yf6_DSUgronap2zg_HCkTTS2_` |

**Apply to:** Production, Preview, Development (الثلاثة).

اضغط Save.

## 6) النشر الإنتاجي

```powershell
vercel --prod
```

ينتج رابط ثابت مثل `https://sir-admin.vercel.app`.

## 7) Domain مخصّص (اختياري)

من Vercel → Project → **Domains** → Add:
- مثلاً `admin.sir.sa`
- اتبع تعليمات DNS اللي يعطيك إياها (CNAME للـ vercel-dns).

## 8) إعدادات Supabase بعد النشر

افتح Supabase → **Authentication** → **URL Configuration**:
- **Site URL:** `https://sir-admin.vercel.app` (أو الـ domain المخصّص)
- **Redirect URLs:** أضف نفس الـ URL

هذا مهم لو أضفت password recovery أو OAuth لاحقاً.

---

## ⚠️ حماية الأدمن

اللوحة محمية بـ login + role gate (`is_admin()` على RLS). أيّ زائر يفتح الرابط يصير `/login`، ولو ما عنده role=admin يُرفض.

لو تريد طبقة إضافية (تخفي الرابط نفسه عن العامّة):
- Vercel **Password Protection** (مدفوع $20/شهر) — يضع http password قبل الـ login
- أو **Vercel Authentication** (Free for Hobby) — يطلب Vercel account

غير مطلوب للحين — RLS كافية.

---

## 🚀 النشر بعد كل تعديل

كل push لـ `main` يعمل deploy تلقائي لو ربطت Vercel بـ GitHub. أو يدوياً:

```powershell
cd c:\dev\sir_admin
vercel --prod
```

---

## نشر تطبيق Flutter (web)

التطبيق نفسه (`c:\dev\sir_app`) يقدر ينُشر web ليجرّبه العميل من المتصفح:

```powershell
cd c:\dev\sir_app
flutter build web --release
```

ينتج في `build/web/`. ارفعه على:
- **Firebase Hosting** (`firebase init hosting; firebase deploy`)
- **Cloudflare Pages** (drag & drop folder)
- **Netlify** (drag & drop)
- **Vercel** (مع `vercel.json` يحدّد `outputDirectory: build/web`)

Vercel للـ Flutter غير native — نوصي بـ **Cloudflare Pages** أو **Netlify** لسهولة الـ static drop.

---

## بعد النشر — تحقّقات أخيرة

- [ ] افتح الـ admin URL في تبويب incognito → يحوّلك لـ /login ✓
- [ ] سجّل دخول بـ admin@sir.sa → تدخل اللوحة ✓
- [ ] عدّل سعر خدمة من الأدمن
- [ ] افتح تطبيق Flutter (محلي أو منشور) → السعر الجديد يظهر ✓
- [ ] جرّب inline status change على حجز → audit_log يحفظ التغيير ✓
