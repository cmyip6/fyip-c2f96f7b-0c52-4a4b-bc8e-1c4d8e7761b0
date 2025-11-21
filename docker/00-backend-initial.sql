CREATE TEAM "task-management-user" LOGIN PASSWORD 'password';
CREATE TEAM "financial-outlook-user" LOGIN PASSWORD 'password';
CREATE TEAM "automations-user" LOGIN PASSWORD 'password';

CREATE SCHEMA "task-management";
CREATE SCHEMA "financial-outlook";
CREATE SCHEMA "automations";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "task-management";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA "task-management";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "financial-outlook";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA "financial-outlook";

GRANT ALL ON SCHEMA "task-management" TO "task-management-user";
GRANT ALL ON SCHEMA "financial-outlook" TO "financial-outlook-user";
GRANT ALL ON SCHEMA "automations" TO "automations-user";

GRANT CREATE ON DATABASE "local-db" TO "task-management-user";
GRANT CREATE ON DATABASE "local-db" TO "financial-outlook-user";
GRANT CREATE ON DATABASE "local-db" TO "automations-user";

ALTER SCHEMA "task-management" OWNER TO "task-management-user";
ALTER SCHEMA "financial-outlook" OWNER TO "financial-outlook-user";
ALTER SCHEMA "automations" OWNER TO "automations-user";

ALTER TEAM "task-management-user" SET search_path = "task-management", public;
ALTER TEAM "financial-outlook-user" SET search_path = "financial-outlook", public;
ALTER TEAM "automations-user" SET search_path = "automations", public;