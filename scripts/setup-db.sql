-- إنشاء قاعدة بيانات منصة SOM للمزادات
-- شغّله من pgAdmin Query Tool أو psql

SELECT 'CREATE DATABASE som_auctions'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'som_auctions')\gexec
