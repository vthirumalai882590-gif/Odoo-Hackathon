import { db, doc, setDoc } from './firebase';
import type { Employee, Badge, AppNotification } from '../types';

export async function checkAndAwardBadges(
  employee: Employee,
  badges: Badge[],
  completedChallengesCount: number,
  csrParticipationsCount: number,
  onAward?: (badge: Badge) => void
): Promise<Badge[]> {
  const newlyAwarded: Badge[] = [];
  const updatedBadgeIds = [...(employee.badgeIds || [])];

  for (const badge of badges) {
    if (updatedBadgeIds.includes(badge.id)) continue;

    let qualified = false;
    const { metric, threshold } = badge.unlockRule;

    if (metric === 'XP' && employee.xp >= threshold) {
      qualified = true;
    } else if (metric === 'CompletedChallenges' && completedChallengesCount >= threshold) {
      qualified = true;
    } else if (metric === 'CSRParticipations' && csrParticipationsCount >= threshold) {
      qualified = true;
    }

    if (qualified) {
      newlyAwarded.push(badge);
      updatedBadgeIds.push(badge.id);

      // Create notification
      const notifId = `notif-${Math.random().toString(36).substring(2, 9)}`;
      const notif: AppNotification = {
        id: notifId,
        type: 'BadgeUnlocked',
        recipientEmployeeId: employee.id,
        message: `Congratulations! You unlocked the badge: "${badge.name}" (${badge.description})`,
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notifId), notif);

      if (onAward) {
        onAward(badge);
      }
    }
  }

  if (newlyAwarded.length > 0) {
    await setDoc(doc(db, 'employees', employee.id), { badgeIds: updatedBadgeIds }, { merge: true });
  }

  return newlyAwarded;
}
