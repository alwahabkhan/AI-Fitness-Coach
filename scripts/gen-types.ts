import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import { getServerEnv } from '../lib/env';

dotenv.config({ path: '.env.local' });

const env = getServerEnv();
const projectRef = env.PROJECT_REF;

if (!projectRef) {
  console.error('Error: PROJECT_REF is not defined in .env.local');
  process.exit(1);
}

const command = `npx supabase gen types typescript --project-id "${projectRef}" --schema public > ./database/database.types.ts`;

exec(command, (error: Error | null, stdout: string, stderr: string) => {
  if (error) {
    console.error(`Error generating types: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }
  console.log('TypeScript types generated successfully!');
});
