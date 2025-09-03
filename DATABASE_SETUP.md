# إعداد قاعدة البيانات - Database Setup

هذا الدليل يشرح كيفية إعداد قاعدة البيانات لنظام عروض الأسعار.

## المتطلبات - Requirements

- حساب Supabase (مجاني)
- PostgreSQL 12+ (إذا كنت تستخدم قاعدة بيانات محلية)

## الطريقة الأولى: استخدام Supabase (موصى بها)

### 1. إنشاء مشروع جديد
1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ حساب جديد أو سجل دخول
3. انقر على "New Project"
4. اختر اسم المشروع والمنطقة
5. انتظر حتى يتم إنشاء المشروع

### 2. تنفيذ SQL Schema
1. اذهب إلى "SQL Editor" في لوحة تحكم Supabase
2. انسخ محتوى ملف `database_schema.sql`
3. الصق الكود في المحرر
4. انقر على "Run" لتنفيذ الكود

### 3. الحصول على بيانات الاتصال
1. اذهب إلى "Settings" > "API"
2. انسخ:
   - `Project URL` (SUPA_URL)
   - `anon public` key (SUPA_ANON_KEY)

### 4. تكوين التطبيق
1. انسخ ملف `config.example.js` إلى `config.js`
2. املأ البيانات:
```javascript
window.SUPA_URL = 'https://your-project.supabase.co';
window.SUPA_ANON_KEY = 'your-anon-key';
window.TENANT = 'your-company-id'; // معرف فريد لشركتك
```

## الطريقة الثانية: PostgreSQL محلي

### 1. تثبيت PostgreSQL
- Windows: حمل من [postgresql.org](https://www.postgresql.org/download/windows/)
- macOS: `brew install postgresql`
- Ubuntu: `sudo apt install postgresql postgresql-contrib`

### 2. إنشاء قاعدة البيانات
```sql
CREATE DATABASE quotes_system;
\c quotes_system;
```

### 3. تنفيذ Schema
```bash
psql -d quotes_system -f database_schema.sql
```

### 4. إعداد API (اختياري)
ستحتاج لإعداد API خاص بك باستخدام:
- PostgREST
- Hasura
- أو تطوير API مخصص

## هيكل الجدول - Table Structure

### `quotes_archive`

| العمود | النوع | الوصف |
|--------|-------|-------|
| `id` | BIGSERIAL | المعرف الفريد |
| `tenant` | VARCHAR(100) | معرف المستأجر |
| `date` | DATE | تاريخ العرض |
| `place` | VARCHAR(255) | موقع الخدمة |
| `client` | VARCHAR(255) | اسم العميل |
| `status` | VARCHAR(50) | حالة العرض |
| `unit_type` | VARCHAR(255) | نوع الوحدة |
| `units_count` | INTEGER | عدد الوحدات |
| `subtotal` | DECIMAL(15,2) | المبلغ الفرعي |
| `currency` | VARCHAR(10) | العملة |
| `discount` | DECIMAL(15,2) | الخصم |
| `discount_type` | VARCHAR(20) | نوع الخصم |
| `tax_mode` | VARCHAR(20) | نمط الضريبة |
| `tax` | DECIMAL(5,2) | نسبة الضريبة |
| `pay_plan` | INTEGER | خطة الدفع |
| `p1` | DECIMAL(5,2) | نسبة الدفعة الأولى |
| `valid` | BOOLEAN | صالح لفترة محددة |
| `valid_days` | INTEGER | عدد أيام الصلاحية |
| `pay_to` | VARCHAR(255) | الدفع لصالح |
| `iban` | VARCHAR(50) | رقم الآيبان |
| `acct` | VARCHAR(100) | رقم الحساب |
| `signer` | VARCHAR(255) | اسم الموقع |
| `signer_phone` | VARCHAR(50) | هاتف الموقع |
| `bullets` | JSONB | نقاط الخدمة |
| `logo` | TEXT | شعار الشركة |
| `created_at` | TIMESTAMP | تاريخ الإنشاء |
| `updated_at` | TIMESTAMP | تاريخ التحديث |

## الفهارس - Indexes

- `idx_quotes_archive_tenant`: فهرس على معرف المستأجر
- `idx_quotes_archive_date`: فهرس على التاريخ
- `idx_quotes_archive_client`: فهرس على العميل
- `idx_quotes_archive_status`: فهرس على الحالة
- `idx_quotes_archive_tenant_date`: فهرس مركب
- `idx_quotes_archive_text_search`: فهرس البحث النصي

## الأمان - Security

### Row Level Security (RLS)
تم تفعيل RLS لضمان أن كل مستأجر يرى بياناته فقط.

### Multi-tenancy
يدعم النظام عدة مستأجرين من خلال حقل `tenant`.

## استكشاف الأخطاء - Troubleshooting

### خطأ في الاتصال
- تأكد من صحة `SUPA_URL` و `SUPA_ANON_KEY`
- تحقق من اتصال الإنترنت
- تأكد من أن المشروع نشط في Supabase

### خطأ في الصلاحيات
- تأكد من تفعيل RLS بشكل صحيح
- تحقق من سياسات الأمان
- تأكد من صحة `TENANT` في config.js

### خطأ في البيانات
- تحقق من صحة أنواع البيانات
- تأكد من وجود الحقول المطلوبة
- راجع console للأخطاء التفصيلية

## النسخ الاحتياطي - Backup

### Supabase
```bash
# تصدير البيانات
supabase db dump --file backup.sql

# استيراد البيانات
supabase db reset --file backup.sql
```

### PostgreSQL محلي
```bash
# إنشاء نسخة احتياطية
pg_dump quotes_system > backup.sql

# استعادة النسخة الاحتياطية
psql quotes_system < backup.sql
```

## الدعم - Support

للمساعدة أو الإبلاغ عن مشاكل:
1. راجع ملف README.md
2. تحقق من console المتصفح للأخطاء
3. راجع وثائق Supabase: [docs.supabase.com](https://docs.supabase.com)