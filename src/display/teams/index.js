/**
 * Broadcast Teams Index
 *
 * Export all available broadcast teams.
 * New teams can be added by:
 * 1. Creating a new team file (e.g., ESPNTeam.js)
 * 2. Importing and registering it here
 */

// Import teams (this also registers them)
import './HBOTeam.js';

// Re-export utilities from BroadcastTeam
export {
  BroadcastTeam,
  registerBroadcastTeam,
  getBroadcastTeam,
  getAvailableTeams,
  createBroadcastTeam
} from '../BroadcastTeam.js';

// Import individual teams for direct access
export { HBOTeam } from './HBOTeam.js';

/**
 * Future teams to add:
 *
 * - ESPNTeam: Max Kellerman, Timothy Bradley, Andre Ward
 * - ShowtimeTeam: Al Bernstein, Mauro Ranallo, Paulie Malignaggi
 * - DAZNTeam: Various commentators
 * - SkySportsTeam: Adam Smith, Carl Froch, Johnny Nelson
 * - PBCTeam: Brian Custer, Shawn Porter
 * - TopRankTeam: Bob Papa, Andre Ward, Tim Bradley
 * - GoldenBoyTeam: Various
 * - ClassicTeam: Howard Cosell, Don Dunphy (vintage style)
 */
