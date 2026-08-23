/**
 * Shortcut wrapper to run database migrations
 * Usage:
 *   node migrate.js            (Run pending migrations)
 *   node migrate.js --status   (Check migration status)
 */
require('./scripts/migrator');
