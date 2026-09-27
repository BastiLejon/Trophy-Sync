CREATE TABLE `account_pairings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`psn_account_id` text NOT NULL,
	`psn_online_id` text NOT NULL,
	`xuid` text NOT NULL,
	`gamertag` text NOT NULL,
	`paired_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`last_sync_at` text,
	`sync_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_pairings_psn` ON `account_pairings` (`psn_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_pairings_xuid` ON `account_pairings` (`xuid`);