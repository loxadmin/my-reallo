import SEOPageLayout from "@/components/SEOPageLayout";
import { Link } from "react-router-dom";

const ReduceExpenses = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to Reduce Your Monthly Expenses in Nigeria",
    "description": "Practical tips and strategies to cut down on food, electricity, and transportation costs in Nigeria.",
    "author": {
      "@type": "Organization",
      "name": "Karbali"
    }
  };

  return (
    <SEOPageLayout
      title="How to Reduce Expenses in Nigeria: Practical Tips"
      description="Learn how to significantly reduce your monthly expenses in Nigeria by optimizing your spending on food, power, and transport. Start saving more today."
      schemaData={schemaData}
    >
      <h1>How to Reduce Your Monthly Expenses in Nigeria</h1>

      <p className="lead">
        You can reduce your monthly expenses in Nigeria by bulk buying food, using energy-efficient appliances, and utilizing ride-sharing or public transport.
      </p>

      <p>
        With the rising cost of living, managing your finances effectively is more important than ever. Small changes in your daily habits can lead to significant savings over time.
      </p>

      <h2>Top 5 Ways to Cut Costs Today</h2>
      <ol>
        <li><strong>Food & Groceries:</strong> Buy non-perishable items in bulk from open markets rather than supermarkets.</li>
        <li><strong>Electricity:</strong> Switch to LED bulbs and unplug appliances when not in use to reduce your prepaid meter consumption.</li>
        <li><strong>Transportation:</strong> Use ride-sharing apps during off-peak hours or consider carpooling with colleagues.</li>
        <li><strong>Subscriptions:</strong> Review your cable TV and internet bundles. Switch to plans that only include what you actually watch/use.</li>
        <li><strong>Dining Out:</strong> Limit eating out and try meal prepping for the week to save on lunch costs.</li>
      </ol>

      <h2>How to Create a Budget That Works</h2>
      <ol>
        <li>Track every single kobo you spend for one full month.</li>
        <li>Categorize your spending into "Needs" and "Wants."</li>
        <li>Set a realistic limit for each category based on your income.</li>
        <li>Use cash for "Wants" to avoid overspending on your card.</li>
        <li>Review and adjust your budget at the end of every month.</li>
      </ol>

      <h2>Frequently Asked Questions</h2>
      <div className="space-y-4">
        <div>
          <h3>What is the 50/30/20 rule?</h3>
          <p>It's a simple budgeting method: 50% of your income goes to Needs, 30% to Wants, and 20% to Savings and Debt Repayment.</p>
        </div>
        <div>
          <h3>How can I save money on rent in Nigeria?</h3>
          <p>Consider living slightly further from central business districts or getting a flatmate to share the costs.</p>
        </div>
        <div>
          <h3>Is it better to save or invest?</h3>
          <p>You should first build an emergency fund (savings) and then start investing to grow your wealth over the long term.</p>
        </div>
      </div>

      <div className="mt-12 p-6 glass-card rounded-2xl border border-primary/20">
        <h3>Let AI Help You Save</h3>
        <p>
          Karbali is a financial assistant platform that helps users reduce expenses, discover cheaper alternatives, and earn money online based on their lifestyle.
        </p>
        <Link to="/auth" className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-xl font-medium no-underline">
          Get Started with Karbali
        </Link>
      </div>
    </SEOPageLayout>
  );
};

export default ReduceExpenses;
