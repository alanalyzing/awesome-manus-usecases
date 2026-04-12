CREATE TABLE `view_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`useCaseId` int NOT NULL,
	`visitorKey` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `view_events_id` PRIMARY KEY(`id`)
);
