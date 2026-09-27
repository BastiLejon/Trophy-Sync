CREATE TABLE `game_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ps_game_id` integer NOT NULL,
	`xbox_title_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`suggested_xbox_title_id` integer,
	`suggestion_confidence` real,
	`note` text,
	`decided_by` text,
	`decided_at` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`ps_game_id`) REFERENCES `ps_games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`xbox_title_id`) REFERENCES `xbox_titles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`suggested_xbox_title_id`) REFERENCES `xbox_titles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_mappings_ps_game` ON `game_mappings` (`ps_game_id`);--> statement-breakpoint
CREATE TABLE `ps_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`np_communication_id` text NOT NULL,
	`np_service_name` text DEFAULT 'trophy2' NOT NULL,
	`name` text NOT NULL,
	`platform` text DEFAULT 'PS5' NOT NULL,
	`icon_url` text,
	`defined_bronze` integer DEFAULT 0 NOT NULL,
	`defined_silver` integer DEFAULT 0 NOT NULL,
	`defined_gold` integer DEFAULT 0 NOT NULL,
	`defined_platinum` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ps_games_npcid` ON `ps_games` (`np_communication_id`);--> statement-breakpoint
CREATE TABLE `ps_trophies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ps_game_id` integer NOT NULL,
	`trophy_id` integer NOT NULL,
	`name` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`icon_url` text,
	`group_id` text DEFAULT 'default' NOT NULL,
	FOREIGN KEY (`ps_game_id`) REFERENCES `ps_games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ps_trophies_game_trophy` ON `ps_trophies` (`ps_game_id`,`trophy_id`);--> statement-breakpoint
CREATE TABLE `psn_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`account_id` text NOT NULL,
	`online_id` text NOT NULL,
	`avatar_url` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_expires_at` text,
	`refresh_expires_at` text,
	`trophy_level` integer,
	`earned_bronze` integer DEFAULT 0 NOT NULL,
	`earned_silver` integer DEFAULT 0 NOT NULL,
	`earned_gold` integer DEFAULT 0 NOT NULL,
	`earned_platinum` integer DEFAULT 0 NOT NULL,
	`last_imported_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `psn_accounts_account_id` ON `psn_accounts` (`account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `psn_accounts_user_id` ON `psn_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `sync_run_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`ps_game_id` integer NOT NULL,
	`ps_trophy_id` integer,
	`xbox_achievement_id` integer,
	`result` text NOT NULL,
	`gamerscore` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `sync_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ps_game_id`) REFERENCES `ps_games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ps_trophy_id`) REFERENCES `ps_trophies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`xbox_achievement_id`) REFERENCES `xbox_achievements`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `sync_run_items_run` ON `sync_run_items` (`run_id`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`finished_at` text,
	`status` text DEFAULT 'running' NOT NULL,
	`error` text,
	`summary` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trophy_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ps_trophy_id` integer NOT NULL,
	`xbox_achievement_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`suggested_xbox_achievement_id` integer,
	`suggestion_confidence` real,
	`note` text,
	`decided_by` text,
	`decided_at` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`ps_trophy_id`) REFERENCES `ps_trophies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`xbox_achievement_id`) REFERENCES `xbox_achievements`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`suggested_xbox_achievement_id`) REFERENCES `xbox_achievements`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trophy_mappings_ps_trophy` ON `trophy_mappings` (`ps_trophy_id`);--> statement-breakpoint
CREATE TABLE `user_ps_titles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`ps_game_id` integer NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`earned_bronze` integer DEFAULT 0 NOT NULL,
	`earned_silver` integer DEFAULT 0 NOT NULL,
	`earned_gold` integer DEFAULT 0 NOT NULL,
	`earned_platinum` integer DEFAULT 0 NOT NULL,
	`last_updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ps_game_id`) REFERENCES `ps_games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_ps_titles_user_game` ON `user_ps_titles` (`user_id`,`ps_game_id`);--> statement-breakpoint
CREATE TABLE `user_ps_trophies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`ps_trophy_id` integer NOT NULL,
	`earned_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ps_trophy_id`) REFERENCES `ps_trophies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_ps_trophies_user_trophy` ON `user_ps_trophies` (`user_id`,`ps_trophy_id`);--> statement-breakpoint
CREATE INDEX `user_ps_trophies_user` ON `user_ps_trophies` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_xbox_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`xbox_achievement_id` integer NOT NULL,
	`unlocked_at` text,
	`source` text NOT NULL,
	`ps_trophy_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`xbox_achievement_id`) REFERENCES `xbox_achievements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ps_trophy_id`) REFERENCES `ps_trophies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_xbox_achievements_user_ach` ON `user_xbox_achievements` (`user_id`,`xbox_achievement_id`);--> statement-breakpoint
CREATE INDEX `user_xbox_achievements_user` ON `user_xbox_achievements` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_xbox_titles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`xbox_title_id` integer NOT NULL,
	`last_played_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`xbox_title_id`) REFERENCES `xbox_titles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_xbox_titles_user_title` ON `user_xbox_titles` (`user_id`,`xbox_title_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `xbox_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`xuid` text NOT NULL,
	`gamertag` text NOT NULL,
	`gamerpic_url` text,
	`gamerscore` integer DEFAULT 0 NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`ms_refresh_token` text,
	`xsts_token` text,
	`user_hash` text,
	`xsts_expires_at` text,
	`last_imported_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xbox_accounts_xuid` ON `xbox_accounts` (`xuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `xbox_accounts_user_id` ON `xbox_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `xbox_achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`xbox_title_id` integer NOT NULL,
	`achievement_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`locked_description` text DEFAULT '' NOT NULL,
	`gamerscore` integer DEFAULT 0 NOT NULL,
	`icon_url` text,
	`is_secret` integer DEFAULT false NOT NULL,
	`rarity_percent` real,
	FOREIGN KEY (`xbox_title_id`) REFERENCES `xbox_titles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xbox_achievements_title_ach` ON `xbox_achievements` (`xbox_title_id`,`achievement_id`);--> statement-breakpoint
CREATE TABLE `xbox_titles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_id` text NOT NULL,
	`name` text NOT NULL,
	`icon_url` text,
	`devices` text DEFAULT 'XboxSeries' NOT NULL,
	`total_gamerscore` integer DEFAULT 0 NOT NULL,
	`achievement_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xbox_titles_title_id` ON `xbox_titles` (`title_id`);