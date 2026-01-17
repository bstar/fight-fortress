/**
 * MethodPredictor - Detailed fight outcome method prediction
 *
 * Predicts not just KO/TKO/Decision but also:
 * - Which fighter gets the stoppage
 * - Likely round for stoppage
 * - Type of stoppage (KO punch, TKO referee stoppage, corner stoppage)
 */

/**
 * Stoppage type distributions based on power and aggression
 */
const STOPPAGE_TYPES = {
  knockout: {
    description: 'Clean knockout (fighter doesn\'t beat the count)',
    minPower: 75,
    factors: ['knockoutPower', 'powerRight', 'timing']
  },
  tko_referee: {
    description: 'Referee stoppage (fighter taking too much punishment)',
    minPower: 0,
    factors: ['workRate', 'accuracy', 'combinations']
  },
  tko_corner: {
    description: 'Corner stoppage (corner throws in towel)',
    minPower: 0,
    factors: ['damageAccumulation', 'cuts', 'swelling']
  },
  tko_injury: {
    description: 'Injury stoppage (cuts, swelling, body shots)',
    minPower: 60,
    factors: ['bodyPunching', 'cutProduction']
  }
};

/**
 * Round distribution patterns for stoppages
 */
const ROUND_DISTRIBUTION = {
  early: {
    rounds: [1, 2, 3, 4],
    probability: 0.35,
    factors: ['power', 'aggression', 'chinVulnerability']
  },
  middle: {
    rounds: [5, 6, 7, 8],
    probability: 0.40,
    factors: ['cardio', 'bodyWork', 'accumulation']
  },
  late: {
    rounds: [9, 10, 11, 12],
    probability: 0.25,
    factors: ['cardio', 'conditioning', 'experience']
  }
};

export class MethodPredictor {
  /**
   * Create method predictor
   * @param {object} options - Predictor options
   */
  constructor(options = {}) {
    this.scheduledRounds = options.scheduledRounds || 12;
  }

  /**
   * Predict detailed method breakdown
   * @param {object} fighterA - Fighter A data
   * @param {object} fighterB - Fighter B data
   * @param {object} context - Fight context
   * @returns {object} Detailed method prediction
   */
  predict(fighterA, fighterB, context = {}) {
    const rounds = context.rounds || this.scheduledRounds;

    // Calculate stoppage probability
    const stoppageProb = this.calculateStoppageProbability(fighterA, fighterB);

    // If likely decision
    if (stoppageProb.total < 0.40) {
      return this.predictDecision(fighterA, fighterB, stoppageProb);
    }

    // Calculate who gets the stoppage
    const stoppageBreakdown = this.calculateStoppageBreakdown(fighterA, fighterB);

    // Calculate round distribution
    const roundPrediction = this.predictStoppageRound(fighterA, fighterB, rounds);

    // Calculate stoppage type
    const stoppageType = this.predictStoppageType(fighterA, fighterB);

    return {
      mostLikely: stoppageBreakdown.favoredMethod,
      stoppageProbability: stoppageProb.total,
      decisionProbability: 1 - stoppageProb.total - 0.03, // 3% draw
      drawProbability: 0.03,

      breakdown: {
        koByA: stoppageBreakdown.koByA,
        koByB: stoppageBreakdown.koByB,
        tkoByA: stoppageBreakdown.tkoByA,
        tkoByB: stoppageBreakdown.tkoByB,
        decisionA: stoppageBreakdown.decisionA,
        decisionB: stoppageBreakdown.decisionB,
        draw: 0.03
      },

      stoppageType,
      roundPrediction,

      narrative: this.generateNarrative(
        fighterA, fighterB,
        stoppageBreakdown, roundPrediction, stoppageType
      )
    };
  }

  /**
   * Calculate overall stoppage probability
   */
  calculateStoppageProbability(fighterA, fighterB) {
    const powerA = fighterA.power?.knockoutPower || 70;
    const powerB = fighterB.power?.knockoutPower || 70;
    const chinA = fighterA.mental?.chin || 75;
    const chinB = fighterB.mental?.chin || 75;
    const cardioA = fighterA.stamina?.cardio || 75;
    const cardioB = fighterB.stamina?.cardio || 75;

    // Base stoppage rate
    let stoppageRate = 0.45;

    // High power increases stoppage rate
    stoppageRate += ((powerA + powerB) / 2 - 70) / 100;

    // Low chins increase stoppage rate
    stoppageRate += ((150 - chinA - chinB) / 2) / 150;

    // Low cardio increases late stoppage rate
    if (cardioA < 70 || cardioB < 70) {
      stoppageRate += 0.08;
    }

    // KO vs TKO split
    const avgPower = (powerA + powerB) / 2;
    const koRatio = Math.min(0.6, avgPower / 150);

    return {
      total: Math.min(0.80, Math.max(0.25, stoppageRate)),
      koShare: koRatio,
      tkoShare: 1 - koRatio
    };
  }

  /**
   * Calculate who gets the stoppage
   */
  calculateStoppageBreakdown(fighterA, fighterB) {
    const powerA = fighterA.power?.knockoutPower || 70;
    const powerB = fighterB.power?.knockoutPower || 70;
    const chinA = fighterA.mental?.chin || 75;
    const chinB = fighterB.mental?.chin || 75;
    const accuracyA = fighterA.offense?.powerAccuracy || 70;
    const accuracyB = fighterB.offense?.powerAccuracy || 70;

    // KO factor: power vs chin
    const koFactorA = (powerA * (accuracyA / 100)) / chinB;
    const koFactorB = (powerB * (accuracyB / 100)) / chinA;

    const totalKoFactor = koFactorA + koFactorB;

    // Normalize
    const koShareA = koFactorA / totalKoFactor;
    const koShareB = koFactorB / totalKoFactor;

    // Calculate actual probabilities
    const stoppageProb = this.calculateStoppageProbability(fighterA, fighterB);
    const koProb = stoppageProb.total * stoppageProb.koShare;
    const tkoProb = stoppageProb.total * stoppageProb.tkoShare;

    const decisionProb = 1 - stoppageProb.total - 0.03;

    // Decision split based on overall skill
    const skillA = this.calculateOverallSkill(fighterA);
    const skillB = this.calculateOverallSkill(fighterB);
    const totalSkill = skillA + skillB;

    return {
      koByA: koProb * koShareA,
      koByB: koProb * koShareB,
      tkoByA: tkoProb * koShareA,
      tkoByB: tkoProb * koShareB,
      decisionA: decisionProb * (skillA / totalSkill),
      decisionB: decisionProb * (skillB / totalSkill),
      favoredMethod: stoppageProb.total > 0.5
        ? (koShareA > koShareB ? 'KO by A' : 'KO by B')
        : (skillA > skillB ? 'Decision A' : 'Decision B')
    };
  }

  /**
   * Calculate overall skill score
   */
  calculateOverallSkill(fighter) {
    const attrs = [
      fighter.power?.knockoutPower || 70,
      fighter.speed?.handSpeed || 70,
      fighter.defense?.headMovement || 70,
      fighter.offense?.jabAccuracy || 70,
      fighter.mental?.fightIQ || 70,
      fighter.stamina?.cardio || 70
    ];

    return attrs.reduce((a, b) => a + b, 0) / attrs.length;
  }

  /**
   * Predict which round stoppage occurs
   */
  predictStoppageRound(fighterA, fighterB, totalRounds) {
    const powerA = fighterA.power?.knockoutPower || 70;
    const powerB = fighterB.power?.knockoutPower || 70;
    const avgPower = (powerA + powerB) / 2;

    const cardioA = fighterA.stamina?.cardio || 75;
    const cardioB = fighterB.stamina?.cardio || 75;
    const avgCardio = (cardioA + cardioB) / 2;

    const chinA = fighterA.mental?.chin || 75;
    const chinB = fighterB.mental?.chin || 75;
    const minChin = Math.min(chinA, chinB);

    // Early stoppage factors
    let earlyProb = ROUND_DISTRIBUTION.early.probability;
    earlyProb += (avgPower - 70) / 100;
    earlyProb += (70 - minChin) / 150;

    // Late stoppage factors
    let lateProb = ROUND_DISTRIBUTION.late.probability;
    lateProb += (70 - avgCardio) / 100;

    // Middle gets the rest
    let middleProb = 1 - earlyProb - lateProb;

    // Normalize
    const total = earlyProb + middleProb + lateProb;
    earlyProb /= total;
    middleProb /= total;
    lateProb /= total;

    // Calculate expected round
    const earlyMid = 2.5;
    const middleMid = 6.5;
    const lateMid = 10.5;

    const expectedRound = earlyProb * earlyMid + middleProb * middleMid + lateProb * lateMid;

    // Calculate distribution
    const roundDistribution = {};
    for (let r = 1; r <= totalRounds; r++) {
      if (r <= 4) {
        roundDistribution[r] = earlyProb / 4;
      } else if (r <= 8) {
        roundDistribution[r] = middleProb / 4;
      } else {
        roundDistribution[r] = lateProb / (totalRounds - 8);
      }
    }

    return {
      expectedRound: Math.round(expectedRound * 10) / 10,
      earlyProbability: earlyProb,
      middleProbability: middleProb,
      lateProbability: lateProb,
      mostLikelyPeriod: earlyProb > middleProb && earlyProb > lateProb ? 'early'
        : middleProb > lateProb ? 'middle' : 'late',
      distribution: roundDistribution
    };
  }

  /**
   * Predict type of stoppage
   */
  predictStoppageType(fighterA, fighterB) {
    const powerA = fighterA.power?.knockoutPower || 70;
    const powerB = fighterB.power?.knockoutPower || 70;
    const avgPower = (powerA + powerB) / 2;

    const workRateA = fighterA.stamina?.workRate || 70;
    const workRateB = fighterB.stamina?.workRate || 70;
    const avgWorkRate = (workRateA + workRateB) / 2;

    // Base probabilities
    let knockout = 0.35;
    let tkoReferee = 0.45;
    let tkoCorner = 0.15;
    let tkoInjury = 0.05;

    // High power = more clean KOs
    knockout += (avgPower - 70) / 100;
    tkoReferee -= (avgPower - 70) / 150;

    // High work rate = more referee stoppages
    tkoReferee += (avgWorkRate - 70) / 150;

    // Normalize
    const total = knockout + tkoReferee + tkoCorner + tkoInjury;

    return {
      knockout: knockout / total,
      tkoReferee: tkoReferee / total,
      tkoCorner: tkoCorner / total,
      tkoInjury: tkoInjury / total,
      mostLikely: knockout > tkoReferee ? 'knockout' : 'tko_referee',
      description: knockout > tkoReferee
        ? 'Clean knockout most likely'
        : 'Referee stoppage most likely'
    };
  }

  /**
   * Predict decision if fight goes the distance
   */
  predictDecision(fighterA, fighterB, stoppageProb) {
    const skillA = this.calculateOverallSkill(fighterA);
    const skillB = this.calculateOverallSkill(fighterB);

    // Calculate win probability
    const totalSkill = skillA + skillB;
    const winProbA = skillA / totalSkill;
    const winProbB = skillB / totalSkill;

    // Decision type based on skill gap
    const skillGap = Math.abs(skillA - skillB);
    let udProb = skillGap > 10 ? 0.6 : 0.35;
    let sdProb = skillGap > 10 ? 0.25 : 0.40;
    let mdProb = 1 - udProb - sdProb;

    const decisionProb = 1 - stoppageProb.total - 0.03;

    return {
      mostLikely: skillA > skillB ? 'Decision A' : 'Decision B',
      stoppageProbability: stoppageProb.total,
      decisionProbability: decisionProb,
      drawProbability: 0.03,

      breakdown: {
        decisionA: decisionProb * winProbA,
        decisionB: decisionProb * winProbB,
        koByA: stoppageProb.total * stoppageProb.koShare * (skillA / totalSkill),
        koByB: stoppageProb.total * stoppageProb.koShare * (skillB / totalSkill),
        tkoByA: stoppageProb.total * stoppageProb.tkoShare * (skillA / totalSkill),
        tkoByB: stoppageProb.total * stoppageProb.tkoShare * (skillB / totalSkill),
        draw: 0.03
      },

      decisionType: {
        unanimousDecision: udProb,
        splitDecision: sdProb,
        majorityDecision: mdProb
      },

      narrative: `Fight likely goes the distance. ${skillA > skillB ? 'Fighter A' : 'Fighter B'} favored to win by decision.`
    };
  }

  /**
   * Generate narrative description
   */
  generateNarrative(fighterA, fighterB, breakdown, roundPred, stoppageType) {
    const nameA = fighterA.name || fighterA.identity?.name || 'Fighter A';
    const nameB = fighterB.name || fighterB.identity?.name || 'Fighter B';

    const stoppageTotal = breakdown.koByA + breakdown.koByB + breakdown.tkoByA + breakdown.tkoByB;

    if (stoppageTotal > 0.5) {
      const favoredStopper = (breakdown.koByA + breakdown.tkoByA) > (breakdown.koByB + breakdown.tkoByB)
        ? nameA : nameB;
      const round = roundPred.mostLikelyPeriod === 'early' ? 'early rounds'
        : roundPred.mostLikelyPeriod === 'middle' ? 'middle rounds' : 'late rounds';

      return `Stoppage likely. ${favoredStopper} is the more dangerous finisher, with ${stoppageType.description.toLowerCase()} being the most probable outcome in the ${round}.`;
    } else {
      const favoredWinner = breakdown.decisionA > breakdown.decisionB ? nameA : nameB;
      return `This fight is likely to go the distance. ${favoredWinner} is favored to win by decision if it goes to the scorecards.`;
    }
  }
}

export default MethodPredictor;
