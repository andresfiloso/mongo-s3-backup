import 'dotenv/config';
import { CronJob } from 'cron';
import { backup } from './backup';

if (!process.env.BACKUP_CRON_SCHEDULE) {
  throw new Error('Backup cron schedule is not defined.');
}

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
