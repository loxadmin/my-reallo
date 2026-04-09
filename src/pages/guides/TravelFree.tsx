import SEOPageLayout from "@/components/SEOPageLayout";
import { Link } from "react-router-dom";

const TravelFree = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Travel for Free",
    "description": "Learn how to travel the world for free or at a very low cost using house sitting, volunteering, and points.",
    "step": [
      {
        "@type": "HowToStep",
        "text": "Join travel reward programs and use credit card points."
      },
      {
        "@type": "HowToStep",
        "text": "Try house sitting or pet sitting."
      },
      {
        "@type": "HowToStep",
        "text": "Volunteer in exchange for accommodation."
      }
    ]
  };

  return (
    <SEOPageLayout
      title="How to Travel for Free: The Ultimate Guide"
      description="You can travel for free by leveraging credit card points, house sitting, volunteering, and working remotely. Learn the secrets to seeing the world on a zero budget."
      schemaData={schemaData}
    >
      <p>
        Traveling doesn't always have to be expensive. With the right strategy, you can explore new cultures and destinations without breaking the bank—or even spending a kobo on accommodation.
      </p>

      <h2>5 Proven Ways to Travel for Free</h2>
      <ol>
        <li><strong>Travel Hacking:</strong> Use credit card sign-up bonuses and everyday spending to earn points for free flights and hotel stays.</li>
        <li><strong>House Sitting:</strong> Stay in someone's home for free in exchange for looking after their property and pets.</li>
        <li><strong>Volunteering (Workaway, Worldpackers):</strong> Trade a few hours of work per day for free room and board.</li>
        <li><strong>Home Exchange:</strong> Swap your home with someone in another country for a specified period.</li>
        <li><strong>Working on a Cruise Ship or Yacht:</strong> Get paid to travel the world while living and eating for free on board.</li>
      </ol>

      <h2>Step-by-Step: How to Start Traveling for Free</h2>
      <ol>
        <li>Start building your travel points by using specific credit cards for your regular expenses.</li>
        <li>Create a profile on house-sitting platforms like TrustedHousesitters.</li>
        <li>Research volunteer opportunities that align with your skills (teaching, gardening, etc.).</li>
        <li>Be flexible with your dates and destinations to take advantage of the best opportunities.</li>
        <li>Always have a backup plan and travel insurance.</li>
      </ol>

      <h2>Frequently Asked Questions</h2>
      <div className="space-y-4">
        <div>
          <h3>Is it safe to house-sit for strangers?</h3>
          <p>Yes, reputable platforms have verification processes and reviews to ensure safety for both the house-sitter and the homeowner.</p>
        </div>
        <div>
          <h3>Can I travel for free with a family?</h3>
          <p>It's more challenging but possible through home exchanges or large-scale volunteer projects.</p>
        </div>
        <div>
          <h3>Do I need special skills to volunteer?</h3>
          <p>Not necessarily. Many projects need general help like gardening, painting, or social media support.</p>
        </div>
      </div>

      <div className="mt-16 p-8 md:p-10 glass-card rounded-[2rem] border-primary/20 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-4 gradient-text">Save Money for Your Next Trip</h3>
          <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
            Karbali is your personal financial assistant. We help you reduce expenses, discover cheaper alternatives, and find new ways to earn money online tailored to your lifestyle.
          </p>
          <Link
            to="/auth"
            className="clay-primary inline-flex items-center justify-center px-8 py-4 rounded-2xl font-semibold no-underline transition-transform hover:scale-105 active:scale-95"
          >
            Start Saving with Karbali
          </Link>
        </div>
      </div>
    </SEOPageLayout>
  );
};

export default TravelFree;
