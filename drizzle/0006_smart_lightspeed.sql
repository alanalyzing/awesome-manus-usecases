CREATE TABLE `user_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `follow_unique` UNIQUE(`followerId`,`followingId`)
);
--> statement-breakpoint
ALTER TABLE `upvotes` DROP INDEX `upvote_visitor_unique`;--> statement-breakpoint
ALTER TABLE `upvotes` MODIFY COLUMN `visitorKey` varchar(128);--> statement-breakpoint
ALTER TABLE `upvotes` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `upvotes` ADD CONSTRAINT `upvote_user_unique` UNIQUE(`useCaseId`,`userId`);