-- Trigger 1: mark the embedding STALE when searchable content changes.
CREATE OR REPLACE FUNCTION fn_project_content_changed() RETURNS trigger AS $$
BEGIN
    IF NEW.title       IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
        NEW.embedding_stale := TRUE;
        NEW.updated_at := now();
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_content_changed ON project;
CREATE TRIGGER trg_project_content_changed
BEFORE UPDATE ON project FOR EACH ROW EXECUTE FUNCTION fn_project_content_changed();

-- Trigger 2: changing required skills also invalidates the embedding.
CREATE OR REPLACE FUNCTION fn_project_skill_changed() RETURNS trigger AS $$
BEGIN
    UPDATE project SET embedding_stale = TRUE, updated_at = now()
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
    RETURN NULL;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_skill_changed ON project_skill;
CREATE TRIGGER trg_project_skill_changed
AFTER INSERT OR DELETE ON project_skill FOR EACH ROW EXECUTE FUNCTION fn_project_skill_changed();

-- Trigger 3: keep closed_at consistent with issue status.
CREATE OR REPLACE FUNCTION fn_issue_status() RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    IF NEW.status <> 'closed' THEN NEW.closed_at := NULL; END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_status ON issue;
CREATE TRIGGER trg_issue_status
BEFORE INSERT OR UPDATE OF status ON issue FOR EACH ROW EXECUTE FUNCTION fn_issue_status();
