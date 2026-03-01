import Layout from "@/components/Layout";
import VerifySpendFlow from "@/components/VerifySpendFlow";

const Verify = () => {
  return (
    <Layout>
      <div className="space-y-6 pb-20">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">Verify</h1>
        </header>

        <VerifySpendFlow />
      </div>
    </Layout>
  );
};

export default Verify;
