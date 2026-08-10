-- Least-privilege Postgres role for the Trigger.dev cloud tasks (trigger/*.ts).
-- Those tasks run on Trigger.dev's own servers, not this VPS, and reach this
-- database over the public port exposed in docker-compose.prod.yml. This
-- role can only touch the two tables the AI sales pipeline actually uses —
-- never Firm, User, Document, or any billing table — so a leaked credential
-- here cannot expose real client TVA documents or account data.
--
-- Run once against the production database (POSTGRES_DB is passed in as a
-- psql variable so this works regardless of the actual database name):
--   docker compose --env-file .env.production -f docker-compose.prod.yml \
--     exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB \
--     -v DBNAME=$POSTGRES_DB -f /dev/stdin < docs/trigger-db-role.sql
--
-- Replace the password below before running, e.g. with: openssl rand -hex 24

CREATE ROLE trigger_pipeline WITH LOGIN PASSWORD 'REPLACE_WITH_A_STRONG_RANDOM_PASSWORD';
GRANT CONNECT ON DATABASE :"DBNAME" TO trigger_pipeline;
GRANT USAGE ON SCHEMA public TO trigger_pipeline;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Lead", "LeadMessage" TO trigger_pipeline;
