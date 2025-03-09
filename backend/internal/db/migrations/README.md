# Using Migrations

When you make a change to a database schema, run the task command `make-migration -- <a-file-name>` to generate a new set of migration files.

In the `up.sql` file, place the new/updated sql script for the affected tables.
In `down.sql`, add the opposite. ie; if 'up' adds a table, 'down' removes said table if it exists.


### Required

- Taskfile
- go-migrate
- Healthy Postgres container

---

Run `task migrate:up` to create tables. Verify that the tables all exist through prefered DBMS

To revert a migration, run `task migrate:down`

In the case of an the error message `error: Dirty database version -1. Fix and force version.`, run `task migrate:fix-dirty` then rebuild with `task migrate:up`