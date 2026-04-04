-- Add school_names (text[]) to photographers for multi-university selection.
-- Keeps the old school_name column intact for backward compatibility.

alter table photographers
  add column if not exists school_names text[] default null;
