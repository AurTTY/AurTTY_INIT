import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function runTests(projectPath: string): Promise<void> {
  try {
    await execAsync('npm test', { cwd: projectPath });
  } catch (error) {
    console.log('Tests failed or not configured');
  }
}