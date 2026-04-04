// User roles
export const ROLES = {
  MEMBER: 'member',
  LEADER: 'leader',
  ADMIN: 'admin',
};

// Role display labels
export const ROLE_LABELS = {
  member: 'Member',
  leader: 'Leader',
  admin: 'Admin',
};

// Role-based redirect paths
export const ROLE_ROUTES = {
  member: '/member/dashboard',
  leader: '/leader/dashboard',
  admin: '/admin/dashboard',
};

// Devotion calendar colors
export const DEVOTION_STATUS = {
  SUBMITTED: 'submitted',   // green
  MISSING: 'missing',       // red
  FUTURE: 'future',         // gray
  TODAY: 'today',           // highlighted
};

// Time filter options
export const TIME_FILTERS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};

export const TIME_FILTER_LABELS = {
  weekly: 'This Week',
  monthly: 'This Month',
  yearly: 'This Year',
};

// Message constants
export const MAX_MESSAGE_LENGTH = 2000;
export const MESSAGES_PER_PAGE = 50;

// Image upload constants
export const MAX_IMAGE_SIZE_MB = 2;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
