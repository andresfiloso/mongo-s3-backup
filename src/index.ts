import 'dotenv/config';
import { CronJob } from 'cron';
import { backup } from './backup';

if (!process.env.BACKUP_CRON_SCHEDULE) {
  throw new Error('Backup cron schedule is not defined.');
}

const isRunOnStartupEnabled = () => {
  return process.env.RUN_ON_STARTUP && process.env.RUN_ON_STARTUP === '1';
};

const job = new CronJob(process.env.BACKUP_CRON_SCHEDULE, async () => {
  try {
    await backup();
  } catch (error) {
    console.error('Error while creating backup: ', error);
  }
});

job.start();

console.log(
  `Backup cron scheduler started: ${process.env.BACKUP_CRON_SCHEDULE}`
);

if (isRunOnStartupEnabled()) {
  console.log(
    `Running backup on startup as RUN_ON_STARTUP is enabled: ${process.env.RUN_ON_STARTUP}`
  );
  backup();
}
