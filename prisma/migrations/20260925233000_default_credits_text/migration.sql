-- Replace the original placeholder credits text (never customized) with the
-- real default. Rows where the admin already wrote their own text are left alone.
UPDATE `site_settings`
SET `creditsText` = 'Criação e desenvolvimento: willabs.ia.br'
WHERE `creditsText` LIKE '%[nome do desenvolvedor/empresa]%';