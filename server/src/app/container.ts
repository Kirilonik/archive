import { OAuth2Client } from 'google-auth-library';
import { UsersPgRepository } from '../infrastructure/database/repositories/users.pg.repository.js';
import { SharpAvatarProcessor } from '../infrastructure/media/sharp-avatar-processor.js';
import { UserService } from '../application/users/user.service.js';
import { UsersController } from './controllers/users.controller.js';
import { AuthPgRepository } from '../infrastructure/database/repositories/auth.pg.repository.js';
import { BcryptPasswordHasher } from '../infrastructure/security/bcrypt-password-hasher.js';
import { EmailService } from '../infrastructure/email/email.service.js';
import { AuthService } from '../application/auth/auth.service.js';
import { AuthController } from './controllers/auth.controller.js';
import { KinopoiskHttpClient } from '../infrastructure/integrations/kinopoisk.client.js';
import { YouTubeHttpClient } from '../infrastructure/integrations/youtube.client.js';
import { YouTubeHistoryTakeoutParser } from '../infrastructure/integrations/youtube-history.parser.js';
import { YouTubeStatsService } from '../infrastructure/integrations/youtube-stats.service.js';
import { YouTubeOAuthPgRepository } from '../infrastructure/database/repositories/youtube-oauth.pg.repository.js';
import { YouTubeOAuthService } from '../application/youtube/youtube-oauth.service.js';
import { YouTubeController } from './controllers/youtube.controller.js';
import { FilmsPgRepository } from '../infrastructure/database/repositories/films.pg.repository.js';
import { FilmService } from '../application/films/film.service.js';
import { FilmsController } from './controllers/films.controller.js';
import { SeriesPgRepository } from '../infrastructure/database/repositories/series.pg.repository.js';
import { SeriesService } from '../application/series/series.service.js';
import { SeriesController } from './controllers/series.controller.js';
import { SeasonsPgRepository } from '../infrastructure/database/repositories/seasons.pg.repository.js';
import { SeasonService } from '../application/seasons/season.service.js';
import { SeasonsController } from './controllers/seasons.controller.js';
import { EpisodesPgRepository } from '../infrastructure/database/repositories/episodes.pg.repository.js';
import { EpisodeService } from '../application/episodes/episode.service.js';
import { EpisodesController } from './controllers/episodes.controller.js';
import { StatsPgRepository } from '../infrastructure/database/repositories/stats.pg.repository.js';
import { StatsService } from '../application/stats/stats.service.js';
import { TelegramService } from '../infrastructure/integrations/telegram.service.js';
import { TelegramNotificationService } from '../application/telegram/telegram.service.js';
import { TelegramController } from './controllers/telegram.controller.js';
import { env } from '../config/env.js';

const usersRepository = new UsersPgRepository();
const avatarProcessor = new SharpAvatarProcessor();
const userService = new UserService(usersRepository, avatarProcessor);
const statsRepository = new StatsPgRepository();
const statsService = new StatsService(statsRepository);
const usersController = new UsersController(userService, statsService);

const authRepository = new AuthPgRepository();
const passwordHasher = new BcryptPasswordHasher();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const emailService = new EmailService();
const telegramService = new TelegramService();
const telegramNotificationService = new TelegramNotificationService(telegramService);
const authService = new AuthService(
  authRepository,
  passwordHasher,
  googleClient,
  emailService,
  telegramNotificationService,
);
const authController = new AuthController(authService, (userId) => userService.getUserById(userId));

const kinopoiskClient = new KinopoiskHttpClient();
const youtubeClient = new YouTubeHttpClient();
const youtubeHistoryParser = new YouTubeHistoryTakeoutParser();
const youtubeStatsService = new YouTubeStatsService(youtubeClient);
const youtubeOAuthRepository = new YouTubeOAuthPgRepository();
const youtubeOAuthService = new YouTubeOAuthService(
  youtubeOAuthRepository,
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${env.API_BASE_URL || 'http://localhost:3000'}/api/youtube/auth/callback`,
);
const youtubeController = new YouTubeController(youtubeOAuthService, youtubeClient);
const filmsRepository = new FilmsPgRepository();
const filmService = new FilmService(filmsRepository, kinopoiskClient, statsService);
const filmsController = new FilmsController(filmService);
const seriesRepository = new SeriesPgRepository();
const seriesService = new SeriesService(seriesRepository, kinopoiskClient, statsService);
const seriesController = new SeriesController(seriesService);
const seasonsRepository = new SeasonsPgRepository();
const seasonService = new SeasonService(seasonsRepository, seriesRepository, statsService);
const seasonsController = new SeasonsController(seasonService);
const episodesRepository = new EpisodesPgRepository();
const episodeService = new EpisodeService(episodesRepository, seriesRepository, statsService);
const episodesController = new EpisodesController(episodeService);

export const container = {
  users: {
    repository: usersRepository,
    avatarProcessor,
    service: userService,
    controller: usersController,
  },
  stats: {
    repository: statsRepository,
    service: statsService,
  },
  auth: {
    repository: authRepository,
    passwordHasher,
    service: authService,
    controller: authController,
  },
  integrations: {
    kinopoisk: kinopoiskClient,
    youtube: {
      client: youtubeClient,
      historyParser: youtubeHistoryParser,
      statsService: youtubeStatsService,
      oauthService: youtubeOAuthService,
      controller: youtubeController,
    },
  },
  films: {
    repository: filmsRepository,
    service: filmService,
    controller: filmsController,
  },
  series: {
    repository: seriesRepository,
    service: seriesService,
    controller: seriesController,
  },
  seasons: {
    repository: seasonsRepository,
    service: seasonService,
    controller: seasonsController,
  },
  episodes: {
    repository: episodesRepository,
    service: episodeService,
    controller: episodesController,
  },
  telegram: {
    service: telegramService,
    notificationService: telegramNotificationService,
    controller: new TelegramController(telegramNotificationService),
  },
};
