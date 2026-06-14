CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar(50),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar(50),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
