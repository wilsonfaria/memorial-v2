-- Default content for databases that predate the menus / hero carousel
-- features (e.g. the original Hostinger production DB): without it the site
-- header has no navigation and the hero has no slides. Every insert is
-- guarded, so databases that already have menus/slides are left untouched.

-- Menus (key is unique: existing ones are kept as they are).
INSERT IGNORE INTO `menus` (`key`, `name`) VALUES
  ('principal', 'Menu Principal'),
  ('rodape', 'Menu de Rodapé');

SET @principal = (SELECT `id` FROM `menus` WHERE `key` = 'principal');
SET @seed_menu = NOT EXISTS (SELECT 1 FROM `menu_items` WHERE `menuId` = @principal);

INSERT INTO `menu_items` (`menuId`, `parentId`, `label`, `url`, `sortOrder`)
SELECT @principal, NULL, v.`label`, v.`url`, v.`sortOrder`
FROM (
  SELECT 'Início' AS `label`, '/' AS `url`, 0 AS `sortOrder`
  UNION ALL SELECT 'Décadas', '/decadas', 1
  UNION ALL SELECT 'Edições', '/edicoes', 2
  UNION ALL SELECT 'Crônicas', '/cronicas', 3
  UNION ALL SELECT 'Personagens', '/personagens', 4
  UNION ALL SELECT 'Galeria', '/galeria', 5
  UNION ALL SELECT 'Projetos', '/projetos', 6
  UNION ALL SELECT 'Fale Conosco', '/fale-conosco', 7
) AS v
WHERE @seed_menu;

SET @edicoes = (
  SELECT `id` FROM `menu_items`
  WHERE `menuId` = @principal AND `parentId` IS NULL AND `url` = '/edicoes'
  ORDER BY `id` LIMIT 1
);

INSERT INTO `menu_items` (`menuId`, `parentId`, `label`, `url`, `sortOrder`)
SELECT @principal, @edicoes, v.`label`, v.`url`, v.`sortOrder`
FROM (
  SELECT 'Todas as edições' AS `label`, '/edicoes' AS `url`, 0 AS `sortOrder`
  UNION ALL SELECT 'Anos', '/anos', 1
  UNION ALL SELECT 'Meses', '/meses', 2
) AS v
WHERE @seed_menu;

-- Hero carousel: one default slide if there are none (the carousel migration
-- could only copy the old hero when homepage_content already had a row).
INSERT INTO `hero_slides` (`headline`, `subtext`, `ctaLabel`, `ctaHref`, `order`, `published`, `updatedAt`)
SELECT 'Mais de um século registrando a nossa gente.', NULL, 'EXPLORAR O ACERVO', '/edicoes', 0, true, CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `hero_slides`);
