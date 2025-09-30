/**
 * Submission Test Fixtures
 * Sample submission data for testing
 */

module.exports = {
  // Basic submission
  basic: {
    status: 'submitted',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    metadata: {},
    submitted_at: new Date('2025-09-30T10:00:00Z'),
  },

  // Draft submission
  draft: {
    status: 'draft',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    metadata: { draft_saved: true },
    submitted_at: new Date('2025-09-30T09:00:00Z'),
  },

  // Approved submission
  approved: {
    status: 'approved',
    ip_address: '10.0.0.50',
    user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
    metadata: {
      approved_by: 'manager_id',
      approved_at: '2025-09-30T12:00:00Z',
      notes: 'Looks good',
    },
    submitted_at: new Date('2025-09-30T10:00:00Z'),
  },

  // Rejected submission
  rejected: {
    status: 'rejected',
    ip_address: '172.16.0.25',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    metadata: {
      rejected_by: 'manager_id',
      rejected_at: '2025-09-30T11:30:00Z',
      reason: 'Incomplete information',
    },
    submitted_at: new Date('2025-09-30T10:00:00Z'),
  },

  // Archived submission
  archived: {
    status: 'archived',
    ip_address: '192.168.0.1',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    metadata: {
      archived_by: 'admin_id',
      archived_at: '2025-09-30T15:00:00Z',
    },
    submitted_at: new Date('2025-09-29T10:00:00Z'),
  },

  // Submission with rich metadata
  withMetadata: {
    status: 'submitted',
    ip_address: '203.0.113.42',
    user_agent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
    metadata: {
      browser: 'Safari',
      os: 'iOS',
      device: 'tablet',
      screen: { width: 1024, height: 768 },
      location: {
        country: 'TH',
        city: 'Bangkok',
        timezone: 'Asia/Bangkok',
      },
      submission_duration: 180, // seconds
      form_version: 2,
    },
    submitted_at: new Date('2025-09-30T14:30:00Z'),
  },

  // Mobile submission
  mobile: {
    status: 'submitted',
    ip_address: '192.168.43.1',
    user_agent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
    metadata: {
      device: 'mobile',
      os: 'Android',
      browser: 'Chrome Mobile',
    },
    submitted_at: new Date('2025-09-30T13:00:00Z'),
  },

  // Submission from different location
  remote: {
    status: 'submitted',
    ip_address: '8.8.8.8',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
    metadata: {
      location: {
        country: 'US',
        city: 'Mountain View',
      },
      vpn: true,
    },
    submitted_at: new Date('2025-09-30T08:00:00Z'),
  },

  // Invalid submissions for testing
  invalid: {
    noStatus: {
      ip_address: '127.0.0.1',
      user_agent: 'Test Browser',
      metadata: {},
    },
    invalidStatus: {
      status: 'invalid_status',
      ip_address: '127.0.0.1',
      user_agent: 'Test Browser',
      metadata: {},
    },
    invalidIP: {
      status: 'submitted',
      ip_address: '999.999.999.999',
      user_agent: 'Test Browser',
      metadata: {},
    },
  },
};