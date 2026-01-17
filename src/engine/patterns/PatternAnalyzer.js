/**
 * PatternAnalyzer - Discovers fighter patterns from fight history
 *
 * Analyzes accumulated fight records to detect behavioral patterns,
 * style tendencies, and career trajectories.
 */

import {
  PatternDefinitions,
  PatternCategory,
  ConfidenceLevel,
  MinSampleSize,
  getPatternDefinition
} from './PatternTypes.js';

export class PatternAnalyzer {
  /**
   * Create analyzer with fight history
   * @param {Array} fightHistory - Array of FightRecord objects
   */
  constructor(fightHistory = []) {
    this.history = fightHistory;
  }

  /**
   * Set fight history
   * @param {Array} history - Fight records
   */
  setHistory(history) {
    this.history = history;
  }

  /**
   * Add a fight to history
   * @param {FightRecord} fight - Fight record to add
   */
  addFight(fight) {
    this.history.push(fight);
  }

  /**
   * Get fights for a specific fighter
   * @param {string} fighterId - Fighter ID
   * @returns {Array} Filtered fights
   */
  getFighterFights(fighterId) {
    return this.history.filter(f =>
      f.fighterA?.id === fighterId || f.fighterB?.id === fighterId
    );
  }

  /**
   * Analyze all patterns for a fighter
   * @param {string} fighterId - Fighter ID
   * @returns {object} Complete pattern analysis
   */
  analyzePatterns(fighterId) {
    const fights = this.getFighterFights(fighterId);

    if (fights.length < MinSampleSize.BASIC) {
      return {
        fighterId,
        fightsAnalyzed: fights.length,
        patterns: [],
        metrics: {},
        confidence: 0,
        message: 'Insufficient fight history for pattern detection'
      };
    }

    // Calculate base metrics
    const metrics = this.calculateMetrics(fighterId, fights);

    // Detect patterns
    const detectedPatterns = this.detectPatterns(metrics, fights.length);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(fights.length, detectedPatterns);

    return {
      fighterId,
      fightsAnalyzed: fights.length,
      patterns: detectedPatterns,
      metrics,
      confidence,
      summary: this.generateSummary(detectedPatterns)
    };
  }

  /**
   * Calculate all metrics for a fighter
   * @param {string} fighterId - Fighter ID
   * @param {Array} fights - Fighter's fights
   * @returns {object} Calculated metrics
   */
  calculateMetrics(fighterId, fights) {
    const metrics = {
      // Basic record
      totalFights: fights.length,
      wins: 0,
      losses: 0,
      draws: 0,
      koWins: 0,
      koLosses: 0,
      decisionWins: 0,

      // Rates
      winRate: 0,
      koRate: 0,
      decisionWinRate: 0,
      timesStoppedRate: 0,

      // Performance metrics
      knockdownsScored: 0,
      knockdownsReceived: 0,
      knockdownsReceivedPerFight: 0,

      // Round-based
      earlyFinishes: 0,
      lateFinishes: 0,
      avgFightLength: 0,

      // Situational
      bigFightWins: 0,
      bigFightLosses: 0,
      bigFightWinRate: 0,

      // Style matchups
      winsVsPressure: 0,
      fightsVsPressure: 0,
      winsVsBoxer: 0,
      fightsVsBoxer: 0,

      // Comeback tracking
      comebackWins: 0,
      comebackOpportunities: 0
    };

    let totalRounds = 0;

    for (const fight of fights) {
      const isA = fight.fighterA?.id === fighterId;
      const won = fight.result?.winner === (isA ? 'A' : 'B');
      const lost = fight.result?.winner === (isA ? 'B' : 'A');
      const method = fight.result?.method;

      // Basic record
      if (won) {
        metrics.wins++;
        if (method === 'KO' || method?.startsWith('TKO')) {
          metrics.koWins++;
        } else if (method === 'DECISION') {
          metrics.decisionWins++;
        }
      } else if (lost) {
        metrics.losses++;
        if (method === 'KO' || method?.startsWith('TKO')) {
          metrics.koLosses++;
        }
      } else {
        metrics.draws++;
      }

      // Round tracking
      const rounds = fight.result?.round || 12;
      totalRounds += rounds;

      if (rounds <= 4) metrics.earlyFinishes++;
      else if (rounds >= 10) metrics.lateFinishes++;

      // Knockdowns from fight data
      const fightData = fight.fightData;
      if (fightData?.totalStats?.knockdowns) {
        const kds = fightData.totalStats.knockdowns;
        metrics.knockdownsScored += isA ? kds.A : kds.B;
        metrics.knockdownsReceived += isA ? kds.B : kds.A;
      }

      // Big fight tracking
      const isBigFight = fight.context?.fightType === 'TITLE_FIGHT' ||
                         fight.context?.stakes;
      if (isBigFight) {
        if (won) metrics.bigFightWins++;
        else if (lost) metrics.bigFightLosses++;
      }

      // Style matchup tracking
      const opponentStyle = isA
        ? fight.fighterB?.style?.primary
        : fight.fighterA?.style?.primary;

      if (this.isPressureStyle(opponentStyle)) {
        metrics.fightsVsPressure++;
        if (won) metrics.winsVsPressure++;
      }
      if (this.isBoxerStyle(opponentStyle)) {
        metrics.fightsVsBoxer++;
        if (won) metrics.winsVsBoxer++;
      }

      // Comeback tracking (simplified - was behind but won)
      if (won && metrics.knockdownsReceived > 0) {
        metrics.comebackWins++;
      }
      if (metrics.knockdownsReceived > 0) {
        metrics.comebackOpportunities++;
      }
    }

    // Calculate rates
    const totalFights = metrics.totalFights;
    metrics.winRate = totalFights > 0 ? metrics.wins / totalFights : 0;
    metrics.koRate = metrics.wins > 0 ? metrics.koWins / metrics.wins : 0;
    metrics.decisionWinRate = metrics.wins > 0 ? metrics.decisionWins / metrics.wins : 0;
    metrics.timesStoppedRate = totalFights > 0 ? metrics.koLosses / totalFights : 0;
    metrics.knockdownsReceivedPerFight = totalFights > 0
      ? metrics.knockdownsReceived / totalFights : 0;
    metrics.avgFightLength = totalFights > 0 ? totalRounds / totalFights : 0;

    // Big fight rate
    const bigFightTotal = metrics.bigFightWins + metrics.bigFightLosses;
    metrics.bigFightWinRate = bigFightTotal > 0
      ? metrics.bigFightWins / bigFightTotal : 0.5;

    // Style matchup rates
    metrics.winRateVsPressure = metrics.fightsVsPressure > 0
      ? metrics.winsVsPressure / metrics.fightsVsPressure : 0.5;
    metrics.winRateVsBoxer = metrics.fightsVsBoxer > 0
      ? metrics.winsVsBoxer / metrics.fightsVsBoxer : 0.5;

    // Comeback rate
    metrics.comebackWinRate = metrics.comebackOpportunities > 0
      ? metrics.comebackWins / metrics.comebackOpportunities : 0;

    return metrics;
  }

  /**
   * Check if style is pressure-based
   */
  isPressureStyle(style) {
    const pressureStyles = ['swarmer', 'pressure-fighter', 'inside-fighter', 'brawler'];
    return pressureStyles.includes(style?.toLowerCase());
  }

  /**
   * Check if style is boxer-based
   */
  isBoxerStyle(style) {
    const boxerStyles = ['out-boxer', 'boxer', 'counter-puncher', 'stick-and-move'];
    return boxerStyles.includes(style?.toLowerCase());
  }

  /**
   * Detect patterns based on metrics
   * @param {object} metrics - Calculated metrics
   * @param {number} fightCount - Number of fights
   * @returns {Array} Detected patterns
   */
  detectPatterns(metrics, fightCount) {
    const patterns = [];

    // Check each pattern definition
    for (const [key, definition] of Object.entries(PatternDefinitions)) {
      const result = this.checkPattern(definition, metrics, fightCount);
      if (result.detected) {
        patterns.push({
          id: definition.id,
          name: definition.name,
          category: definition.category,
          description: definition.description,
          positive: definition.positive,
          confidence: result.confidence,
          evidence: result.evidence,
          effects: definition.effects
        });
      }
    }

    // Sort by confidence
    patterns.sort((a, b) => b.confidence - a.confidence);

    return patterns;
  }

  /**
   * Check if a specific pattern is present
   * @param {object} definition - Pattern definition
   * @param {object} metrics - Fighter metrics
   * @param {number} fightCount - Number of fights
   * @returns {object} Detection result
   */
  checkPattern(definition, metrics, fightCount) {
    const detection = definition.detection;
    const result = {
      detected: false,
      confidence: 0,
      evidence: []
    };

    // Check minimum sample requirements
    const minFights = detection.minFights || detection.minOccurrences || MinSampleSize.BASIC;
    if (fightCount < minFights) {
      return result;
    }

    // Get primary metric value
    const primaryValue = this.getMetricValue(detection.metric, metrics);
    if (primaryValue === null) {
      return result;
    }

    // Check threshold
    let primaryPassed = false;
    if (detection.threshold !== undefined) {
      primaryPassed = primaryValue >= detection.threshold;
    }

    // Check comparison (if exists)
    let comparisonPassed = true;
    if (detection.comparisonMetric) {
      const comparisonValue = this.getMetricValue(detection.comparisonMetric, metrics);
      if (comparisonValue !== null && detection.comparisonDelta !== undefined) {
        const delta = primaryValue - comparisonValue;
        comparisonPassed = detection.comparisonDelta > 0
          ? delta >= detection.comparisonDelta
          : delta <= detection.comparisonDelta;
      }
    }

    // Check secondary metric (if exists)
    let secondaryPassed = true;
    if (detection.metric2 && detection.threshold2 !== undefined) {
      const secondaryValue = this.getMetricValue(detection.metric2, metrics);
      if (secondaryValue !== null) {
        secondaryPassed = secondaryValue >= detection.threshold2 ||
                          secondaryValue <= detection.threshold2; // Depends on context
      }
    }

    // Determine if pattern detected
    result.detected = primaryPassed && comparisonPassed && secondaryPassed;

    if (result.detected) {
      // Calculate confidence based on sample size and margin
      result.confidence = this.calculatePatternConfidence(
        fightCount,
        primaryValue,
        detection.threshold
      );

      // Build evidence
      result.evidence.push(`${detection.metric}: ${(primaryValue * 100).toFixed(1)}%`);
      if (detection.comparisonMetric) {
        const compValue = this.getMetricValue(detection.comparisonMetric, metrics);
        result.evidence.push(`vs ${detection.comparisonMetric}: ${(compValue * 100).toFixed(1)}%`);
      }
    }

    return result;
  }

  /**
   * Get metric value by name
   */
  getMetricValue(metricName, metrics) {
    // Direct metrics
    if (metrics[metricName] !== undefined) {
      return metrics[metricName];
    }

    // Derived metrics
    const derivedMetrics = {
      overallWinRate: metrics.winRate,
      earlyRoundWinRate: metrics.earlyFinishes / Math.max(1, metrics.totalFights),
      lateRoundWinRate: metrics.lateFinishes / Math.max(1, metrics.totalFights)
    };

    return derivedMetrics[metricName] ?? null;
  }

  /**
   * Calculate confidence for a detected pattern
   */
  calculatePatternConfidence(fightCount, actualValue, threshold) {
    // Base confidence from sample size
    let confidence = 0;
    if (fightCount >= MinSampleSize.DEFINITIVE) {
      confidence = ConfidenceLevel.VERY_HIGH;
    } else if (fightCount >= MinSampleSize.STRONG) {
      confidence = ConfidenceLevel.HIGH;
    } else if (fightCount >= MinSampleSize.RELIABLE) {
      confidence = ConfidenceLevel.MODERATE;
    } else {
      confidence = ConfidenceLevel.LOW;
    }

    // Boost confidence if well above threshold
    if (threshold && actualValue > threshold * 1.2) {
      confidence = Math.min(0.95, confidence + 0.1);
    }

    return confidence;
  }

  /**
   * Calculate overall confidence in analysis
   */
  calculateOverallConfidence(fightCount, patterns) {
    if (fightCount < MinSampleSize.BASIC) return 0;

    const baseConfidence = Math.min(0.9, fightCount / 15);
    const patternBonus = patterns.length > 0 ? 0.1 : 0;

    return Math.min(0.95, baseConfidence + patternBonus);
  }

  /**
   * Generate human-readable summary of patterns
   */
  generateSummary(patterns) {
    if (patterns.length === 0) {
      return 'No distinctive patterns detected yet.';
    }

    const positive = patterns.filter(p => p.positive === true);
    const negative = patterns.filter(p => p.positive === false);
    const neutral = patterns.filter(p => p.positive === null);

    const parts = [];

    if (positive.length > 0) {
      parts.push(`Strengths: ${positive.map(p => p.name).join(', ')}`);
    }
    if (negative.length > 0) {
      parts.push(`Weaknesses: ${negative.map(p => p.name).join(', ')}`);
    }
    if (neutral.length > 0) {
      parts.push(`Tendencies: ${neutral.map(p => p.name).join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Get patterns that affect a specific situation
   * @param {string} fighterId - Fighter ID
   * @param {string} situation - Situation type (e.g., 'title_fight', 'vs_pressure')
   * @returns {Array} Relevant patterns with effects
   */
  getPatternsForSituation(fighterId, situation) {
    const analysis = this.analyzePatterns(fighterId);

    const situationMapping = {
      title_fight: ['clutch_performer', 'chokes_under_pressure'],
      early_rounds: ['slow_starter', 'fast_starter'],
      late_rounds: ['slow_starter', 'fast_starter', 'fades_late', 'cardio_machine'],
      when_hurt: ['comeback_specialist', 'warrior_heart', 'glass_chin'],
      vs_pressure: ['pressure_destroyer'],
      vs_boxer: ['boxer_killer']
    };

    const relevantIds = situationMapping[situation] || [];

    return analysis.patterns.filter(p => relevantIds.includes(p.id));
  }

  /**
   * Calculate cumulative effects from all patterns
   * @param {string} fighterId - Fighter ID
   * @returns {object} Combined effects
   */
  getCumulativeEffects(fighterId) {
    const analysis = this.analyzePatterns(fighterId);
    const effects = {};

    for (const pattern of analysis.patterns) {
      if (pattern.effects) {
        for (const [effectKey, effectValue] of Object.entries(pattern.effects)) {
          effects[effectKey] = (effects[effectKey] || 0) + effectValue * pattern.confidence;
        }
      }
    }

    return effects;
  }
}

export default PatternAnalyzer;
