/**
 * PublicationGenerator - Generates news articles about boxing events
 * Creates realistic boxing journalism for title fights, upsets, retirements, etc.
 */

export class PublicationGenerator {
  constructor(universe) {
    this.universe = universe;
  }

  /**
   * Generate articles from simulation events
   * @param {Object[]} events - Events from simulation
   * @returns {Object[]} Array of articles
   */
  generateArticles(events) {
    const articles = [];

    // Process title changes first (most important)
    const titleChanges = events.filter(e => e.type === 'TITLE_CHANGE');
    for (const tc of titleChanges) {
      const fightResult = events.find(e =>
        e.type === 'FIGHT_RESULT' &&
        e.titleChange?.organization === tc.organization
      );
      if (fightResult) {
        articles.push(this.generateTitleFightArticle(fightResult, tc));
      }
    }

    // Process upsets
    const upsets = events.filter(e => e.type === 'UPSET');
    for (const upset of upsets) {
      const fightResult = events.find(e =>
        e.type === 'FIGHT_RESULT' &&
        e.winnerName === upset.winner
      );
      if (fightResult && !articles.some(a => a.fightId === fightResult.date)) {
        articles.push(this.generateUpsetArticle(fightResult));
      }
    }

    // Process notable KOs
    const koFights = events.filter(e =>
      e.type === 'FIGHT_RESULT' &&
      (e.method === 'KO' || e.method === 'TKO') &&
      e.round <= 3
    );
    for (const fight of koFights.slice(0, 3)) {
      if (!articles.some(a => a.fightId === fight.date)) {
        articles.push(this.generateKOArticle(fight));
      }
    }

    // Process retirements
    const retirements = events.filter(e => e.type === 'RETIREMENT');
    for (const retirement of retirements.slice(0, 2)) {
      articles.push(this.generateRetirementArticle(retirement));
    }

    // Process HOF inductions
    const hofInductions = events.filter(e => e.type === 'HOF_INDUCTION');
    for (const induction of hofInductions) {
      articles.push(this.generateHOFArticle(induction));
    }

    // Process notable prospects
    const newProspects = events.filter(e =>
      e.type === 'NEW_PROSPECT' &&
      (e.tier === 'GENERATIONAL' || e.tier === 'ELITE')
    );
    for (const prospect of newProspects.slice(0, 1)) {
      articles.push(this.generateProspectArticle(prospect));
    }

    // Add dates to all articles
    for (const article of articles) {
      article.date = this.universe.getDateString();
    }

    return articles;
  }

  /**
   * Generate a title fight article
   */
  generateTitleFightArticle(fight, titleChange) {
    const winner = this.universe.fighters.get(fight.winner);
    const loser = this.universe.fighters.get(fight.loser);

    const isNewChampion = titleChange.type === 'TITLE_CHANGE';
    const isVacantWin = titleChange.type === 'NEW_CHAMPION';

    let headline, body;

    if (isNewChampion) {
      headline = `${fight.winnerName} Shocks the World, Captures ${titleChange.organization} Title!`;
      body = this.buildTitleChangeBody(fight, winner, loser, titleChange);
    } else if (isVacantWin) {
      headline = `${fight.winnerName} Claims Vacant ${titleChange.organization} ${fight.division} Title`;
      body = this.buildVacantTitleBody(fight, winner, loser, titleChange);
    } else {
      headline = `${fight.winnerName} Successfully Defends ${titleChange.organization} Crown`;
      body = this.buildDefenseBody(fight, winner, loser, titleChange);
    }

    return {
      type: 'TITLE_FIGHT',
      headline,
      body,
      fightId: fight.date,
      fightData: this.extractFightData(fight)
    };
  }

  /**
   * Build body for title change article
   */
  buildTitleChangeBody(fight, winner, loser, titleChange) {
    const methodPhrase = this.getMethodPhrase(fight);
    const winnerRecord = winner?.getRecordString() || fight.winnerName;
    const loserRecord = loser?.getRecordString() || fight.loserName;

    return `In a stunning turn of events, ${fight.winnerName} has dethroned ${titleChange.formerChampion} to become the new ${titleChange.organization} ${fight.division} champion.

The challenger came into the fight as an underdog but showed tremendous heart and skill, ${methodPhrase}.

${fight.winnerName} (${winnerRecord}) was emotional after the victory, having worked years for this moment. The new champion's combination of ${this.getStyleDescription(winner)} proved too much for the former titleholder.

${titleChange.formerChampion} (${loserRecord}) will need to regroup after this devastating loss. Questions now arise about whether we'll see an immediate rematch.

Boxing fans witnessed history tonight as a new era begins in the ${fight.division} division.`;
  }

  /**
   * Build body for vacant title win
   */
  buildVacantTitleBody(fight, winner, loser, titleChange) {
    const methodPhrase = this.getMethodPhrase(fight);

    return `${fight.winnerName} has claimed the vacant ${titleChange.organization} ${fight.division} title ${methodPhrase} over ${fight.loserName}.

The two top contenders battled for the right to call themselves world champion, and ${fight.winnerName} proved to be the better fighter on the night.

With this victory, ${fight.winnerName} solidifies their position as one of the elite fighters in the ${fight.division} division. The new champion will look to establish a dominant reign.

${fight.loserName} fought valiantly but came up short in the biggest fight of their career. They will surely be back in the title picture with continued success.`;
  }

  /**
   * Build body for title defense
   */
  buildDefenseBody(fight, winner, loser, titleChange) {
    const methodPhrase = this.getMethodPhrase(fight);
    const defenseNum = titleChange.defenseNumber || 'another';

    return `Champion ${fight.winnerName} has successfully defended their ${titleChange.organization} ${fight.division} title for the ${this.ordinal(defenseNum)} time, ${methodPhrase} over challenger ${fight.loserName}.

The champion showed why they sit atop the division, controlling the action and demonstrating championship-level skills throughout the contest.

${fight.loserName} came in with a solid game plan but couldn't match the champion's experience and ring generalship. The challenger showed heart but ultimately fell short.

${fight.winnerName} continues to build an impressive championship resume. With ${defenseNum} successful ${defenseNum === 1 ? 'defense' : 'defenses'}, the champion's legacy grows with each victory.`;
  }

  /**
   * Generate an upset article
   */
  generateUpsetArticle(fight) {
    return {
      type: 'UPSET',
      headline: `Massive Upset! ${fight.winnerName} Stuns ${fight.loserName}`,
      body: `In one of the biggest upsets of the year, ${fight.winnerName} has defeated the heavily favored ${fight.loserName} ${this.getMethodPhrase(fight)}.

Few gave the underdog a chance heading into this ${fight.division} matchup, but ${fight.winnerName} had other plans. The winner showed tremendous skill and determination, proving that on any given night, anything can happen in boxing.

This result shakes up the division rankings and puts ${fight.winnerName} firmly in the championship conversation. Meanwhile, ${fight.loserName} must return to the drawing board after this shocking defeat.

Boxing experts are still processing what they witnessed. This is a reminder of why they call it "the sport where anything can happen."`,
      fightId: fight.date,
      fightData: this.extractFightData(fight)
    };
  }

  /**
   * Generate a KO article
   */
  generateKOArticle(fight) {
    const roundWord = fight.round === 1 ? 'first' : fight.round === 2 ? 'second' : 'third';

    return {
      type: 'KO',
      headline: `Devastating! ${fight.winnerName} Scores ${fight.method} in Round ${fight.round}`,
      body: `${fight.winnerName} made a statement with a spectacular ${fight.method} victory over ${fight.loserName}, finishing the fight in the ${roundWord} round.

The ending came suddenly when ${fight.winnerName} landed a devastating shot that sent ${fight.loserName} to the canvas. The referee quickly waved off the contest, giving ${fight.winnerName} an impressive stoppage victory.

This knockout showcases the dangerous power that ${fight.winnerName} possesses. Other fighters in the ${fight.division} division have been put on notice.

${fight.loserName} will need time to recover from this defeat, both physically and mentally. The boxing world will remember this knockout for some time to come.`,
      fightId: fight.date,
      fightData: this.extractFightData(fight)
    };
  }

  /**
   * Generate retirement article
   */
  generateRetirementArticle(retirement) {
    const titles = retirement.titles?.length || 0;

    return {
      type: 'RETIREMENT',
      headline: `${retirement.fighterName} Announces Retirement After Legendary Career`,
      body: `After ${retirement.record?.wins || 0} wins and ${titles > 0 ? titles + ' world title' + (titles > 1 ? 's' : '') : 'a memorable career'}, ${retirement.fighterName} has announced their retirement from professional boxing.

The fighter departs with a record of ${retirement.record?.wins || 0}-${retirement.record?.losses || 0}${retirement.record?.draws > 0 ? '-' + retirement.record.draws : ''} (${retirement.record?.kos || 0} KOs), leaving behind a legacy that will be remembered by boxing fans.

"I've given everything to this sport," the newly retired fighter said in a statement. "It's time to begin the next chapter of my life."

${titles > 0 ? `As a ${titles}-time world champion, ${retirement.fighterName} leaves the sport having achieved the ultimate goal in boxing.` : `While a world title remained elusive, ${retirement.fighterName} was always a respected competitor who gave fans exciting fights.`}

The boxing community wishes ${retirement.fighterName} the best in retirement.`,
      fightId: null
    };
  }

  /**
   * Generate Hall of Fame induction article
   */
  generateHOFArticle(induction) {
    return {
      type: 'HOF',
      headline: `${induction.fighterName} Inducted Into Boxing Hall of Fame`,
      body: `The Boxing Hall of Fame has announced that ${induction.fighterName} will be inducted as part of the ${this.universe.currentDate.year} class.

${induction.fighterName} retired with a record of ${induction.record || 'a distinguished career'} and was known as one of the finest fighters of their era.

The ${induction.category === 'FIRST_BALLOT' ? 'first-ballot inductee' : 'inductee'} earned this honor through years of excellence in the ring, facing the best competition and always providing memorable performances for fans.

"This is the ultimate recognition for any boxer," ${induction.fighterName} said upon learning of the honor. "I'm grateful to everyone who supported me throughout my career."

The induction ceremony will take place later this year, where ${induction.fighterName} will take their rightful place among boxing's all-time greats.`,
      fightId: null
    };
  }

  /**
   * Generate prospect article
   */
  generateProspectArticle(prospect) {
    return {
      type: 'PROSPECT',
      headline: `Rising Star ${prospect.fighterName} Turns Pro, Scouts Rave`,
      body: `The boxing world is buzzing about ${prospect.fighterName}, a ${prospect.tier.toLowerCase()} talent who has just turned professional.

Scouts have been following this prospect for years, and the consensus is that ${prospect.fighterName} has the potential to become a major force in the ${prospect.weightClass || 'heavyweight'} division.

Hailing from ${prospect.nationality || 'an undisclosed location'}, the young fighter combines natural ability with a dedication to the craft that has impressed everyone who has seen them train.

"This is a special talent," one veteran trainer noted. "We could be looking at a future world champion."

Boxing fans should keep an eye on ${prospect.fighterName} as they begin their professional journey. The path to greatness starts now.`,
      fightId: null
    };
  }

  /**
   * Get method phrase for article
   */
  getMethodPhrase(fight) {
    switch (fight.method) {
      case 'KO':
        return `via knockout in round ${fight.round}`;
      case 'TKO':
        return `via technical knockout in round ${fight.round}`;
      case 'Decision':
        return 'by decision';
      default:
        return `by ${fight.method}`;
    }
  }

  /**
   * Get style description for a fighter
   */
  getStyleDescription(fighter) {
    if (!fighter) return 'skill and determination';

    const style = fighter.style?.primary || 'balanced';
    const descriptions = {
      'out-boxer': 'slick boxing and movement',
      'slugger': 'devastating power',
      'swarmer': 'relentless pressure',
      'boxer-puncher': 'technical skill and power',
      'counter-puncher': 'impeccable timing and defense',
      'inside-fighter': 'brutal inside work',
      'volume-puncher': 'overwhelming punch volume'
    };

    return descriptions[style] || 'all-around skills';
  }

  /**
   * Convert number to ordinal
   */
  ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /**
   * Extract fight data for potential replay
   */
  extractFightData(fight) {
    return {
      fighterA: fight.fighterA,
      fighterB: fight.fighterB,
      fighterAName: fight.fighterAName,
      fighterBName: fight.fighterBName,
      division: fight.division,
      rounds: fight.totalRounds,
      date: fight.date
    };
  }
}

export default PublicationGenerator;
