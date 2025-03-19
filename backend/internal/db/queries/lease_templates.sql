-- name: GetLeaseTemplateByID :one
SELECT lease_template_pdf FROM lease_templates WHERE id = $1;

-- name: GetLeaseTemplateTitles :many
SELECT id,lease_template_title FROM lease_templates;

-- name: GetLeaseTemplatePDFs :many
SELECT id,lease_template_pdf FROM lease_templates;