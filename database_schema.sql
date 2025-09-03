-- ملف إنشاء قاعدة البيانات لنظام عروض الأسعار
-- Database Schema for Quote Management System

-- إنشاء جدول أرشيف عروض الأسعار
-- Create quotes_archive table
CREATE TABLE quotes_archive (
    -- المعرف الفريد للسجل
    id BIGSERIAL PRIMARY KEY,
    
    -- معرف المستأجر (Multi-tenancy support)
    tenant VARCHAR(100) NOT NULL,
    
    -- معلومات أساسية
    date DATE NOT NULL,
    place VARCHAR(255),
    client VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    
    -- معلومات الوحدات
    unit_type VARCHAR(255),
    units_count INTEGER DEFAULT 1,
    
    -- المعلومات المالية
    subtotal DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'SAR',
    discount DECIMAL(15,2) DEFAULT 0,
    discount_type VARCHAR(20) DEFAULT 'amount',
    tax_mode VARCHAR(20) DEFAULT 'exclusive',
    tax DECIMAL(5,2) DEFAULT 15,
    
    -- خطة الدفع
    pay_plan INTEGER DEFAULT 1,
    p1 DECIMAL(5,2),
    
    -- صلاحية العرض
    valid BOOLEAN DEFAULT false,
    valid_days INTEGER DEFAULT 30,
    
    -- معلومات الدفع
    pay_to VARCHAR(255),
    iban VARCHAR(50),
    acct VARCHAR(100),
    
    -- معلومات الموقع
    signer VARCHAR(255),
    signer_phone VARCHAR(50),
    
    -- البيانات المعقدة (JSON)
    bullets JSONB,
    logo TEXT,
    
    -- طوابع زمنية
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس لتحسين الأداء
-- Create indexes for better performance

-- فهرس على معرف المستأجر
CREATE INDEX idx_quotes_archive_tenant ON quotes_archive(tenant);

-- فهرس على التاريخ
CREATE INDEX idx_quotes_archive_date ON quotes_archive(date);

-- فهرس على العميل
CREATE INDEX idx_quotes_archive_client ON quotes_archive(client);

-- فهرس على الحالة
CREATE INDEX idx_quotes_archive_status ON quotes_archive(status);

-- فهرس مركب على المستأجر والتاريخ
CREATE INDEX idx_quotes_archive_tenant_date ON quotes_archive(tenant, date DESC);

-- فهرس للبحث النصي
CREATE INDEX idx_quotes_archive_text_search ON quotes_archive 
USING gin(to_tsvector('arabic', coalesce(client, '') || ' ' || coalesce(place, '') || ' ' || coalesce(unit_type, '')));

-- إنشاء دالة لتحديث updated_at تلقائياً
-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إنشاء trigger لتحديث updated_at
-- Create trigger to update updated_at
CREATE TRIGGER update_quotes_archive_updated_at 
    BEFORE UPDATE ON quotes_archive 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- إعداد Row Level Security (RLS) للأمان
-- Setup Row Level Security for multi-tenancy
ALTER TABLE quotes_archive ENABLE ROW LEVEL SECURITY;

-- سياسة الأمان: كل مستأجر يرى بياناته فقط
-- Security policy: Each tenant sees only their data
CREATE POLICY quotes_archive_tenant_policy ON quotes_archive
    FOR ALL
    USING (tenant = current_setting('app.current_tenant', true));

-- منح الصلاحيات للمستخدمين
-- Grant permissions (adjust as needed)
-- GRANT ALL ON quotes_archive TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE quotes_archive_id_seq TO your_app_user;

-- إدراج بيانات تجريبية (اختياري)
-- Insert sample data (optional)
/*
INSERT INTO quotes_archive (
    tenant, date, place, client, unit_type, units_count,
    subtotal, currency, discount, discount_type,
    tax_mode, tax, pay_plan, valid, valid_days,
    pay_to, iban, signer, signer_phone,
    bullets
) VALUES (
    'demo_tenant',
    '2024-01-15',
    'الرياض - حي النخيل',
    'شركة المثال للتجارة',
    'مكاتب إدارية',
    5,
    10000.00,
    'SAR',
    500.00,
    'amount',
    'exclusive',
    15.00,
    1,
    true,
    30,
    'شركة النظافة المتخصصة',
    'SA1234567890123456789012',
    'أحمد محمد',
    '+966501234567',
    '["تنظيف يومي شامل", "تعقيم دوري", "صيانة المرافق", "خدمة عملاء 24/7"]'::jsonb
);
*/

-- تعليقات على الجدول والأعمدة
-- Comments on table and columns
COMMENT ON TABLE quotes_archive IS 'جدول أرشيف عروض الأسعار - يحتوي على جميع عروض الأسعار المحفوظة';
COMMENT ON COLUMN quotes_archive.id IS 'المعرف الفريد للسجل';
COMMENT ON COLUMN quotes_archive.tenant IS 'معرف المستأجر للدعم متعدد المستأجرين';
COMMENT ON COLUMN quotes_archive.date IS 'تاريخ إنشاء عرض السعر';
COMMENT ON COLUMN quotes_archive.client IS 'اسم العميل';
COMMENT ON COLUMN quotes_archive.bullets IS 'نقاط الخدمة بصيغة JSON';
COMMENT ON COLUMN quotes_archive.logo IS 'شعار الشركة مُرمز بـ base64';

-- انتهاء ملف إنشاء قاعدة البيانات
-- End of database schema file