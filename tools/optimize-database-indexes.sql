-- Script para optimizar índices de la base de datos
-- Mejora significativamente el rendimiento de las consultas

-- Índices para la tabla users
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users("userType");
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users("verificationStatus");
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índices para la tabla briefs
CREATE INDEX IF NOT EXISTS idx_briefs_created_at ON briefs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefs_user_id ON briefs("userId");
CREATE INDEX IF NOT EXISTS idx_briefs_category ON briefs(category);
CREATE INDEX IF NOT EXISTS idx_briefs_type ON briefs(type);
CREATE INDEX IF NOT EXISTS idx_briefs_service_type ON briefs("serviceType");
CREATE INDEX IF NOT EXISTS idx_briefs_price ON briefs(price);
CREATE INDEX IF NOT EXISTS idx_briefs_status ON briefs(status);

-- Índices compuestos para briefs
CREATE INDEX IF NOT EXISTS idx_briefs_type_category ON briefs(type, category);
CREATE INDEX IF NOT EXISTS idx_briefs_user_type ON briefs("userId", type);
CREATE INDEX IF NOT EXISTS idx_briefs_created_type ON briefs(created_at DESC, type);

-- Índices para la tabla conversations
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);

-- Índices para la tabla messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

-- Índices compuestos para messages
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_read ON messages(conversation_id, read);

-- Índices para la tabla contracts
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_provider_id ON contracts("providerId");
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts("clientId");
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- Índices compuestos para contracts
CREATE INDEX IF NOT EXISTS idx_contracts_provider_status ON contracts("providerId", status);
CREATE INDEX IF NOT EXISTS idx_contracts_client_status ON contracts("clientId", status);

-- Índices para la tabla support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets("userId");
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- Índices para la tabla newsletter_subscribers
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed_at ON newsletter_subscribers(subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

-- Índices para la tabla blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_date ON blog_posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_type ON blog_posts(type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author);

-- Índices para la tabla reviews
CREATE INDEX IF NOT EXISTS idx_reviews_brief_id ON reviews("briefId");
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews("revieweeId");
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Índices compuestos para reviews
CREATE INDEX IF NOT EXISTS idx_reviews_brief_created ON reviews("briefId", created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created ON reviews("revieweeId", created_at DESC);

-- Índices para la tabla transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions("userId");
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_mp_payment_id ON transactions(mp_payment_id);

-- Índices compuestos para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions("userId", date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions("userId", type);

-- Índices para la tabla applications
CREATE INDEX IF NOT EXISTS idx_applications_brief_id ON applications("briefId");
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications("applicantId");
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_date ON applications(date DESC);

-- Índices compuestos para applications
CREATE INDEX IF NOT EXISTS idx_applications_brief_status ON applications("briefId", status);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_status ON applications("applicantId", status);

-- Índices para la tabla categories
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Índices para búsqueda de texto completo (si está disponible)
-- CREATE INDEX IF NOT EXISTS idx_briefs_search ON briefs USING GIN(to_tsvector('spanish', title || ' ' || description));
-- CREATE INDEX IF NOT EXISTS idx_users_search ON users USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(bio, '')));

-- Estadísticas de los índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
