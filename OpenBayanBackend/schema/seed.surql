-- ---------------------------------------------------------
-- OpenBayan: Example Seed Data (Single Line Format)
-- ---------------------------------------------------------

-- 1. CREATE USERS
CREATE user:admin SET username = 'Abu Hafsh', email = 'abu.hafsh@openbayan.org', password = 'securepassword';
CREATE user:editor SET username = 'Editor One', email = 'editor@openbayan.org', password = 'anotherpassword';

-- 2. CREATE SAHIFAH (Documents)
CREATE sahifah:doc1 SET title = 'Introduction to OpenBayan', content = 'OpenBayan is an open-source platform for Islamic research and data analysis.', author = user:admin, tags = ['announcement', 'intro'];
CREATE sahifah:doc2 SET title = 'Deep Dive into SurrealDB', content = 'SurrealDB is a multi-model database that handles graphs, documents, and vectors.', author = user:editor, tags = ['tutorial', 'database'];
CREATE sahifah:doc3 SET title = 'Research Methodology', content = 'Best practices for conducting academic research in Islamic studies.', author = user:admin, tags = ['research', 'tutorial'];
CREATE sahifah:doc4 SET title = 'Vector Search in OpenBayan', content = 'How to use hybrid vector search for better document retrieval.', author = user:editor, tags = ['ai', 'tutorial'];
