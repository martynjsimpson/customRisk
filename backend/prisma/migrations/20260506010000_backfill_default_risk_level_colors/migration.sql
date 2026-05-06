UPDATE "risk_level"
SET "color" = CASE "name"
  WHEN 'Low' THEN '#2f9e44'
  WHEN 'Medium' THEN '#f59f00'
  WHEN 'High' THEN '#f76707'
  WHEN 'Critical' THEN '#e03131'
  ELSE "color"
END
WHERE "color" IS NULL
  AND "name" IN ('Low', 'Medium', 'High', 'Critical');
