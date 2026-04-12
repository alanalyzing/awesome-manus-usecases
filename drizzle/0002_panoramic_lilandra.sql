CREATE TABLE `admin_activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`action` varchar(64) NOT NULL,
	`targetType` varchar(32) NOT NULL,
	`targetId` int NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`completenessScore` decimal(3,1) NOT NULL,
	`innovativenessScore` decimal(3,1) NOT NULL,
	`impactScore` decimal(3,1) NOT NULL,
	`overallScore` decimal(3,1) NOT NULL,
	`reasoning` text,
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submitter_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('approved','rejected') NOT NULL,
	`message` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submitter_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `upvotes` DROP INDEX `upvote_unique`;--> statement-breakpoint
ALTER TABLE `upvotes` ADD `visitorKey` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `upvotes` ADD CONSTRAINT `upvote_visitor_unique` UNIQUE(`useCaseId`,`visitorKey`);--> statement-breakpoint
ALTER TABLE `upvotes` DROP COLUMN `userId`;