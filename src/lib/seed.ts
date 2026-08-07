// Sample content for the gallery "Try it live" demo, so it opens full instead of
// empty. Only ever runs in demo mode against a throwaway workspace (see store).

import { createProject, logEntry, newEntryId, newProjectId, startEntry } from './actions'
import type { Draft } from './events'

/** ISO for `daysAgo` at local `hour:minute`. */
function at(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** ISO `minsAgo` minutes before now. */
function minsAgo(mins: number): string {
  return new Date(Date.now() - mins * 60000).toISOString()
}

export async function seedDemo(dispatch: (d: Draft[]) => Promise<void>): Promise<void> {
  const web = newProjectId()
  const mobile = newProjectId()
  const admin = newProjectId()
  const writing = newProjectId()

  const drafts: Draft[] = [
    createProject(web, { name: 'Acme/Website', color: 'teal' }),
    createProject(mobile, { name: 'Acme/Mobile app', color: 'violet' }),
    createProject(admin, { name: 'Internal/Admin', color: 'amber' }),
    createProject(writing, { name: 'Writing', color: 'blue' }),

    // Two live, concurrent timers — still ticking when you open the demo.
    startEntry(newEntryId(), {
      projectId: web,
      title: 'Homepage hero polish',
      tags: ['design'],
      startedAt: minsAgo(38),
    }),
    startEntry(newEntryId(), {
      projectId: admin,
      title: 'Email + Slack',
      tags: ['comms'],
      startedAt: minsAgo(12),
    }),

    // Today
    logEntry(newEntryId(), {
      projectId: web,
      title: 'Nav refactor',
      description:
        'Split the mega-nav into two levels.\n\n- Collapsed the resources menu\n- Fixed the mobile drawer overlap\n\nStill need to confirm the **keyboard focus order** with design.',
      tags: ['dev'],
      startedAt: at(0, 9, 15),
      endedAt: at(0, 10, 45),
    }),
    logEntry(newEntryId(), {
      projectId: admin,
      title: 'Standup + weekly planning',
      tags: ['meeting'],
      startedAt: at(0, 11, 0),
      endedAt: at(0, 11, 30),
    }),

    // Yesterday
    logEntry(newEntryId(), {
      projectId: mobile,
      title: 'Onboarding screens',
      tags: ['design'],
      startedAt: at(1, 13, 0),
      endedAt: at(1, 15, 30),
    }),
    logEntry(newEntryId(), {
      projectId: writing,
      title: 'Draft launch blog post',
      tags: ['writing'],
      startedAt: at(1, 16, 0),
      endedAt: at(1, 17, 15),
    }),

    // Two days ago
    logEntry(newEntryId(), {
      projectId: web,
      title: 'API integration',
      tags: ['dev'],
      startedAt: at(2, 10, 0),
      endedAt: at(2, 12, 0),
    }),
  ]

  await dispatch(drafts)
}
