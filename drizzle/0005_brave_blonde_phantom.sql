CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(32) NOT NULL,
	`proficiency` enum('beginner','intermediate','advanced','expert') NOT NULL,
	`company` varchar(128),
	`bio` text,
	`avatarUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `user_profiles_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `user_social_handles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`platform` enum('x','instagram','linkedin','other') NOT NULL,
	`handle` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_social_handles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profile_platform_unique` UNIQUE(`profileId`,`platform`)
);
