-- name: GetLeaseTemplateByID :one
SELECT lease_template_pdf FROM lease_templates WHERE id = $1;

-- name: GetLeaseTemplates :many
SELECT * FROM lease_templates;

