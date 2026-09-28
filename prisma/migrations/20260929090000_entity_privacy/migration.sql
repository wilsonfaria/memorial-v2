-- AlterTable
ALTER TABLE `entities` ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hiddenAt` DATETIME(3) NULL,
    ADD COLUMN `hiddenNote` TEXT NULL;


-- Counts and first/last dates now cover public articles only (PRIVATE_KINDS in
-- src/lib/entities/kinds.ts); recount what was extracted before.
UPDATE `entities` en
LEFT JOIN (
  SELECT m.entityId, COUNT(*) AS n, MIN(ed.publishedAt) AS first, MAX(ed.publishedAt) AS last
  FROM `entity_mentions` m
  JOIN `articles` a ON a.id = m.articleId AND a.kind NOT IN ('doenca', 'policia', 'religiao', 'politica')
  JOIN `editions` ed ON ed.id = a.editionId AND ed.deletedAt IS NULL
  GROUP BY m.entityId
) s ON s.entityId = en.id
SET en.mentionCount = COALESCE(s.n, 0), en.firstDate = s.first, en.lastDate = s.last;
