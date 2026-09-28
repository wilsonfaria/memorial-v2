-- gemini-3.1-flash-lite answered some extractions with a bare JSON array,
-- which the parser rejected; it accepts that format now, so give those pages
-- (and any marked failed by a mere Google overload) another go.
UPDATE `edition_pages`
SET `entitiesError` = NULL
WHERE `entitiesAt` IS NULL
  AND (`entitiesError` LIKE '%não é JSON válido: [%'
       OR `entitiesError` LIKE '%HTTP 503%'
       OR `entitiesError` LIKE '%HTTP 500%');
