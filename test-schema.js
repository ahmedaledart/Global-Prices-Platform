import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testSchema() {
  console.log('Testing insert without organization...');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      full_name: 'Test Agent',
      email: 'test@agent.com',
      phone: '1234567890',
      subject: 'Test Subject',
      message: 'Test Message',
      status: 'new',
      is_read: false
    })
    .select();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success! Data:', data);
  }
}

testSchema();
