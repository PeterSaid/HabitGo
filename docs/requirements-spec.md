HabitGo — Functional MVP Requirements Specification
====================================================

Captured from product owner (2026-10-06). Sections 01–103.
This is the source-of-truth document for scope. The numbered
sections are referenced throughout the codebase and README.

---

أريد منك تصميم وتطوير تطبيق موبايل متكامل وقابل للاختبار باسم:

HabitGo

لا أريد مجرد UI Mockup أو Prototype بصري.

أريد تطبيقًا حقيقيًا Functional MVP جاهزًا للاختبار على Android، مع Backend وقاعدة بيانات وحسابات مستخدمين وحفظ بيانات حقيقي، ورفع المشروع على Cloud بحيث يمكنني الرجوع للكود وتعديله لاحقًا، وفي النهاية إنشاء ملف APK قابل للتثبيت والتجربة.

==================================================
01 — فكرة التطبيق الأساسية
==================================================

HabitGo هو تطبيق لتكوين وتتبع العادات اليومية، ولكن الاختلاف الرئيسي عن تطبيقات Habit Tracking التقليدية هو:

المستخدم لا يكتفي بمتابعة عاداته.

بل يحصل على مكافآت مقابل الاستمرارية.

الفكرة الأساسية:

اكمل عاداتك
↓
احصل على نقاط
↓
حافظ على الاستمرارية
↓
اجمع نقاط أكثر
↓
استبدل النقاط بمكافآت

المكافآت قد تكون:

رصيد مالي

Cashback

قسائم شراء

خصومات

هدايا

اشتراكات Premium

مكافآت يقدمها شركاء تجاريون

يجب أن يشعر المستخدم أن الالتزام بعاداته يحقق له فائدتين:

1. تحسين حياته.
2. الحصول على مكافآت حقيقية.

الرسالة الرئيسية للمنتج:

Build Better Habits. Earn Real Rewards.

بالعربية:

كوّن عادات أفضل. واكسب مكافآت حقيقية.

==================================================
02 — الهدف من المنتج
==================================================

الهدف من HabitGo هو مساعدة المستخدم على:

إنشاء عادات جديدة.

الالتزام بها.

متابعة تقدمه.

رؤية Streaks.

الحصول على Motivation.

تحقيق Goals.

الحصول على نقاط مقابل الاستمرارية.

تحويل النقاط إلى مكافآت.

الاستمرار لفترات طويلة بدل استخدام التطبيق عدة أيام ثم تركه.

التطبيق يجب أن يحول عملية Habit Tracking إلى تجربة فيها:

Progress

Achievement

Motivation

Gamification

Rewards

==================================================
03 — الفئة المستهدفة
==================================================

التطبيق مناسب بشكل أساسي للأشخاص من عمر:

16–40 سنة

خصوصًا:

الطلاب

الموظفين

الأشخاص المهتمين بالصحة

الأشخاص الذين يريدون تحسين إنتاجيتهم

الأشخاص الذين يمارسون الرياضة

الأشخاص الذين يتعلمون مهارات جديدة

الأشخاص الذين يريدون تنظيم حياتهم اليومية

==================================================
04 — شخصية البراند
==================================================

HabitGo يجب أن يشعر المستخدم بأنه:

إيجابي

محفز

حديث

بسيط

ودود

ذكي

نظيف

ممتع بدون أن يكون طفوليًا

حديث تقنيًا

مرتبط بالتقدم والإنجاز

لا أريد التطبيق بشكل طبي أو رسمي جدًا.

ولا أريده بشكل Game مبالغ فيه.

أريد توازنًا بين:

Productivity App

+

Lifestyle App

+

Gamification

+

Rewards Platform

==================================================
05 — الهوية البصرية
==================================================

الهوية الأساسية لـ HabitGo يجب أن تعتمد على اللون الأخضر.

الأخضر هو اللون الرئيسي لأنه يعبر عن:

النمو

التقدم

الاستمرارية

العادات الصحية

الإنجاز

التغيير الإيجابي

المكافآت

استخدم اللون الأخضر بشكل حديث وهادئ، وليس بشكل فاقع أو طبي.

الاتجاه البصري:

Modern Green

Clean

Fresh

Motivational

Friendly

Premium

Simple

استخدم الأبيض والمساحات النظيفة في Light Mode.

وفي Dark Mode استخدم خلفيات داكنة مع Green Accents واضحة.

==================================================
06 — نظام الألوان Light Mode
==================================================

Primary Green:

#22C55E

Primary Dark:

#16A34A

Primary Light:

#4ADE80

Soft Green:

#DCFCE7

Very Soft Green:

#F0FDF4

Secondary Teal:

#14B8A6

Reward Gold:

#F5B942

Background:

#F8FAF9

Surface:

#FFFFFF

Secondary Surface:

#F1F5F3

Primary Text:

#17201B

Secondary Text:

#66736B

Muted Text:

#98A29C

Border:

#E1E8E3

Success:

#22C55E

Warning:

#F59E0B

Error:

#EF4444

Info:

#3B82F6

==================================================
07 — نظام الألوان Dark Mode
==================================================

Dark Background:

#0D1210

Secondary Background:

#121815

Surface:

#18201C

Elevated Surface:

#202A24

Primary Green:

#34D66B

Primary Light:

#5BE584

Secondary Teal:

#2DD4BF

Reward Gold:

#F8C14C

Primary Text:

#F7FAF8

Secondary Text:

#ABB6AF

Muted Text:

#7C8981

Border:

#2A342E

Success:

#34D66B

Warning:

#F8C14C

Error:

#FF6B6B

Info:

#60A5FA

==================================================
08 — استخدام الألوان
==================================================

استخدم الأخضر الأساسي في:

Primary Buttons

Progress

Habit Completion

Selected States

Streak Success

Points Earned

Positive Feedback

Active Navigation

Charts

Achievement Progress

استخدم الأخضر الفاتح في:

Cards Background

Selected Chips

Soft Highlights

Empty State Illustrations

استخدم الذهبي في:

Rewards

Bonus Points

Gift Cards

Special Achievements

Premium Rewards

لا تستخدم الذهبي كلون أساسي للتطبيق.

الأخضر يجب أن يظل هو اللون الرئيسي.

==================================================
09 — Gradient
==================================================

استخدم Gradient أخضر بشكل بسيط فقط.

Primary Gradient:

#22C55E → #14B8A6

استخدمه في:

Hero Card

Progress Highlights

Special Achievement

Reward Success

App Icon

لا تستخدم Gradient في كل الكروت.

==================================================
10 — الإحساس المطلوب
==================================================

عند رؤية التطبيق يجب أن يشعر المستخدم بـ:

Freshness

Growth

Progress

Positive Energy

Reward

Trust

يجب أن يكون الأخضر واضحًا في الهوية لكن مع الحفاظ على White Space جيد.

لا تجعل التصميم يبدو مثل تطبيق بنك أو تطبيق طبي.

الهوية يجب أن تكون:

Lifestyle + Productivity + Rewards.

==================================================
11 — التايبوجرافي
==================================================

التطبيق يجب أن يعمل بالعربية والإنجليزية.

العربية:

استخدم:

Alexandria

أو:

IBM Plex Sans Arabic

الاختيار الأساسي:

Alexandria

الإنجليزية:

استخدم:

Inter

أو:

Manrope

الاختيار الأساسي:

Inter

Typography Scale:

Display:
32–36px Bold

Page Title:
26–28px Bold

Section Title:
20–22px SemiBold

Card Title:
16–18px SemiBold

Body:
14–16px Regular

Label:
13–14px Medium

Caption:
11–12px Regular

يجب مراعاة:

RTL للعربية.

LTR للإنجليزية.

وأن تتغير أماكن العناصر والأيقونات والتنقل بشكل صحيح عند تغيير اللغة.

==================================================
12 — اللوجو
==================================================

حافظ على اسم:

HabitGo

أنشئ Logo بسيط وحديث.

يمكن دمج:

H

Check Mark

Progress

Habit Loop

Streak

Reward

لكن بدون تعقيد.

يجب إنشاء:

Primary Logo

Logo Mark

App Icon

Light Logo

Dark Logo

Monochrome Logo

==================================================
13 — Design System
==================================================

قبل بناء الشاشات، أنشئ Design System كامل وقابل لإعادة الاستخدام.

يجب أن يحتوي على:

Colors

Typography

Spacing

Grid

Radius

Shadows

Icons

Buttons

Inputs

Navigation

Cards

Progress Components

Charts

Badges

Chips

Tabs

Dropdowns

Bottom Sheets

Modals

Alerts

Snackbars

Toasts

Checkboxes

Radio Buttons

Switches

Calendar

Date Picker

Time Picker

Habit Cards

Reward Cards

Wallet Cards

Transaction Cards

Achievement Cards

Statistics Cards

Empty States

Loading States

Skeletons

Error States

Success States

==================================================
14 — Spacing System
==================================================

استخدم 8pt Grid System.

القيم:

4

8

12

16

24

32

40

48

64

==================================================
15 — Border Radius
==================================================

Small:
8px

Medium:
12px

Large:
16px

XL:
20px

2XL:
24px

Pill:
999px

==================================================
16 — Button System
==================================================

أنشئ:

Primary Button

Secondary Button

Outline Button

Ghost Button

Text Button

Danger Button

Icon Button

Floating Action Button

States:

Default

Pressed

Loading

Disabled

Success

==================================================
17 — التطبيق ثنائي اللغة
==================================================

التطبيق يجب أن يدعم:

العربية

English

بشكل كامل.

ليس مجرد ترجمة Text.

يجب دعم:

RTL

LTR

Dynamic Layout Direction

ترجمة جميع الشاشات.

ترجمة Notifications.

ترجمة Errors.

ترجمة Empty States.

ترجمة Validation Messages.

ترجمة Onboarding.

يمكن تغيير اللغة من Settings بدون حذف بيانات المستخدم.

==================================================
18 — Light / Dark
==================================================

التطبيق يجب أن يدعم:

Light Mode

Dark Mode

System Default

كل Component يجب أن يكون له:

Light Version

Dark Version

لا تستخدم Invert تلقائي للألوان.

اعمل Tokens فعلية لكل Theme.

احفظ اختيار المستخدم.

==================================================
19 — Splash Screen
==================================================

أنشئ Splash Screen بسيطة.

Logo:

HabitGo

Tagline:

Build Better Habits.
Earn Real Rewards.

العربية:

كوّن عادات أفضل.
واكسب مكافآت حقيقية.

==================================================
20 — Onboarding
==================================================

أنشئ Onboarding من 4 شاشات.

الشاشة الأولى:

العنوان:

ابنِ عادات أفضل

الوصف:

ابدأ عادات جديدة وحافظ عليها بخطوات بسيطة كل يوم.

الشاشة الثانية:

العنوان:

تابع تقدمك

الوصف:

شاهد تقدمك، أيام الاستمرارية، ونسبة تحقيق أهدافك.

الشاشة الثالثة:

العنوان:

اكسب نقاط

الوصف:

كلما التزمت بعاداتك، تحصل على نقاط ومكافآت أكثر.

الشاشة الرابعة:

العنوان:

حوّل التقدم إلى مكافآت

الوصف:

استخدم نقاطك للحصول على خصومات وهدايا ومكافآت.

CTA:

ابدأ الآن

==================================================
21 — Authentication
==================================================

أنشئ Authentication حقيقي.

الخيارات:

Email

Phone

Google

Apple عند توفره

الشاشات:

Create Account

Login

Forgot Password

OTP

Reset Password

Logout

Delete Account

البيانات تحفظ في Backend فعلي.

==================================================
22 — إنشاء الحساب
==================================================

المعلومات:

Name

Email

Phone

Password

Date of Birth optional

Gender optional

Country

City optional

Language

Theme

لا تطلب معلومات غير ضرورية.

==================================================
23 — Personalization
==================================================

بعد إنشاء الحساب:

اسأل المستخدم:

ما الذي تريد تحسينه؟

الاختيارات:

الصحة

الرياضة

الإنتاجية

التعلم

القراءة

الصحة النفسية

النوم

المال

العلاقات

التطوير الشخصي

يمكن اختيار أكثر من Category.

==================================================
24 — Navigation
==================================================

Bottom Navigation مقترحة:

الرئيسية

عاداتي

+

المكافآت

حسابي

زر +:

إضافة عادة

==================================================
25 — الصفحة الرئيسية
==================================================

Home Dashboard يجب أن تحتوي على:

Greeting

مثال:

صباح الخير يا Peter 👋

Progress اليوم.

عدد العادات المكتملة.

عدد النقاط المكتسبة اليوم.

Current Streak.

Quick Add Habit.

Today's Habits.

Daily Goal.

Weekly Progress.

Reward Progress.

Motivational Message.

==================================================
26 — Today's Progress
==================================================

أنشئ دائرة Progress كبيرة.

مثال:

3 من 5 عادات مكتملة

60%

اعرض:

Today's Points:

+120 Points

Current Streak:

🔥 7 Days

==================================================
27 — Habit Categories
==================================================

Categories:

صحة

رياضة

تعلم

قراءة

عمل

إنتاجية

مال

نوم

تأمل

شرب المياه

تغذية

علاقات

تطوير شخصي

أخرى

كل Category لها Icon بسيط.

==================================================
28 — إنشاء عادة جديدة
==================================================

أنشئ Flow كامل:

Add Habit

المستخدم يحدد:

Habit Name

Category

Icon

Color

Description optional

Frequency

Days

Time

Reminder

Goal

Start Date

End Date optional

Difficulty

Reward Points

==================================================
29 — أنواع Frequency
==================================================

Every Day

Specific Days

X Times Per Week

X Times Per Month

Custom

مثال:

قراءة كتاب

كل يوم

20 دقيقة

الساعة 9 مساءً

==================================================
30 — أنواع Habits
==================================================

دعم نوعين رئيسيين:

Binary Habit

مثال:

قرأت اليوم؟

نعم / لا

Quantitative Habit

مثال:

شرب المياه

الهدف:

8 أكواب

المستخدم يزيد Progress:

1 / 8

2 / 8

...

8 / 8

==================================================
31 — Habit Card
==================================================

كل Habit Card تحتوي على:

Icon

Habit Name

Category

Progress

Streak

Points

Reminder

Completion Button

مثال:

📖 القراءة

20 دقيقة

🔥 12 يوم

+30 نقطة

CTA:

تم

==================================================
32 — Habit Details
==================================================

عند فتح Habit:

اعرض:

اسم العادة

الوصف

Start Date

Frequency

Reminder

Current Streak

Best Streak

Total Completed

Completion Rate

Points Earned

Calendar

Weekly Graph

Monthly Graph

History

Edit Habit

Pause Habit

Delete Habit

==================================================
33 — Streak System
==================================================

أنشئ نظام Streak.

مثال:

3 أيام

7 أيام

14 يوم

30 يوم

60 يوم

100 يوم

365 يوم

عند الوصول Milestone:

اعرض Celebration.

مثال:

🔥 30 Day Streak!

العربية:

رائع!
حافظت على عادتك لمدة 30 يوم.

==================================================
34 — Points System
==================================================

نظام النقاط هو جزء أساسي جدًا من التطبيق.

كل عادة لها Points.

مثال:

Easy Habit:

10 Points

Medium:

20 Points

Hard:

30 Points

يمكن إضافة Bonus.

مثال:

7 Day Streak:

+50 Bonus

30 Day Streak:

+250 Bonus

Perfect Week:

+100 Bonus

Perfect Month:

+500 Bonus

==================================================
35 — منطق احتساب النقاط
==================================================

لا تعتمد على Client فقط في إضافة النقاط.

المنطق الصحيح:

User completes Habit

↓

Client sends completion request

↓

Backend validates completion

↓

Backend creates Habit Log

↓

Backend calculates Points

↓

Backend creates Points Transaction

↓

Backend updates Wallet

↓

Backend updates Streak

↓

Backend returns new state

↓

UI displays:

+20 Points 🎉

==================================================
36 — Anti-Cheat / Reward Protection
==================================================

بما أن النقاط يمكن أن تتحول إلى مكافآت لها قيمة، لا تجعل النظام يعتمد فقط على ضغط المستخدم على Completed بدون أي ضوابط.

في نسخة MVP:

اعمل Limits.

مثال:

عدد معين من النقاط يوميًا.

عدم تعديل Completion القديم بعد فترة محددة.

منع تسجيل العادة عدة مرات بشكل غير منطقي.

تسجيل Activity Log.

الاحتفاظ بتاريخ كل Point Transaction.

صمم البنية بحيث يمكن لاحقًا إضافة:

Verification

Wearable Data

Health Integrations

Partner Validation

Location Validation

Photo Proof

لكن لا تجعلها إلزامية في MVP.

==================================================
37 — Wallet
==================================================

أنشئ:

HabitGo Wallet

يعرض:

Available Points

Pending Points

Lifetime Points

Redeemed Points

Estimated Reward Value

مثال:

4,850 Points

Available

القيمة التقديرية:

48.50

يجب جعل Conversion Rate قابلًا للتعديل من لوحة الإدارة وليس Hardcoded.

مثال تجريبي:

100 Points = 1 Reward Unit

لكن يجب أن يكون Admin قادرًا على تغييره.

==================================================
38 — Points Transactions
==================================================

اعرض Transaction History.

مثال:

Morning Workout

+30 Points

7 Day Streak

+50 Points

Redeemed Gift

-1000 Points

Referral Bonus

+200 Points

كل Transaction لها:

ID

Type

Points

Date

Status

Source

==================================================
39 — Rewards Marketplace
==================================================

أنشئ Rewards Marketplace.

Categories:

Cash Rewards

Gift Cards

Discounts

Food

Shopping

Fitness

Entertainment

Subscriptions

Premium

Charity optional

==================================================
40 — Reward Card
==================================================

يحتوي على:

Brand Logo

Reward Image

Reward Name

Description

Required Points

Expiry Date optional

Availability

CTA:

استبدل

مثال:

خصم 20%

500 نقطة

==================================================
41 — استبدال النقاط
==================================================

Reward Flow:

Rewards

↓

Choose Reward

↓

Reward Details

↓

Points Required

↓

Confirm

↓

Redeem

↓

Success

↓

Transaction

إذا الرصيد غير كافٍ:

اعرض:

تحتاج إلى 350 نقطة إضافية.

==================================================
42 — Cash Rewards
==================================================

لأن النظام يمكن أن يحتوي على تحويل النقاط إلى قيمة مالية:

في مرحلة الاختبار/MVP:

لا تنفذ تحويل أموال حقيقي إذا لم تتوفر Payment Credentials أو متطلبات قانونية.

بدل ذلك:

أنشئ Cash Redemption Request.

المستخدم يختار:

Amount

يتم خصم النقاط أو وضعها Pending حسب النظام.

Status:

Pending

Approved

Rejected

Completed

Admin يمكنه مراجعة الطلب.

اجعل Architecture جاهزة لاحقًا لربط:

Payment Gateway

Digital Wallet

Bank Transfer

بدون ربط حقيقي في النسخة التجريبية إلا إذا تم توفير Credentials.

==================================================
43 — Gift Rewards
==================================================

يمكن للمستخدم استبدال النقاط بـ:

Gift Cards

Voucher Codes

Discount Coupons

Physical Gifts

Premium Subscription

Partner Offers

==================================================
44 — Reward Details
==================================================

اعرض:

Reward Name

Partner

Description

Points

Terms

Expiry

Availability

Redemption Instructions

CTA:

استبدل الآن

==================================================
45 — Gamification
==================================================

أضف Gamification بشكل متوازن.

XP

Levels

Badges

Achievements

Streaks

Challenges

Milestones

لكن لا تجعل التطبيق يبدو Game.

==================================================
46 — Levels
==================================================

مثال:

Level 1
Starter

Level 2
Builder

Level 3
Consistent

Level 4
Achiever

Level 5
Master

المستخدم يحصل على XP من:

Completing Habits

Maintaining Streaks

Challenges

Achievements

==================================================
47 — Achievements
==================================================

Achievements:

First Habit

First Week

7 Day Streak

30 Day Streak

100 Habits Completed

Perfect Week

Early Bird

Fitness Hero

Reading Master

Habit Master

Reward Collector

==================================================
48 — Challenges
==================================================

أنشئ Challenges.

مثال:

7-Day Reading Challenge

30-Day Fitness Challenge

Drink Water Challenge

No Sugar Week

Meditation Week

عند الاشتراك:

يظهر Progress.

عند الإنجاز:

Points Bonus.

==================================================
49 — Statistics
==================================================

صفحة Statistics تحتوي على:

Completion Rate

Current Streaks

Best Streak

Habits Completed

Weekly Progress

Monthly Progress

Points Earned

Most Successful Habit

Least Successful Habit

Category Performance

==================================================
50 — الرسوم البيانية
==================================================

استخدم Charts بسيطة وواضحة:

Weekly Bar Chart

Monthly Line Chart

Completion Donut

Calendar Heatmap

لا تستخدم Graphs معقدة.

==================================================
51 — Calendar
==================================================

اعمل Calendar View.

كل يوم:

Completed

Partially Completed

Missed

Future

يمكن فتح اليوم لمشاهدة Habits.

==================================================
52 — Reminders
==================================================

دعم Local Notifications.

المستخدم يحدد:

Time

Days

Message optional

مثال:

حان وقت القراءة 📖

لا تنس تمرينك اليوم 💪

==================================================
53 — Notifications Center
==================================================

Notifications تشمل:

Habit Reminder

Streak Reminder

Achievement

Reward Available

Reward Approved

New Challenge

Bonus Points

System Notification

==================================================
54 — Motivation
==================================================

اعرض Motivational Messages لكن بدون مبالغة.

مثال:

باقي عادة واحدة وتكمل يومك 🎯

7 أيام متتالية! استمر 🔥

كسبت 50 نقطة إضافية.

==================================================
55 — Missed Habit
==================================================

إذا لم يكمل المستخدم عادة:

لا تستخدم لغة محبطة.

مثال:

فاتك يوم، لكن تقدر تكمل من النهارده.

CTA:

ابدأ من جديد

==================================================
56 — Profile
==================================================

اعرض:

Profile Photo

Name

Level

XP

Current Streak

Total Points

Total Rewards

Joined Date

Achievements

Settings

==================================================
57 — Settings
==================================================

Settings:

Account

Language

Theme

Notifications

Privacy

Security

Reward Settings

Data Export

Help

About

Logout

Delete Account

==================================================
58 — Search
==================================================

Search يمكن أن يبحث في:

Habits

Rewards

Challenges

Help Articles

==================================================
59 — Empty States
==================================================

أنشئ Empty States احترافية.

مثال:

لسه معندكش عادات.

ابدأ أول عادة النهارده.

CTA:

أضف أول عادة

Rewards Empty:

لا توجد مكافآت متاحة حاليًا.

==================================================
60 — Loading
==================================================

استخدم:

Skeleton Loading

Progress Indicators

Pull to Refresh

Pagination عند الحاجة.

==================================================
61 — Offline Behavior
==================================================

التطبيق يجب أن يتحمل ضعف الإنترنت.

اسمح بعرض بيانات المستخدم المخزنة محليًا.

Habit completion يمكن تسجيله محليًا ثم Sync عند عودة الإنترنت، مع حماية من تكرار Transactions.

==================================================
62 — قاعدة البيانات
==================================================

أنشئ Database Schema حقيقي.

الجداول المقترحة:

users

profiles

habits

habit_categories

habit_schedules

habit_logs

streaks

points_wallets

points_transactions

rewards

reward_categories

reward_partners

reward_redemptions

achievements

user_achievements

challenges

challenge_participants

notifications

user_settings

devices

audit_logs

==================================================
63 — Habit Table
==================================================

يحتوي مثلًا على:

id

user_id

name

description

category_id

icon

color

type

goal_value

goal_unit

difficulty

points

start_date

end_date

is_active

created_at

updated_at

==================================================
64 — Habit Logs
==================================================

habit_logs:

id

habit_id

user_id

date

target

completed_value

status

points_earned

created_at

updated_at

==================================================
65 — Points Transactions
==================================================

كل تغيير في الرصيد يجب أن يسجل Transaction.

لا تعدل Wallet Balance فقط بدون Transaction History.

Fields:

id

user_id

type

source_type

source_id

points

status

description

created_at

==================================================
66 — Reward Redemption
==================================================

Fields:

id

user_id

reward_id

points_cost

status

redemption_code

requested_at

approved_at

completed_at

==================================================
67 — Backend
==================================================

استخدم Backend حقيقي.

الخيار المقترح:

Supabase

لاستخدام:

Authentication

PostgreSQL

Storage

Realtime عند الحاجة

Row Level Security

إذا وجدت Stack آخر أكثر توافقًا مع بيئة التنفيذ يمكنك استخدامه، لكن اشرح السبب.

لا تستخدم بيانات Mock فقط.

==================================================
68 — Security
==================================================

طبق:

Authentication

Authorization

Row Level Security

Secure API Access

Input Validation

Rate Limiting عندما يكون مناسبًا

Secure Storage

لا تضع:

API Secrets

Service Keys

Passwords

داخل الكود Client Side.

استخدم Environment Variables.

==================================================
69 — إدارة المكافآت
==================================================

يجب أن تكون Rewards قابلة للإدارة من Backend.

يجب إمكانية:

إضافة Reward

تعديل Reward

إيقاف Reward

تغيير Required Points

تغيير Quantity

تحديد تاريخ انتهاء

تحديد Partner

تحديد Country

مراجعة Redemption

==================================================
70 — Admin
==================================================

أنشئ Admin Area بسيطة إذا أمكن.

تحتوي على:

Users

Habits Analytics

Points Transactions

Rewards

Reward Redemptions

Cash Requests

Challenges

Notifications

System Settings

Conversion Rate

==================================================
71 — Conversion Settings
==================================================

لا تجعل:

Points → Money

ثابتة داخل التطبيق.

أنشئ Setting.

مثال:

points_per_reward_unit = 100

ويمكن تغييره من Admin.

==================================================
72 — بيانات تجريبية
==================================================

أنشئ Seed Data.

User تجريبي:

Name:

Peter

Habits:

Drink Water

Morning Workout

Read 20 Minutes

Learn English

Sleep Before 11 PM

مثال للـPoints:

4850

Streak:

12 Days

Level:

3

==================================================
73 — Rewards Seed Data
==================================================

أنشئ أمثلة:

Coffee Voucher

500 Points

20% Fitness Discount

750 Points

Shopping Gift Card

1500 Points

1 Month Premium

2000 Points

Cash Reward Request

5000 Points

اجعلها واضحة بأنها بيانات تجريبية.

==================================================
74 — التطبيق التفاعلي
==================================================

كل العناصر الأساسية يجب أن تعمل.

لا أريد:

Buttons بدون Actions.

Screens بدون Navigation.

Fake Forms.

Static Statistics فقط.

التطبيق يجب أن يسمح فعليًا بـ:

Register

Login

Create Habit

Edit Habit

Delete Habit

Complete Habit

Update Progress

Earn Points

Update Streak

View Transactions

Browse Rewards

Redeem Reward

Join Challenge

Change Language

Change Theme

Edit Profile

Logout

Login Again

والبيانات تظل محفوظة.

==================================================
75 — Flow أساسي يجب أن يعمل
==================================================

Login

↓

Home

↓

Add Habit

↓

Habit Name:

Read 20 Minutes

↓

Every Day

↓

9 PM

↓

Reward:

20 Points

↓

Save

↓

Habit appears in Today

↓

Complete Habit

↓

Progress Animation

↓

+20 Points

↓

Wallet Updated

↓

Transaction Added

↓

Streak Updated

==================================================
76 — Reward Flow يجب أن يعمل
==================================================

Rewards

↓

Select Reward

↓

View Details

↓

Redeem

↓

Confirmation

↓

Points Validation

↓

Points Deducted

↓

Transaction Created

↓

Redemption Created

↓

Success Screen

==================================================
77 — Theme Flow
==================================================

Settings

↓

Appearance

↓

Dark

↓

التطبيق بالكامل يتحول إلى Dark Theme

↓

أغلق التطبيق

↓

افتحه

↓

يظل Dark

==================================================
78 — Language Flow
==================================================

Settings

↓

Language

↓

العربية

↓

RTL

↓

كل التطبيق بالعربية

↓

Switch إلى English

↓

LTR

↓

كل النصوص تتحول للإنجليزية

يجب حفظ اختيار المستخدم.

==================================================
79 — الإشعارات
==================================================

Local Notifications يجب أن تعمل في APK إن أمكن.

جرّب:

Habit Reminder

مثال:

الساعة 9 مساءً

وقت القراءة 📖

==================================================
80 — التقنية
==================================================

اختر Stack مناسب لبناء تطبيق Cross Platform حقيقي.

أفضلية:

Flutter

أو

React Native

اختر الأفضل حسب بيئة الـAgent.

الأهم:

Android Build

Clean Architecture

Reusable Components

Theme System

Localization

Backend Integration

State Management

Error Handling

==================================================
81 — جودة الكود
==================================================

استخدم:

Modular Architecture

Reusable Components

Centralized Theme Tokens

Centralized Localization

Repository / Service Pattern

Clear Naming

Comments فقط عندما تكون مفيدة

Error Handling

لا تكرر Business Logic داخل أكثر من Screen.

==================================================
82 — Cloud
==================================================

ارفع المشروع على Cloud بحيث يمكن تعديله لاحقًا.

المطلوب:

Source Code محفوظ في Git Repository.

Backend مستضاف Online.

Database Online.

Environment Variables documented.

README كامل.

Build Instructions.

Project Structure Documentation.

إذا أمكن:

أنشئ GitHub Repository.

واستخدم Supabase Cloud للـBackend.

إذا لم يكن GitHub متاحًا:

استخدم Git Repository / Cloud Workspace المتاح في بيئة الـAgent.

لا تجعل المشروع موجودًا فقط داخل Session مؤقتة.

==================================================
83 — README
==================================================

أنشئ README يحتوي على:

Project Overview

Features

Architecture

Tech Stack

Folder Structure

Environment Variables

Backend Setup

Database Setup

How to Run

How to Build Android

How to Generate APK

Test Accounts

Known Limitations

Future Improvements

==================================================
84 — APK
==================================================

في نهاية المشروع:

قم بإنشاء Android APK قابل للتثبيت.

أفضل:

Release APK

إذا تعذر ذلك:

Debug APK صالح للاختبار.

اختبر أن APK:

يفتح.

Login يعمل.

التنقل يعمل.

Habits تعمل.

Points تعمل.

Rewards تعمل.

Theme يعمل.

Language يعمل.

==================================================
85 — Testing
==================================================

اختبر التطبيق قبل اعتباره مكتملًا.

اختبر:

Registration

Login

Logout

Forgot Password

Add Habit

Edit Habit

Delete Habit

Complete Habit

Quantitative Habit

Streak

Points

Rewards

Redemption

Challenges

Notifications

Arabic

English

RTL

LTR

Light

Dark

Offline

Restart App

Database Persistence

Invalid Form Data

Insufficient Points

Network Error

Empty States

Loading

==================================================
86 — Test Accounts
==================================================

أنشئ حساب مستخدم تجريبي.

وأعطني بيانات الدخول في README.

أنشئ أيضًا:

Admin Test Account

إذا تم إنشاء Admin Panel.

==================================================
87 — Error Handling
==================================================

لا تظهر Errors تقنية للمستخدم.

بدل:

Network Error 500

استخدم:

حدث خطأ أثناء الاتصال.
حاول مرة أخرى.

مع زر:

إعادة المحاولة

==================================================
88 — Analytics Architecture
==================================================

جهز Architecture لإضافة Analytics مستقبلًا.

Events مثل:

habit_created

habit_completed

streak_reached

reward_viewed

reward_redeemed

challenge_joined

language_changed

theme_changed

ليس ضروريًا ربط خدمة مدفوعة في MVP إذا لم تتوفر Credentials.

==================================================
89 — Privacy
==================================================

أنشئ:

Privacy Policy Placeholder

Terms Placeholder

Delete My Account

Export My Data

Account Security

==================================================
90 — Performance
==================================================

حسن:

Startup Time

Image Loading

List Performance

Database Queries

Caching

Avoid unnecessary re-renders

Compress Assets

==================================================
91 — Accessibility
==================================================

التزم بـ:

Readable Contrast

Touch Targets

Screen Reader Labels

Dynamic Text where possible

عدم الاعتماد على اللون وحده

RTL Accessibility

==================================================
92 — الشاشات المطلوبة
==================================================

أنشئ على الأقل:

Splash

Onboarding

Login

Sign Up

OTP

Forgot Password

Personalization

Home

Today's Habits

All Habits

Habit Details

Add Habit

Edit Habit

Calendar

Statistics

Achievements

Challenges

Challenge Details

Rewards

Reward Categories

Reward Details

Wallet

Points Transactions

Redeem Confirmation

Redemption Success

Redemption History

Notifications

Profile

Edit Profile

Settings

Language

Appearance

Notification Settings

Privacy

Help

Empty States

Error States

Loading States

==================================================
93 — Design Deliverables
==================================================

أريد Design System كامل داخل المشروع.

ويجب توحيد:

Colors

Typography

Spacing

Components

Themes

Icons

States

لا تنشئ كل Screen Style منفصل.

==================================================
94 — حالات Components
==================================================

كل Component مهم يجب أن يغطي:

Default

Pressed

Focused

Selected

Disabled

Loading

Error

Success

Empty

عندما يكون ذلك مناسبًا.

==================================================
95 — Reward Logic
==================================================

يجب أن يكون Business Logic الخاص بالمكافآت موجودًا في Backend قدر الإمكان.

لا تعتمد على Client فقط في:

Adding Points

Redeeming Points

Changing Wallet Balance

Conversion Rate

Reward Availability

لحماية النظام من التلاعب.

==================================================
96 — المستقبل
==================================================

صمم Architecture بحيث يمكن لاحقًا إضافة:

Friends

Social Challenges

Leaderboards

Corporate Wellness Programs

Apple Health

Google Health Connect

Smart Watches

Partner Stores

Referral System

Premium Subscription

AI Habit Coach

لكن لا تجعل هذه الميزات تعطل إصدار MVP.

==================================================
97 — الأولوية
==================================================

رتب التنفيذ بهذه الأولوية:

Priority 1:

Authentication

Habits

Habit Tracking

Streaks

Points

Wallet

Rewards

Redemption

Arabic / English

Light / Dark

Priority 2:

Statistics

Achievements

Challenges

Notifications

Priority 3:

Admin

Advanced Features

==================================================
98 — لا تستخدم Placeholders غير الضرورية
==================================================

استخدم بيانات واقعية.

لا تستخدم Lorem Ipsum.

لا تترك:

TODO

Placeholder Screen

Coming Soon

لأي Feature أساسية.

إذا كانت Feature غير ضرورية للـMVP، وضح أنها Future Feature بدل بناء شاشة وهمية لها.

==================================================
99 — Final UI Quality
==================================================

أريد UI High Fidelity وليس Wireframes.

التطبيق يجب أن يبدو مثل Startup Product حقيقي جاهز للعرض على مستخدمين.

استخدم:

Clean Layout

Modern Cards

Clear Hierarchy

Progress Visualization

Subtle Animations

Good Empty States

Reward Celebrations

Microinteractions

لا تبالغ في Animations.

==================================================
100 — المخرجات النهائية المطلوبة
==================================================

لا تعتبر المهمة مكتملة قبل توفير:

1. تطبيق Functional.

2. Design System كامل.

3. Arabic RTL.

4. English LTR.

5. Light Mode.

6. Dark Mode.

7. Authentication حقيقي.

8. Backend وقاعدة بيانات.

9. Habit Tracking حقيقي.

10. Streak System.

11. Points Wallet.

12. Transactions.

13. Rewards Marketplace.

14. Reward Redemption.

15. Seed Data.

16. Test Account.

17. Error / Loading / Empty States.

18. Source Code منظم.

19. Cloud Repository.

20. Hosted Backend.

21. README.

22. Environment Setup Documentation.

23. APK قابل للتثبيت.

24. اختبار التدفقات الأساسية.

==================================================
101 — لا تتوقف عند التصميم
==================================================

مهم جدًا:

لا تتوقف بعد إنشاء UI.

لا تعطِني فقط Screens.

لا تعطِني صورًا للتطبيق.

لا تعطِني Prototype غير Functional.

بعد اعتماد Design System:

انتقل مباشرة لبناء التطبيق الحقيقي وربطه بالـBackend.

كل الوظائف الأساسية يجب أن تكون قابلة للاستخدام والاختبار.

==================================================
102 — طريقة التنفيذ
==================================================

ابدأ بهذا الترتيب:

1. تحليل المتطلبات.

2. إنشاء Information Architecture.

3. إنشاء Database Schema.

4. إنشاء Design System.

5. إنشاء التطبيق والـNavigation.

6. Authentication.

7. Habit Management.

8. Tracking & Streak Logic.

9. Points System.

10. Wallet.

11. Rewards.

12. Redemption.

13. Statistics.

14. Localization.

15. Themes.

16. Notifications.

17. Backend Security.

18. Seed Data.

19. Testing.

20. Fix bugs.

21. Cloud deployment.

22. Generate APK.

23. Final verification.

لا تطلب موافقتي بعد كل خطوة إلا إذا كان هناك قرار ضروري يمنع التنفيذ.

اتخذ قرارات UX وتقنية منطقية بنفسك وحافظ على اتساق المنتج.

==================================================
103 — النتيجة المطلوبة
==================================================

عندما أنتهي من تجربة HabitGo، يجب أن أكون قادرًا على:

تحميل APK.

تثبيت التطبيق.

إنشاء حساب.

تسجيل الدخول.

تغيير التطبيق للعربية أو الإنجليزية.

استخدامه RTL أو LTR.

اختيار Light أو Dark.

إضافة عادة.

تعديل العادة.

إكمال العادة.

رؤية Streak يزيد.

الحصول على نقاط.

فتح Wallet.

رؤية Transaction.

فتح Rewards.

استبدال Reward تجريبية.

رؤية خصم النقاط.

فتح الإحصائيات.

الحصول على Achievement.

استقبال Reminder.

إغلاق التطبيق وفتحه مرة أخرى.

والعثور على كل البيانات ما زالت محفوظة.

يجب أن يشعر التطبيق وكأنه نسخة MVP حقيقية جاهزة لاختبار المستخدمين وليس مجرد Concept.

HabitGo

كوّن عادات أفضل.
واكسب مكافآت حقيقية.