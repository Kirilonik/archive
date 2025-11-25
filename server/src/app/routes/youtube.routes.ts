import { Router } from 'express';
import type { YouTubeController } from '../controllers/youtube.controller.js';

export function createYouTubeRouter(controller: YouTubeController) {
  const router = Router();

  // OAuth flow
  router.get('/auth/url', controller.getAuthUrl);
  router.get('/auth/callback', controller.handleCallback);
  router.get('/auth/status', controller.getConnectionStatus);
  router.post('/auth/disconnect', controller.disconnect);

  // Данные пользователя
  router.get('/playlists', controller.getPlaylists);
  router.get('/liked', controller.getLikedVideos);
  router.get('/watch-later', controller.getWatchLater);
  router.get('/playlists/:playlistId/items', controller.getPlaylistItems);

  return router;
}
