CREATE TABLE `collection_use_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`useCaseId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_use_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `coll_uc_unique` UNIQUE(`collectionId`,`useCaseId`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`slug` varchar(250) NOT NULL,
	`description` text,
	`coverImageUrl` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `featured_use_case` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`editorialBlurb` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`featuredBy` int NOT NULL,
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `featured_use_case_id` PRIMARY KEY(`id`)
);
