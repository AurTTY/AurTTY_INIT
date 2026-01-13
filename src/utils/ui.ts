import chalk from 'chalk';

export function displayBanner(): void {
  console.log(chalk.blue('Spring Init CLI'));
}

export function displaySuccess(message: string): void {
  console.log(chalk.green('✓ ' + message));
}

export function displayError(message: string): void {
  console.log(chalk.red('✗ ' + message));
}

export function displayInfo(message: string): void {
  console.log(chalk.blue('ℹ ' + message));
}

export function showSuccessMessage(message: string): void {
  displaySuccess(message);
}

export function showError(message: string): void {
  displayError(message);
}

export function showWarning(message: string): void {
  console.log(chalk.yellow('⚠ ' + message));
}

export function showInfo(message: string): void {
  displayInfo(message);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function createProgressBar(total: number): any {
  // Placeholder for progress bar
  return {
    update: (current: number) => {},
    stop: () => {}
  };
}