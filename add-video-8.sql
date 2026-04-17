INSERT INTO shoppable_videos (id, merchant_id, store_id, product_id, title, description, tags, video_url, thumbnail_url, content_type, status, is_featured, is_sponsored, views_count, clicks_count, add_to_cart_count, purchases_count, saves_count, target_province, target_city, published_at)
VALUES (
  'video-8', 'merchant-user', 'store-1', 'prod-1',
  'Smart TV 4K — ¡Oferta relámpago!',
  'La mejor resolución para tus series y películas favoritas. 50 pulgadas de pura magia.',
  'tecnologia,tv,4k,oferta',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  NULL, 'product', 'published', true, true,
  820, 150, 45, 20, 100, NULL, NULL,
  NOW()
) ON CONFLICT (id) DO NOTHING;
