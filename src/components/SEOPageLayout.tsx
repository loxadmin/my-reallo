import { ReactNode, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WaterBackground from "./WaterBackground";

interface SEOPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  schemaData?: object;
}

const SEOPageLayout = ({ title, description, children, schemaData }: SEOPageLayoutProps) => {
  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');

    const previousDescription = metaDescription?.getAttribute("content") || "";
    const previousOgDescription = ogDescription?.getAttribute("content") || "";
    const previousTwitterDescription = twitterDescription?.getAttribute("content") || "";

    document.title = `${title} | Karbali`;
    metaDescription?.setAttribute("content", description);
    ogDescription?.setAttribute("content", description);
    twitterDescription?.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      metaDescription?.setAttribute("content", previousDescription);
      ogDescription?.setAttribute("content", previousOgDescription);
      twitterDescription?.setAttribute("content", previousTwitterDescription);
    };
  }, [title, description]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <WaterBackground />
      <Navbar />

      {schemaData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
      )}

      <main className="relative z-10 pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 animate-fade-in">
              Financial Guide • {new Date().getFullYear()}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight gradient-text mb-6 leading-[1.1]">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
          </motion.div>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-3xl prose-img:shadow-2xl"
          >
            <div className="glass-card p-8 md:p-12 rounded-[2.5rem] border-white/20 dark:border-white/5 shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-primary/10 duration-700" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mb-32 transition-colors group-hover:bg-primary/10 duration-700" />

              <div className="relative z-10">
                {children}
              </div>
            </div>
          </motion.article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SEOPageLayout;
