-- Fix broken Notebook Unsplash image
UPDATE products SET
  image = 'https://images.unsplash.com/photo-1496181091340-5890a88d1c58?w=500&h=500&fit=crop&auto=format&q=80',
  images = '["https://images.unsplash.com/photo-1496181091340-5890a88d1c58?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=800&fit=crop&auto=format&q=80"]'
WHERE id = 'prod-3f';

-- Insert video-6
INSERT INTO shoppable_videos (id, merchant_id, store_id, product_id, title, description, tags, video_url, thumbnail_url, content_type, status, is_featured, is_sponsored, views_count, clicks_count, add_to_cart_count, purchases_count, saves_count, target_province, target_city, published_at)
VALUES (
  'video-6', 'merchant-user', 'store-1', 'prod-3',
  'Aceite de Oliva Extra Virgen — el mejor del barrio',
  'Calidad premium, precio imbatible. Ideal para ensaladas y cocina gourmet.',
  'supermercado,aceite,oliva,gourmet',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  NULL, 'product', 'published', false, true,
  445, 62, 25, 11, 30, NULL, NULL,
  NOW() - INTERVAL '6 days'
) ON CONFLICT (id) DO NOTHING;

-- Insert video-7
INSERT INTO shoppable_videos (id, merchant_id, store_id, product_id, title, description, tags, video_url, thumbnail_url, content_type, status, is_featured, is_sponsored, views_count, clicks_count, add_to_cart_count, purchases_count, saves_count, target_province, target_city, published_at)
VALUES (
  'video-7', 'merchant-user', 'store-5', 'prod-5c',
  'Zapatillas Running Urbanas — Stock limitado',
  'Amortiguación premium, diseño moderno. Las favoritas del momento. Talles 36-45.',
  'zapatillas,running,moda,deporte',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  NULL, 'product', 'published', true, false,
  678, 91, 38, 14, 55, NULL, NULL,
  NOW() - INTERVAL '7 days'
) ON CONFLICT (id) DO NOTHING;
