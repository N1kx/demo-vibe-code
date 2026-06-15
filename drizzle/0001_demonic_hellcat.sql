CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"user_id" integer,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar(50),
	"updated_at" timestamp,
	"updated_by" varchar(50)
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;