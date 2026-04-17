-- =====================================================
-- FIX IMÁGENES ROTAS EN PRODUCCIÓN (Railway Database)
-- Pegar todo en Railway → Postgres → Database → Query
-- =====================================================

-- Fix 1: Notebook Ultra 14" (prod-3f)
UPDATE products SET
  image = 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500&h=500&fit=crop&auto=format&q=80',
  images = '["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=800&fit=crop&auto=format&q=80"]'
WHERE id = 'prod-3f';

-- Fix 2: Gaseosa Cola 1.5L (prod-1d)
UPDATE products SET
  image = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&h=500&fit=crop&auto=format&q=80',
  images = '["https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1527960669566-c7f07c47d2da?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&h=800&fit=crop&auto=format&q=80"]'
WHERE id = 'prod-1d';

-- Fix 3: Docena de Empanadas Criolla (prod-4c)
UPDATE products SET
  image = 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&h=500&fit=crop&auto=format&q=80',
  images = '["https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=800&fit=crop&auto=format&q=80"]'
WHERE id = 'prod-4c';

-- Fix 4: Alimento Perro Adulto Premium 15kg (prod-11)
UPDATE products SET
  image = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop&auto=format&q=80',
  images = '["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=800&fit=crop&auto=format&q=80"]'
WHERE id = 'prod-11';

-- Fix 5: Correa y Arnés Regulable (prod-6b)
UPDATE products SET
  image = 'https://images.unsplash.com/photo-1601614457193-455bda62babe?w=500&h=500&fit=crop&auto=format&q=80',
  images = '["https://images.unsplash.com/photo-1601614457193-455bda62babe?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&h=800&fit=crop&auto=format&q=80"]'
WHERE id = 'prod-6b';

-- Verificar que se aplicaron
SELECT id, name, LEFT(image, 60) as image_preview FROM products
WHERE id IN ('prod-3f','prod-1d','prod-4c','prod-11','prod-6b');
