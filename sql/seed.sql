INSERT INTO users (name,email,role) VALUES
 ('Asha Rao','asha@example.com','developer'),('Ben Carter','ben@example.com','developer'),
 ('Chen Wei','chen@example.com','developer'),('Admin','admin@example.com','admin')
ON CONFLICT DO NOTHING;
INSERT INTO category (name,description) VALUES
 ('AI & ML','Machine learning, NLP and data tooling'),('Web','Frontend and backend web frameworks'),
 ('DevOps','Infrastructure, CI/CD and observability'),('Databases','Storage engines and query tools'),
 ('Education','Learning platforms and docs')
ON CONFLICT DO NOTHING;
INSERT INTO skill (name) VALUES ('Python'),('NLP'),('React'),('TypeScript'),('PostgreSQL'),('Docker'),('Go'),('Rust'),('FastAPI'),('Kubernetes')
ON CONFLICT DO NOTHING;

INSERT INTO project (title,description,repo_url,category_id,difficulty,stars)
SELECT v.t, v.d, v.u, c.category_id, v.df, v.st FROM (VALUES
 ('AI Document Analyzer','Extract entities and summaries from PDFs using transformer models and NLP pipelines.','https://github.com/example/doc-analyzer','AI & ML','intermediate',840),
 ('PgQuery Studio','A browser-based SQL editor and visualiser for PostgreSQL with a query plan explorer.','https://github.com/example/pgquery','Databases','intermediate',1200),
 ('KubeWatch','Lightweight Kubernetes dashboard that surfaces pod health and cost metrics.','https://github.com/example/kubewatch','DevOps','advanced',560),
 ('Learn Rust Together','Community-written interactive tutorials that teach Rust to beginners.','https://github.com/example/learn-rust','Education','beginner',310),
 ('ReactKit UI','Accessible, themeable React component library written in TypeScript.','https://github.com/example/reactkit','Web','beginner',2300),
 ('FastAPI Starter Hub','Production-ready FastAPI templates with auth, Docker and CI.','https://github.com/example/fastapi-hub','Web','beginner',970)
) v(t,d,u,cat,df,st) JOIN category c ON c.name = v.cat;

INSERT INTO project_skill (project_id, skill_id)
SELECT p.project_id, s.skill_id FROM (VALUES
 ('AI Document Analyzer','Python'),('AI Document Analyzer','NLP'),
 ('PgQuery Studio','PostgreSQL'),('PgQuery Studio','TypeScript'),('PgQuery Studio','React'),
 ('KubeWatch','Go'),('KubeWatch','Kubernetes'),('KubeWatch','Docker'),
 ('Learn Rust Together','Rust'),('ReactKit UI','React'),('ReactKit UI','TypeScript'),
 ('FastAPI Starter Hub','Python'),('FastAPI Starter Hub','FastAPI'),('FastAPI Starter Hub','Docker')
) v(pt, sk) JOIN project p ON p.title = v.pt JOIN skill s ON s.name = v.sk;

INSERT INTO issue (project_id,title,description,label,status)
SELECT p.project_id, v.t, v.d, v.l, v.st FROM (VALUES
 ('AI Document Analyzer','Add OCR fallback for scanned PDFs','Use Tesseract when no text layer exists','feature','open'),
 ('AI Document Analyzer','Batch summarisation is slow','Profile and parallelise','performance','in_progress'),
 ('PgQuery Studio','Explain plan tree collapses on resize','Fix layout bug','bug','open'),
 ('KubeWatch','Support multiple clusters','Allow switching kubeconfig contexts','feature','open'),
 ('Learn Rust Together','Typos in ownership chapter','Proofreading','good first issue','closed'),
 ('ReactKit UI','Add keyboard navigation to Menu','WAI-ARIA menu pattern','accessibility','open'),
 ('FastAPI Starter Hub','Upgrade to Pydantic v2','Migrate models','maintenance','closed')
) v(pt,t,d,l,st) JOIN project p ON p.title = v.pt;

INSERT INTO contribution (project_id,developer_id,type,status,lines_changed)
SELECT p.project_id, u.user_id, v.ty, v.st, v.ln FROM (VALUES
 ('Learn Rust Together','asha@example.com','docs','merged',40),
 ('FastAPI Starter Hub','ben@example.com','code','merged',220),
 ('FastAPI Starter Hub','asha@example.com','review','merged',0),
 ('ReactKit UI','chen@example.com','code','submitted',90),
 ('AI Document Analyzer','chen@example.com','code','merged',310)
) v(pt,em,ty,st,ln) JOIN project p ON p.title=v.pt JOIN users u ON u.email=v.em;
