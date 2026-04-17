-- Fix thumbnails for video-6 and video-7 with real Unsplash URLs
UPDATE shoppable_videos SET
  thumbnail_url = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=700&fit=crop&auto=format&q=80'
WHERE id = 'video-6';

UPDATE shoppable_videos SET
  thumbnail_url = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=700&fit=crop&auto=format&q=80'
WHERE id = 'video-7';
