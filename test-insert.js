import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testInsert() {
  console.log('Testing insert...');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      full_name: 'Test Agent',
      email: 'test@agent.com',
      phone: '1234567890',
      organization: 'Agent',
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

testInsert();
