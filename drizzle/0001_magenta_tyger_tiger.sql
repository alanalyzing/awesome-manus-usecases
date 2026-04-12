CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`type` enum('job_function','feature') NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `screenshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screenshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upvotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `upvotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `upvote_unique` UNIQUE(`useCaseId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `use_case_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`categoryId` int NOT NULL,
	CONSTRAINT `use_case_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `uc_cat_unique` UNIQUE(`useCaseId`,`categoryId`)
);
--> statement-breakpoint
CREATE TABLE `use_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`slug` varchar(250) NOT NULL,
	`description` text NOT NULL,
	`sessionReplayUrl` text,
	`deliverableUrl` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`isHighlight` boolean NOT NULL DEFAULT false,
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`rejectionReason` text,
	`consentToContact` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`upvoteCount` int NOT NULL DEFAULT 0,
	`submitterId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`approvedAt` timestamp,
	CONSTRAINT `use_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `use_cases_slug_unique` UNIQUE(`slug`)
);
