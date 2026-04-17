-- Fix video-6: reuse local video-3.mp4 (same CDN issue as external URLs)
UPDATE shoppable_videos SET
  video_url = '/videos/video-3.mp4'
WHERE id = 'video-6';

-- Fix video-7: reuse local video-1.mp4
UPDATE shoppable_videos SET
  video_url = '/videos/video-1.mp4'
WHERE id = 'video-7';

-- Fix Notebook Ultra 14" broken Unsplash image (use a valid laptop photo)
UPDATE products SET
  image = 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=500&h=500&fit=crop&auto=format&q=80',
  images = '["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=800&fit=crop&auto=format&q=80","https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=800&fit=crop&auto=format&q=80"]'
WHERE id = 'prod-3f';
