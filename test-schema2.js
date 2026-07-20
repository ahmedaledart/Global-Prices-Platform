import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqqbbaylcmmtyutymqpa.supabase.co';
const supabaseAnonKey = 'sb_publishable_J-BGf6na5ax4-_oSdJ4Zsw_qdKaerP9';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSchema() {
  console.log('Testing insert into messages...');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      full_name: 'Test Agent',
      email: 'test@agent.com',
      phone: '1234567890',
      organization: 'Org',
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
