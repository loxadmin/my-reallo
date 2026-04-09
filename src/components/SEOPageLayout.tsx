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

      <main className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="prose prose-sm sm:prose-base dark:prose-invert prose-headings:gradient-text prose-headings:font-display"
          >
            {children}
          </motion.article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SEOPageLayout;
