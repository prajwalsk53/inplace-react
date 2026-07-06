-- The Decimal -> TEXT cast in the placement_salary_string migration preserved
-- Postgres's full numeric precision (e.g. "22000.000000000000000000000000000000").
-- Clean up any such artifacts by stripping trailing zeros/decimal point.
UPDATE "Placement"
SET salary = regexp_replace(regexp_replace(salary, '0+$', ''), '\.$', '')
WHERE salary ~ '^[0-9]+\.0+$';