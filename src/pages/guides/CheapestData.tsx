import SEOPageLayout from "@/components/SEOPageLayout";
import { Link } from "react-router-dom";

const CheapestData = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "The Cheapest Data Plans in Nigeria (2025 Update)",
    "description": "Compare the most affordable data plans from MTN, Airtel, Glo, and 9mobile. Find the best value for your money.",
    "author": {
      "@type": "Organization",
      "name": "Karbali"
    }
  };

  return (
    <SEOPageLayout
      title="Cheapest Data Plans in Nigeria"
      description="Discover the cheapest data plans in Nigeria across all major networks including MTN, Airtel, Glo, and 9mobile. Save money on your internet subscription today."
      schemaData={schemaData}
    >
      <p>
        In an era where staying connected is essential, finding the best value for your data subscription can save you thousands of Naira every month.
      </p>

      <h2>Best Value Data Plans by Network</h2>
      <ul>
        <li><strong>MTN:</strong> Look for the "Pulse" night plans and specialized 4G bundles.</li>
        <li><strong>Airtel:</strong> The "Binge" plans offer large amounts of data for short durations at very low prices.</li>
        <li><strong>Glo:</strong> Known for offering the highest data volume for standard monthly subscriptions.</li>
        <li><strong>9mobile:</strong> Offers excellent weekend and night bundles for heavy downloaders.</li>
      </ul>

      <h2>Tips to Save on Data Costs</h2>
      <ol>
        <li>Use data compression settings in your mobile browser.</li>
        <li>Turn off auto-updates for apps over cellular data.</li>
        <li>Leverage Wi-Fi whenever possible, especially for large downloads.</li>
        <li>Buy data from reputable SME resellers for significant discounts compared to direct network prices.</li>
        <li>Monitor your data usage in your phone settings to identify data-hungry apps.</li>
      </ol>

      <h2>Frequently Asked Questions</h2>
      <div className="space-y-4">
        <div>
          <h3>Which network has the fastest data in Nigeria?</h3>
          <p>MTN and Airtel generally offer the most consistent 4G and 5G speeds across major Nigerian cities.</p>
        </div>
        <div>
          <h3>Are data resellers safe to use?</h3>
          <p>Yes, as long as you use well-known and reviewed platforms. They buy data in bulk and resell it at a lower margin.</p>
        </div>
        <div>
          <h3>What is the best plan for a heavy TikTok/YouTube user?</h3>
          <p>Social media bundles or unlimited night plans are the most cost-effective for high-video consumption.</p>
        </div>
      </div>

      <div className="mt-16 p-8 md:p-10 glass-card rounded-[2rem] border-primary/20 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4 gradient-text">Want to Cut Your Monthly Bills?</h3>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Karbali is your personal financial assistant. We help you reduce expenses, discover cheaper alternatives, and find new ways to earn money online tailored to your lifestyle.
          </p>
          <Link
            to="/auth"
            className="clay-primary inline-flex items-center justify-center px-8 py-4 rounded-2xl font-semibold no-underline transition-transform hover:scale-105 active:scale-95"
          >
            Optimize Your Spending with Karbali
          </Link>
        </div>
      </div>
    </SEOPageLayout>
  );
};

export default CheapestData;
