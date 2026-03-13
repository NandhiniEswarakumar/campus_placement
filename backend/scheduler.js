const PlacementDrive = require('./models/PlacementDrive');
const DriveApplication = require('./models/DriveApplication');
const Student = require('./models/Student');
const { createManyNotifications } = require('./services/notificationService');

/**
 * Runs every 10 minutes.
 * For each upcoming/ongoing drive that has a deadline within the next 1 hour:
 *   - Find eligible students who haven't applied yet
 *   - Send them a "pending submission" reminder (once per window)
 *
 * Notification windows:
 *   - 1 hour before deadline   (50-60 min remaining)
 *   - 30 minutes before deadline (20-30 min remaining)
 */
async function checkDeadlineReminders() {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Find drives with deadlines in the next 1 hour that are still open
    const drives = await PlacementDrive.find({
      deadline: { $gt: now, $lte: oneHourLater },
      status: { $in: ['upcoming', 'ongoing'] },
    });

    for (const drive of drives) {
      const minutesLeft = Math.round((new Date(drive.deadline) - now) / 60000);

      // Determine which reminder window we're in
      let reminderTag = null;
      if (minutesLeft > 50 && minutesLeft <= 60) {
        reminderTag = '1hr';
      } else if (minutesLeft > 20 && minutesLeft <= 30) {
        reminderTag = '30min';
      }

      if (!reminderTag) continue;

      // Build student filter for eligible departments
      const studentFilter = {};
      if (drive.eligibleDepartments && drive.eligibleDepartments.length > 0) {
        studentFilter.department = { $in: drive.eligibleDepartments };
      }

      const eligibleStudents = await Student.find(studentFilter).select('_id');
      const eligibleIds = eligibleStudents.map((s) => s._id);

      // Students who already applied
      const appliedDocs = await DriveApplication.find({
        drive: drive._id,
        student: { $in: eligibleIds },
      }).select('student');
      const appliedSet = new Set(appliedDocs.map((a) => a.student.toString()));

      // Students who haven't applied
      const notApplied = eligibleIds.filter((id) => !appliedSet.has(id.toString()));

      if (notApplied.length === 0) continue;

      // Check if we already sent this specific reminder (avoid duplicates)
      const tagMessage = reminderTag === '1hr'
        ? `⏰ Reminder: "${drive.title}" deadline is in ~1 hour. Submit your resume now!`
        : `⚠️ Last call: "${drive.title}" deadline is in ~30 minutes. Apply before it's too late!`;

      // Check if notifications already sent for this drive + tag
      const Notification = require('./models/Notification');
      const alreadySent = await Notification.findOne({
        relatedDrive: drive._id,
        type: 'drive_announced',
        message: { $regex: reminderTag === '1hr' ? '~1 hour' : '~30 minutes' },
        recipient: { $in: notApplied },
      });

      if (alreadySent) continue;

      const notifications = notApplied.map((studentId) => ({
        recipient: studentId,
        recipientModel: 'Student',
        type: 'drive_announced', // reuse existing enum value
        title: 'Pending Submission',
        message: tagMessage,
        relatedDrive: drive._id,
      }));

      if (notifications.length > 0) {
        await createManyNotifications(notifications);
        console.log(
          `[Scheduler] Sent ${reminderTag} reminders to ${notifications.length} students for "${drive.title}"`
        );
      }
    }
  } catch (error) {
    console.error('[Scheduler] Deadline reminder error:', error);
  }
}

// Run every 10 minutes
function startDeadlineScheduler() {
  console.log('[Scheduler] Deadline reminder scheduler started (every 10 min)');
  // Run once on startup
  checkDeadlineReminders();
  // Then every 10 minutes
  setInterval(checkDeadlineReminders, 10 * 60 * 1000);
}

module.exports = { startDeadlineScheduler };
