-- Demo records only. The password hashes are deliberately invalid placeholders.
INSERT INTO users (name, email, password_hash, role) VALUES
('Aarav Sharma', 'aarav@example.com', 'DEMO_ONLY_NOT_A_REAL_HASH', 'developer'),
('Priya Rao', 'priya@example.com', 'DEMO_ONLY_NOT_A_REAL_HASH', 'developer'),
('Admin Demo', 'admin@example.com', 'DEMO_ONLY_NOT_A_REAL_HASH', 'admin');

INSERT INTO developer_profiles (user_id, bio, experience_level, interests)
SELECT u.user_id, v.bio, v.level, v.interests
FROM (VALUES
 ('aarav@example.com', 'Intermediate developer interested in Python, machine learning and NLP.', 'intermediate', 'AI, NLP, data science'),
 ('priya@example.com', 'Beginner frontend developer interested in React and accessible web apps.', 'beginner', 'React, frontend, open source')
) AS v(email, bio, level, interests)
JOIN users u ON u.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM developer_profiles dp WHERE dp.user_id = u.user_id);

INSERT INTO skills (skill_name) VALUES
('Python'), ('Machine Learning'), ('NLP'), ('React'), ('JavaScript'),
('SQL'), ('TypeScript'), ('Data Analysis'), ('Node.js')
ON CONFLICT (skill_name) DO NOTHING;

INSERT INTO developer_skills (developer_id, skill_id, proficiency)
SELECT dp.developer_id, s.skill_id, v.proficiency
FROM (VALUES
 ('aarav@example.com', 'Python', 'advanced'),
 ('aarav@example.com', 'Machine Learning', 'intermediate'),
 ('aarav@example.com', 'NLP', 'intermediate'),
 ('aarav@example.com', 'SQL', 'intermediate'),
 ('priya@example.com', 'React', 'intermediate'),
 ('priya@example.com', 'JavaScript', 'intermediate'),
 ('priya@example.com', 'SQL', 'beginner')
) AS v(email, skill_name, proficiency)
JOIN users u ON u.email = v.email
JOIN developer_profiles dp ON dp.user_id = u.user_id
JOIN skills s ON s.skill_name = v.skill_name
ON CONFLICT (developer_id, skill_id) DO NOTHING;

INSERT INTO categories (category_name) VALUES
('Artificial Intelligence'), ('Web Development'), ('Data Science')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO projects (category_id, title, description, difficulty, status)
SELECT c.category_id, v.title, v.description, v.difficulty, 'active'
FROM (VALUES
 ('Artificial Intelligence', 'AI Study Assistant', 'Build a Python assistant that answers questions from course notes using retrieval and natural language processing.', 'intermediate'),
 ('Web Development', 'Accessible Event Dashboard', 'Create a responsive React and TypeScript dashboard for community events with accessible forms and filters.', 'beginner'),
 ('Data Science', 'Community Data Explorer', 'Clean and analyze public community datasets using Python, SQL and data visualization.', 'intermediate'),
 ('Artificial Intelligence', 'Text Classification Toolkit', 'Develop an NLP pipeline to classify short text messages and evaluate model performance.', 'advanced')
) AS v(category_name, title, description, difficulty)
JOIN categories c ON c.category_name = v.category_name
WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.title = v.title);

INSERT INTO project_skills (project_id, skill_id, importance)
SELECT p.project_id, s.skill_id, v.importance
FROM (VALUES
 ('AI Study Assistant', 'Python', 5), ('AI Study Assistant', 'NLP', 4), ('AI Study Assistant', 'SQL', 2),
 ('Accessible Event Dashboard', 'React', 5), ('Accessible Event Dashboard', 'TypeScript', 4), ('Accessible Event Dashboard', 'JavaScript', 4),
 ('Community Data Explorer', 'Python', 4), ('Community Data Explorer', 'SQL', 5), ('Community Data Explorer', 'Data Analysis', 5),
 ('Text Classification Toolkit', 'Python', 5), ('Text Classification Toolkit', 'Machine Learning', 5), ('Text Classification Toolkit', 'NLP', 5)
) AS v(title, skill_name, importance)
JOIN projects p ON p.title = v.title
JOIN skills s ON s.skill_name = v.skill_name
ON CONFLICT (project_id, skill_id) DO NOTHING;

INSERT INTO issues (project_id, title, description, difficulty, status)
SELECT p.project_id, v.title, v.description, v.difficulty, 'open'
FROM (VALUES
 ('AI Study Assistant', 'Prepare an evaluation question set', 'Create sample questions and expected answers.', 'beginner'),
 ('Accessible Event Dashboard', 'Add keyboard-friendly filters', 'Ensure all filters work without a mouse.', 'beginner'),
 ('Community Data Explorer', 'Write data quality checks', 'Check for missing and invalid values.', 'intermediate')
) AS v(project_title, title, description, difficulty)
JOIN projects p ON p.title = v.project_title
WHERE NOT EXISTS (SELECT 1 FROM issues i WHERE i.project_id = p.project_id AND i.title = v.title);
