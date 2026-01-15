/**
 * Broadcast Team Base Class
 *
 * Abstract base for different broadcast teams (HBO, ESPN, Showtime, etc.)
 * Each team has different commentators with unique personalities.
 */

export class BroadcastTeam {
  constructor(teamName) {
    this.teamName = teamName;
    this.fighterA = null;
    this.fighterB = null;
    this.fighterAShort = null;
    this.fighterBShort = null;
    this.lastSpeaker = null;
    this.exchangeCount = 0;

    // Commentator roles
    this.playByPlay = null;      // Main announcer
    this.colorCommentator = null; // Color/entertainment
    this.analyst = null;          // Expert analysis
    this.scorer = null;           // Unofficial scorer (optional)
  }

  initialize(fighterA, fighterB) {
    this.fighterA = fighterA;
    this.fighterB = fighterB;
    this.fighterAShort = fighterA.nickname || fighterA.name.split(' ').pop();
    this.fighterBShort = fighterB.nickname || fighterB.name.split(' ').pop();
  }

  /**
   * Get fighter name with variety
   */
  getName(fighter, style = 'short') {
    const f = fighter === 'A' ? this.fighterA : this.fighterB;
    const short = fighter === 'A' ? this.fighterAShort : this.fighterBShort;

    if (style === 'full') return f.name;
    if (style === 'short') return short;
    if (style === 'nickname' && f.nickname) return `"${f.nickname}"`;
    return short;
  }

  /**
   * Random selection helper
   */
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Madlibs-style template filling
   */
  fill(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Format punch name for display
   */
  formatPunchName(punchType) {
    const names = {
      'jab': 'jab',
      'cross': 'right hand',
      'lead_hook': 'left hook',
      'rear_hook': 'right hook',
      'lead_uppercut': 'left uppercut',
      'rear_uppercut': 'right uppercut',
      'body_jab': 'body jab',
      'body_cross': 'right hand to the body',
      'body_hook_lead': 'left hook to the body',
      'body_hook_rear': 'right hook to the body'
    };
    return names[punchType] || punchType;
  }

  // ============================================================================
  // ABSTRACT METHODS - Override in subclasses
  // ============================================================================

  /**
   * Generate commentary for an event
   * @param {Object} event - The fight event
   * @param {Object} fightState - Current fight state
   * @returns {Array} Array of { speaker, text, priority } objects
   */
  generateCommentary(event, fightState) {
    throw new Error('generateCommentary must be implemented by subclass');
  }

  /**
   * Generate scorecard update (if team has a scorer)
   * @param {number} round - Current round
   * @param {number} scoreA - Fighter A's score
   * @param {number} scoreB - Fighter B's score
   * @param {Object} statsA - Fighter A's stats
   * @param {Object} statsB - Fighter B's stats
   * @returns {Array} Array of { speaker, text, priority } objects
   */
  generateScorecardUpdate(round, scoreA, scoreB, statsA, statsB) {
    return []; // Default: no scorer
  }

  /**
   * Get team info
   */
  getTeamInfo() {
    return {
      name: this.teamName,
      playByPlay: this.playByPlay?.name || 'Unknown',
      colorCommentator: this.colorCommentator?.name || 'Unknown',
      analyst: this.analyst?.name || 'Unknown',
      scorer: this.scorer?.name || null
    };
  }
}

// ============================================================================
// BROADCAST TEAM REGISTRY
// ============================================================================

const broadcastTeams = {};

export function registerBroadcastTeam(teamId, teamClass) {
  broadcastTeams[teamId] = teamClass;
}

export function getBroadcastTeam(teamId) {
  return broadcastTeams[teamId];
}

export function getAvailableTeams() {
  return Object.keys(broadcastTeams);
}

export function createBroadcastTeam(teamId) {
  const TeamClass = broadcastTeams[teamId];
  if (!TeamClass) {
    throw new Error(`Unknown broadcast team: ${teamId}. Available: ${Object.keys(broadcastTeams).join(', ')}`);
  }
  return new TeamClass();
}
