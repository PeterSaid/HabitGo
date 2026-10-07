# دليل نشر HabitGo أونلاين (سيرفر + قاعدة بيانات دائمة)

الدليل ده بيخلي تطبيقك شغال على النت 24 ساعة، وقاعدة البيانات محفوظة دايمًا (مش ملف على جهازك)،
والـ APK على الموبايل يوصل للسيرفر من أي مكان. كله **مجاني** (Render Free + Turso Free).

## إزاي التحديثات بتوصل المستخدمين؟ (مهم)

| نوع التعديل | بيوصل إزاي |
|---|---|
| **داتا أو منطق السيرفر** (نقاط، مكافآت، إعدادات الأدمن، صلح API) | `git push` → Render يعيد النشر لوحده → **فوري للكل** |
| **شكل وميزات تطبيق الويب** (اللي بيتفتح من اللينك) | نفس الحكاية — `git push` والكل ياخد الجديد أول ما يفتح اللينك |
| **شكل وميزات الـ APK** (شاشات، أزرار، أيقونات...) | محتاج بناء APK جديد وتوزيعه — لأن الـ APK نسخة مجمّدة من الكود |

يعني: عدّل كود → `git push` → **السيرفر وتطبيق الويب بيتحدثوا لوحدهم للكل**. والـ APK لو محتاج
تحديث شكل: `VITE_API_URL=<رابطك> npm run build` + `npx cap sync android` + `gradlew assembleRelease` ووزّعه.

```
الموبايل / المتصفح
      │  https://habitgo-xxxx.onrender.com   ← سيرفر Render المجاني
      ▼
   Backend (Express)  ──►  Turso (قاعدة بيانات LibSQL مستضافة — بياناتك دائمة)
      │
      └── يقدّم تطبيق الويب من app/dist (نفس الدومين، بدون مشاكل CORS)
```

---

## الخطوة 1 — اعمل قاعدة بيانات مجانية على Turso

1. افتح <https://turso.tech> وسجّل حساب مجاني (تقدر تسجّل بحساب GitHub).
2. من الداشبورد اضغط **Create Database** → سمّيه `habitgo` → اختار أقرب Location (مثلاً Frankfurt) → Create.
3. افتح صفحة الداتابيز الجديدة:
   - خد **URL** — شكله كده: `libsql://habitgo-<اسم-حسابك>.turso.io`
   - اضغط **Generate Token** (أو **Create Token**) وخد **التوكن** — شكله يبدأ بـ `eyJ...`

> ملحوظة: لو عندك Turso CLI تقدر تعمل نفس الخطوات بـ
> `turso db create habitgo` ثم `turso db show habitgo --url` ثم `turso db tokens create habitgo`.

---

## الخطوة 2 — جهّز بيانات الجداول على قاعدة Turso (مرة واحدة)

الـ schema والبيانات التجريبية (حسابات تجريبية + مكافآت + إنجازات...) بتتحمّل بسكريبت جاهز.
من جوه مجلد `backend` على جهازك:

**PowerShell:**
```powershell
$env:DATABASE_URL  = "libsql://habitgo-<اسم-حسابك>.turso.io"
$env:DATABASE_TOKEN = "التوكن-اللي-خدته"
npm run seed
Remove-Item Env:DATABASE_URL, Env:DATABASE_TOKEN
```

هتشوف رسالة إن التحميل نجح. لو عايز تمسح كل حاجة وتبدأ فاضي:
استخدم `npm run seed:fresh` بدل `npm run seed`.

> ⚠️ مهم: بعد ما تخلّص الأمر، شيل المتغيرين من الجلسة (الأمر الأخير بيعمل كده) —
> عشان السيرفر المحلي على جهازك يفضل شغال على ملف الداتابيز المحلي.

---

## الخطوة 3 — ارفع السيرفر على Render (مجاني)

1. ارفع المشروع على GitHub (repo خاص فيك).
2. افتح <https://dashboard.render.com> وسجّل دخول.
3. **New → Blueprint** واختار الـ repo — هيقرأ ملف `render.yaml` الجاهز في المشروع أوتوماتيك.
4. قبل ما تضغط Apply، هتطلب منك القيم اللي متعلمتش عليها (sync: false):
   - `DATABASE_URL` = رابط Turso من الخطوة 1
   - `DATABASE_TOKEN` = التوكن من الخطوة 1
   - `SMTP_HOST/SMTP_USER/SMTP_PASS/MAIL_FROM` = **اختياري** — لو عايز إيميلات استرجاع
     كلمة السر الحقيقية (من غيرها الكود بيظهر جوه التطبيق في وضع الديمو).
   - `JWT_SECRET` بيتولّد لوحده.
5. اضغط **Apply** واستنى البناء (أول مرة ياخد 5–10 دقايق عشان يبني تطبيق الويب والسيرفر مع بعض).
6. لما يخلص هيديك رابط زي: `https://habitgo-xxxx.onrender.com`
   - افتحه في المتصفح → هتلاقي تطبيق HabitGo شغال.
   - جرّب تسجيل دخول بحساب `peter@habitgo.app` / `Peter@12345` (بيانات تجريبية من الخطوة 2).

> ملحوظة عن الخطة المجانية في Render: السيرفر بي "ينام" بعد 15 دقيقة من عدم الاستخدام،
> وأول طلب بعدها ياخد حوالي 30–60 ثانية يصحى. لو عايز سرعة دايمًا: ارفّع الخطة لـ Starter.

---

## بديل بدون فيزا — النشر على Hugging Face Spaces

لو Render طلب منك فيزا (بيحصل مع حسابات جديدة كتحقق)، في حل مجاني 100% بدون أي كارت:
**Hugging Face Spaces** بشعار Docker (ملف `Dockerfile` جاهز في المشروع). البيانات على Turso
زي ما هي، والتطبيق + الـ API على نفس اللينك.

> ملحوظتين قبل ما تختار: (1) السبيس على HF بيبقى **عام** — يعني كود التطبيق يبقى معروض،
> (2) بيسيب بعد 48 ساعة من عدم الاستخدام ويصحى في أقل من دقيقة (أحسن من راندر).

الخطوات:

1. سجّل على <https://huggingface.co> (تقدر بحساب Google) — مجاني بدون كارت.
2. New → **Space** → الاسم `habitgo` → SDK: **Docker** → Blank → **Public** → Create.
3. من إعدادات السبيس: Settings → **Variables and secrets** → ضيف:
   - `DATABASE_URL` = رابط Turso بتاعك
   - `DATABASE_TOKEN` = توكن Turso
   - `JWT_SECRET` = أي نص عشوائي طويل
4. اربط الكود بالسبيس (مرة واحدة): Settings → Access Tokens → اعمل توكن **Write**.
   وبعدين من مجلد المشروع:
   ```powershell
   git remote add hf https://<username>:<hf-token>@huggingface.co/spaces/<username>/habitgo
   git push hf main
   ```
5. استنى البناء (5 دقايق تقريبًا) → تطبيقك هيبقى على
   `https://<username>-habitgo.hf.space`
6. حمّل الجداول على Turso (الخطوة 2 فوق لو لسه) وجرّب تسجيل دخول.
7. بناء APK النهائي:
   `set VITE_API_URL=https://<username>-habitgo.hf.space/api/v1&& npm run build`
   ثم `npx cap sync android` و `gradlew assembleRelease`.

أي تعديل بعدين = `git push hf main` → السبيس يعيد البناء لوحده → يوصل للكل.

---

---

## الخطوة 4 — وصّل الـ APK بالسيرفر الجديد

الرابط بيتحفر جوه الـ APK وقت البناء (مفيش خانة تغيير جوه التطبيق — ده مقصود لتبسيط التجربة):
```bash
cd app
set VITE_API_URL=https://habitgo-xxxx.onrender.com/api/v1&& npm run build
npx cap sync android && cd android && gradlew.bat assembleRelease
```
(في PowerShell استخدم: `$env:VITE_API_URL="https://..."; npm run build`)

لازم `/api/v1` في آخر الرابط. بعد كده وزّع `apk/HabitGo-release.apk` الجديد —
أي حد ينزّله يسجل دخول ويشتغل على طول من غير أي إعداد.

---

## الخطوة 5 — إزاي تعدّل في قاعدة البيانات (شوف وعدّل البيانات)

### من Turso Dashboard
افتح <https://dashboard.turso.tech> → داتابيز `habitgo` → **Edit Data** — شاشة جداول
تقدر تشوف الصفوف وتعدّل فيها مباشرة (users, habits, points_wallets, rewards...).

### من الترمينال (SQL Console)
```bash
turso db shell habitgo
```
أمثلة مفيدة:
```sql
-- شوف المستخدمين
SELECT id, email, role, status FROM users;

-- شوف محفظة نقاط مستخدم
SELECT * FROM points_wallets WHERE user_id = 'user-peter';

-- أوقف حساب مؤقتًا
UPDATE users SET status = 'suspended' WHERE email = 'someone@example.com';

-- ارجّع الحساب
UPDATE users SET status = 'active' WHERE email = 'someone@example.com';

-- عدّل سعر المكافآت (نقاط لكل وحدة) — نفسه من شاشة الأدمن جوه التطبيق
UPDATE app_settings SET value = '100' WHERE key = 'points_per_reward_unit';
```

### جداول النظام المهمة
| الجدول | فيه إيه |
|---|---|
| `users` / `profiles` / `user_settings` | الحسابات والملفات الشخصية والإعدادات |
| `habits` / `habit_schedules` / `habit_logs` | العادات وجدولتها وسجل الإنجاز |
| `points_wallets` / `points_transactions` | المحافظ وكل حركة نقاط |
| `rewards` / `reward_redemptions` | المكافآت وطلبات الاستبدال |
| `achievements` / `challenges` | الإنجازات والتحديات |
| `app_settings` | إعدادات النظام اللي بتتعدل من شاشة الأدمن |

> ⚠️ التعديل اليدوي على الجداول بيتجاوز منطق النقاط/السلاسل المكتوب في السيرفر —
> استخدمه للتصليح أو الإدارة النادرة، والمنطق الطبيعي شغال من التطبيق.

---

## أخطاء شائعة

| المشكلة | السبب / الحل |
|---|---|
| أول طلب بعد فترة بياخد ~دقيقة | Render Free بيوقف الخدمة لما تبقى خاملة — طبيعي، أو رفع للخطة المدفوعة |
| `Unauthorized` من Turso في اللوجز | `DATABASE_TOKEN` غلط أو قديم — ولّد توكن جديد من الداشبورد |
| تسجيل الدخول يرجّع "خطأ شبكة" في الـ APK | نسيت `/api/v1` في آخر رابط السيرفر، أو السيرفر بيصحى من النوم — استنى دقيقة |
| عايز تبدأ البيانات من الصفر | `npm run seed:fresh` مع متغيرات Turso (يمسح كل حاجة ويحمّل الأساسيات) |
| كود الاسترجاع مش بيوصل إيميل | مضبوطش SMTP — في وضع الإنتاج الكود مش بيتعرض؛ ظبط SMTP أو استخدم وضع الديمو |
