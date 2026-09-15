ALTER TABLE "activities" ADD COLUMN "description" text;
ALTER TABLE "activities" ADD COLUMN "video_call_url" text;
ALTER TABLE "activities" ADD COLUMN "priority" text DEFAULT 'none' NOT NULL;
ALTER TABLE "activities" ADD COLUMN "availability" text DEFAULT 'free' NOT NULL;

ALTER TABLE "activities" ADD CONSTRAINT "activities_priority_check"
  CHECK ("priority" = ANY (ARRAY['none', 'low', 'medium', 'high']));
ALTER TABLE "activities" ADD CONSTRAINT "activities_availability_check"
  CHECK ("availability" = ANY (ARRAY['free', 'busy']));
