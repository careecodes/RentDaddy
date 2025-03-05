CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('UTC', now())  -- I am making UTC our default. Do this for all models.
);
