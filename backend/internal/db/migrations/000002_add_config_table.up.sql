-- Create a new table for application configuration
CREATE TABLE IF NOT EXISTS "app_config" (
    "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "key" VARCHAR NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "user_id" BIGINT,
    "description" TEXT,
    "updated_at" TIMESTAMP(0) DEFAULT now(),
    "created_at" TIMESTAMP(0) DEFAULT now()
);

-- Create an index on the config key
CREATE INDEX "app_config_key_index" ON "app_config" ("key");

-- Add initial Documenso config entries
INSERT INTO "app_config" ("key", "value", "description") 
VALUES ('documenso_api_key', '', 'API key for Documenso integration')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "app_config" ("key", "value", "description") 
VALUES ('documenso_webhook_secret', '', 'Webhook secret for Documenso integration')
ON CONFLICT ("key") DO NOTHING;