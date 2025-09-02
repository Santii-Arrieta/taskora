import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const BlogArticlePage = () => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', articleId)
        .single();

      if (error) {
        console.error('Error fetching article:', error);
        setArticle(null);
      } else {
        setArticle(data);
      }
      setLoading(false);
    };

    fetchArticle();
  }, [articleId]);

  const renderContent = (content) => {
    if (!content) return null;
    return content.split('\n').map((paragraph, index) => {
      if (paragraph.startsWith('### ')) {
        return <h3 key={index} className="text-2xl font-bold mt-6 mb-3">{paragraph.substring(4)}</h3>;
      }
      return <p key={index} className="mb-4 leading-relaxed">{paragraph}</p>;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando artículo...</div>;
  }

  if (!article) {
    return (
      <>
        <Navbar />
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold">Artículo no encontrado</h1>
          <p className="text-muted-foreground mt-2">El artículo que buscas no existe o fue eliminado.</p>
          <Button asChild className="mt-6">
            <Link to="/community">Volver a la Comunidad</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.title} - Taskora</title>
        <meta name="description" content={article.description} />
      </Helmet>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button asChild variant="ghost" className="mb-8">
            <Link to="/community">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a la Comunidad
            </Link>
          </Button>
          <Card>
            {article.image && <img src={article.image} alt={article.title} className="w-full h-96 object-cover rounded-t-lg" />}
            <CardHeader>
              <CardTitle className="text-4xl font-extrabold tracking-tight">{article.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 pt-2">
                <span className="flex items-center gap-2"><User className="w-4 h-4" /> {article.author}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(article.date).toLocaleDateString()}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-lg max-w-none">
              {renderContent(article.content)}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default BlogArticlePage;