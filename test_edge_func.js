import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testChat() {
  console.log("Invoking karbali-chat...");
  const { data, error } = await supabase.functions.invoke('karbali-chat', {
    body: {
      messages: [{ role: 'user', content: 'Hi' }],
      profile: { email: 'test@example.com', queue_position: 100 }
    }
  });

  if (error) {
    console.error("Error invoking function:", error);
    if (error.context) {
       const text = await error.context.text();
       console.log("Error text:", text);
    }
  } else {
    console.log("Response data:", data);
  }
}

testChat();
