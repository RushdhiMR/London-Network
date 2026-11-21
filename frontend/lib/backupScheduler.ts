import { createArticleBackup, readManifest } from '@/lib/articleBackupService';

let schedulerInitialized = false;

/**
 * Initializes server-side automated daily article backup scheduler.
 * Runs in nodejs server runtime independently of website visits.
 */
export function initBackupScheduler() {
  if (schedulerInitialized) return;
  schedulerInitialized = true;

  console.log('[BackupScheduler] Initializing automated daily article backup scheduler (Rolling 5-Day Retention)...');

  const checkAndRunDailyBackup = async () => {
    try {
      const now = new Date();
      const todayDateKey = now.toISOString().split('T')[0];
      const manifest = readManifest();

      const alreadyRanToday = manifest.backups.some((b) => {
        if (b.type !== 'daily') return false;
        const bDateKey = new Date(b.timestamp).toISOString().split('T')[0];
        return bDateKey === todayDateKey && b.status === 'Successful';
      });

      if (!alreadyRanToday) {
        console.log(`[BackupScheduler] Triggering automatic daily backup for ${todayDateKey}...`);
        await createArticleBackup({ isManual: false });
      }
    } catch (err) {
      console.error('[BackupScheduler] Scheduled execution error:', err);
    }
  };

  // 1. Initial check after server startup delay (20 seconds)
  setTimeout(checkAndRunDailyBackup, 20000);

  // 2. Periodic hourly verification check to guarantee execution at day rollover
  setInterval(checkAndRunDailyBackup, 60 * 60 * 1000);
}
