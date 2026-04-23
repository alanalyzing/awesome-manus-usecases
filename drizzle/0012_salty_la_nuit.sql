CREATE TABLE `use_case_translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`locale` varchar(10) NOT NULL,
	`title` varchar(400) NOT NULL,
	`description` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `use_case_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `uc_locale_unique` UNIQUE(`useCaseId`,`locale`)
);
