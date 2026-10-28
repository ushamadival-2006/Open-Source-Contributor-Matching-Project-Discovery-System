-- Run after integrated_schema.sql. Safe to re-run for project/category/skill seed records.
INSERT INTO categories(category_name,description) VALUES
 ('Artificial Intelligence','AI and machine learning projects'),('Web Development','Frontend and backend web projects'),('Data Science','Data analysis and visualization')
ON CONFLICT(category_name) DO NOTHING;
INSERT INTO skills(skill_name) VALUES ('Python'),('Machine Learning'),('NLP'),('React'),('JavaScript'),('SQL'),('TypeScript'),('Data Analysis'),('Node.js') ON CONFLICT(skill_name) DO NOTHING;
INSERT INTO projects(category_id,title,description,difficulty,status,repo_url,stars)
SELECT c.category_id,v.title,v.description,v.difficulty,'active',v.repo_url,v.stars FROM (VALUES
 ('Artificial Intelligence','AI Study Assistant','Build a Python assistant that answers questions from course notes using retrieval and natural language processing.','intermediate','https://github.com/example/ai-study-assistant',120),
 ('Web Development','Accessible Event Dashboard','Create a responsive React and TypeScript dashboard for community events with accessible forms and filters.','beginner','https://github.com/example/event-dashboard',85),
 ('Data Science','Community Data Explorer','Clean and analyze public community datasets using Python, SQL and data visualization.','intermediate','https://github.com/example/community-data',63),
 ('Artificial Intelligence','Text Classification Toolkit','Develop an NLP pipeline to classify short text messages and evaluate model performance.','advanced','https://github.com/example/text-classification',44)
) AS v(category,title,description,difficulty,repo_url,stars) JOIN categories c ON c.category_name=v.category
WHERE NOT EXISTS(SELECT 1 FROM projects p WHERE p.title=v.title);
INSERT INTO project_skills(project_id,skill_id,importance)
SELECT p.project_id,s.skill_id,v.importance FROM (VALUES
 ('AI Study Assistant','Python',5),('AI Study Assistant','NLP',4),('AI Study Assistant','SQL',2),
 ('Accessible Event Dashboard','React',5),('Accessible Event Dashboard','TypeScript',4),('Accessible Event Dashboard','JavaScript',4),
 ('Community Data Explorer','Python',4),('Community Data Explorer','SQL',5),('Community Data Explorer','Data Analysis',5),
 ('Text Classification Toolkit','Python',5),('Text Classification Toolkit','Machine Learning',5),('Text Classification Toolkit','NLP',5)
) v(title,skill,importance) JOIN projects p ON p.title=v.title JOIN skills s ON s.skill_name=v.skill
ON CONFLICT(project_id,skill_id) DO NOTHING;
INSERT INTO issues(project_id,title,description,difficulty,status,label)
SELECT p.project_id,v.title,v.description,v.difficulty,'open','good first issue' FROM (VALUES
 ('AI Study Assistant','Prepare an evaluation question set','Create sample questions and expected answers.','beginner'),
 ('Accessible Event Dashboard','Add keyboard-friendly filters','Ensure all filters work without a mouse.','beginner'),
 ('Community Data Explorer','Write data quality checks','Check for missing and invalid values.','intermediate')
) v(project_title,title,description,difficulty) JOIN projects p ON p.title=v.project_title
WHERE NOT EXISTS(SELECT 1 FROM issues i WHERE i.project_id=p.project_id AND i.title=v.title);
