/**
 * Commentary Generator
 * Generates dynamic fight commentary for narrative experience
 *
 * Supports multiple broadcast teams (HBO, ESPN, Showtime, etc.)
 * Default: HBO team with Lampley, Foreman, Merchant, Lederman
 */

import { createBroadcastTeam, getAvailableTeams } from './teams/index.js';

export class CommentaryGenerator {
  constructor(options = {}) {
    this.lastCommentTime = 0;
    this.minTimeBetweenComments = 2.0;
    this.recentTopics = [];
    this.fighterNames = { A: 'Fighter A', B: 'Fighter B' };
    this.roundStats = { A: { landed: 0, taken: 0 }, B: { landed: 0, taken: 0 } };

    // Broadcast team (default: HBO)
    this.teamId = options.broadcastTeam || 'hbo';
    this.broadcastTeam = null;
    this.useBroadcastTeam = options.useBroadcastTeam !== false; // Enable by default

    // Track Lederman scorecard timing
    this.lastLedermanRound = 0;
  }

  /**
   * Initialize for a fight
   */
  initialize(fighterA, fighterB) {
    this.fighterNames = {
      A: fighterA.getShortName(),
      B: fighterB.getShortName()
    };
    this.fighterFullNames = {
      A: fighterA.name,
      B: fighterB.name
    };
    this.styles = {
      A: fighterA.style.primary,
      B: fighterB.style.primary
    };
    this.lastCommentTime = 0;
    this.recentTopics = [];
    this.roundStats = { A: { landed: 0, taken: 0 }, B: { landed: 0, taken: 0 } };

    // Initialize broadcast team
    if (this.useBroadcastTeam) {
      try {
        this.broadcastTeam = createBroadcastTeam(this.teamId);
        this.broadcastTeam.initialize(fighterA, fighterB);
      } catch (error) {
        console.warn(`Failed to initialize broadcast team '${this.teamId}': ${error.message}`);
        console.warn(`Available teams: ${getAvailableTeams().join(', ')}`);
        this.useBroadcastTeam = false;
      }
    }

    this.lastLedermanRound = 0;
    this.fighterA = fighterA;
    this.fighterB = fighterB;
  }

  /**
   * Set broadcast team
   */
  setBroadcastTeam(teamId) {
    this.teamId = teamId;
    if (this.fighterA && this.fighterB) {
      this.broadcastTeam = createBroadcastTeam(teamId);
      this.broadcastTeam.initialize(this.fighterA, this.fighterB);
      this.useBroadcastTeam = true;
    }
  }

  /**
   * Get available broadcast teams
   */
  static getAvailableTeams() {
    return getAvailableTeams();
  }

  /**
   * Reset for new round
   */
  resetForRound() {
    this.roundStats = { A: { landed: 0, taken: 0 }, B: { landed: 0, taken: 0 } };
  }

  /**
   * Generate commentary for an event
   * Uses broadcast team (HBO, ESPN, etc.) when available for richer commentary
   */
  generate(event, fightState) {
    const commentary = [];

    // Use broadcast team for main fight events if available
    if (this.useBroadcastTeam && this.broadcastTeam) {
      const broadcastEvents = ['FIGHT_START', 'ROUND_START', 'ROUND_END', 'PUNCH_LANDED',
                               'KNOCKDOWN', 'HURT', 'RECOVERY', 'FIGHT_END'];

      if (broadcastEvents.includes(event.type)) {
        // Track stats for punch events
        if (event.type === 'PUNCH_LANDED') {
          this.roundStats[event.attacker].landed++;
        }

        // Generate broadcast team commentary
        const broadcastCommentary = this.broadcastTeam.generateCommentary(event, fightState);

        // Convert to standard format (add speaker prefix for display)
        for (const c of broadcastCommentary) {
          const prefix = this.getSpeakerPrefix(c.speaker);
          commentary.push({
            text: `${prefix}${c.text}`,
            priority: c.priority,
            speaker: c.speaker
          });
        }

        // Check if we need Harold Lederman's scorecard (every 3 rounds after round end)
        if (event.type === 'ROUND_END' && event.round % 3 === 0 && event.round !== this.lastLedermanRound) {
          this.lastLedermanRound = event.round;

          // Calculate scores for Lederman
          const scores = event.scores || [];
          if (scores.length > 0) {
            const scoreA = scores.reduce((sum, s) => sum + (s.A || 0), 0);
            const scoreB = scores.reduce((sum, s) => sum + (s.B || 0), 0);
            const avgScoreA = Math.round(scoreA / scores.length);
            const avgScoreB = Math.round(scoreB / scores.length);

            const ledermanEvent = {
              type: 'LEDERMAN_SCORECARD',
              round: event.round,
              scoreA: avgScoreA,
              scoreB: avgScoreB,
              statsA: event.stats?.A || event.stats?.stats?.A || {},
              statsB: event.stats?.B || event.stats?.stats?.B || {}
            };

            const ledermanCommentary = this.broadcastTeam.generateCommentary(ledermanEvent, fightState);
            for (const c of ledermanCommentary) {
              const prefix = this.getSpeakerPrefix(c.speaker);
              commentary.push({
                text: `${prefix}${c.text}`,
                priority: c.priority,
                speaker: c.speaker
              });
            }
          }
        }

        return commentary.filter(c => c && c.text);
      }
    }

    // Fall back to legacy commentary for non-broadcast events or when team unavailable
    switch (event.type) {
      case 'INTRO_VENUE':
        commentary.push(...this.generateVenueCommentary(event));
        break;

      case 'INTRO_FIGHTER':
        commentary.push(...this.generateFighterIntroCommentary(event));
        break;

      case 'INTRO_MATCHUP':
        commentary.push(...this.generateMatchupCommentary(event));
        break;

      case 'INTRO_INSTRUCTIONS':
        commentary.push(...this.generateInstructionsCommentary());
        break;

      case 'FIGHT_START':
        commentary.push(...this.generateFightStartCommentary(fightState));
        break;

      case 'ROUND_START':
        commentary.push(...this.generateRoundStartCommentary(event, fightState));
        break;

      case 'ROUND_END':
        commentary.push(...this.generateRoundEndCommentary(event, fightState));
        break;

      case 'PUNCH_LANDED':
        this.roundStats[event.attacker].landed++;
        commentary.push(...this.generatePunchCommentary(event, fightState));
        break;

      case 'KNOCKDOWN':
        commentary.push(...this.generateKnockdownCommentary(event, fightState));
        break;

      case 'RECOVERY':
        commentary.push(...this.generateRecoveryCommentary(event, fightState));
        break;

      case 'HURT':
        commentary.push(...this.generateHurtCommentary(event, fightState));
        break;

      case 'CUT':
        commentary.push(...this.generateCutCommentary(event, fightState));
        break;

      case 'FIGHT_END':
        commentary.push(...this.generateFightEndCommentary(event, fightState));
        break;
    }

    return commentary.filter(c => c && c.text);
  }

  /**
   * Get display prefix for speaker
   */
  getSpeakerPrefix(speaker) {
    const prefixes = {
      'Lampley': '>> ',      // Play-by-play
      'Foreman': '   ',      // Color (indented)
      'Merchant': '   ',     // Analyst (indented)
      'Lederman': '!! '      // Scorer (emphasized)
    };
    return prefixes[speaker] || '';
  }

  /**
   * Generate venue/event intro commentary
   */
  generateVenueCommentary(event) {
    const rounds = event.rounds || 12;
    const fightType = event.fightType || 'Championship';

    const greetings = [
      `Good evening ladies and gentlemen, and welcome to what promises to be an outstanding night of boxing!`,
      `Welcome fight fans! We are LIVE for what should be a tremendous main event!`,
      `Good evening and welcome! The atmosphere here is absolutely electric!`
    ];

    const eventDesc = rounds >= 12
      ? `This is our main event of the evening, scheduled for ${rounds} championship rounds.`
      : `Tonight's feature bout is scheduled for ${rounds} rounds of boxing.`;

    return [
      { text: this.selectRandom(greetings), priority: 'high' },
      { text: eventDesc, priority: 'normal' }
    ];
  }

  /**
   * Generate fighter introduction commentary
   */
  generateFighterIntroCommentary(event) {
    const commentary = [];
    const name = event.name;
    const nickname = event.nickname;
    const record = event.record || { wins: 0, losses: 0, draws: 0, kos: 0 };
    const physical = event.physical || {};
    const style = event.style || {};
    const hometown = event.hometown;
    const isCornerA = event.fighter === 'A';

    // Ring announcer style intro
    const corner = isCornerA ? 'red' : 'blue';
    const fullName = nickname ? `${name.split(' ')[0]} "${nickname}" ${name.split(' ').slice(1).join(' ')}` : name;

    const introLine = isCornerA
      ? `Introducing first, fighting out of the ${corner} corner...`
      : `And his opponent, fighting out of the ${corner} corner...`;

    commentary.push({ text: introLine, priority: 'high' });

    // Location
    if (hometown) {
      commentary.push({ text: `Fighting out of ${hometown}...`, priority: 'normal' });
    }

    // Record
    const recordStr = `With a professional record of ${record.wins} wins, ${record.losses} losses, ${record.draws || 0} draws, with ${record.kos} wins by knockout...`;
    commentary.push({ text: recordStr, priority: 'normal' });

    // Name announcement
    commentary.push({ text: fullName.toUpperCase() + '!', priority: 'high' });

    // Color commentary about the fighter
    const styleComments = this.getStyleCommentary(style, physical, name, record);
    if (styleComments) {
      commentary.push({ text: styleComments, priority: 'normal' });
    }

    return commentary;
  }

  /**
   * Get style-based commentary for fighter intro
   */
  getStyleCommentary(style, physical, name, record) {
    const primaryStyle = style.primary || 'boxer-puncher';
    const shortName = name.split(' ').pop();
    const koPercent = record.wins > 0 ? Math.round((record.kos / record.wins) * 100) : 0;

    const styleComments = {
      'out-boxer': [
        `${shortName} is a classic out-boxer who loves to work behind that jab and control distance.`,
        `Known for his slick footwork and ring generalship, ${shortName} rarely lets opponents get inside.`,
        `${shortName} is a technician. He'll look to control the pace and pick you apart from range.`
      ],
      'swarmer': [
        `${shortName} is a pressure fighter who will look to close the distance and work on the inside.`,
        `Expect ${shortName} to come forward all night. He's relentless with that body attack.`,
        `${shortName} fights with tremendous heart. He'll walk through fire to get to you.`
      ],
      'slugger': [
        `${shortName} is a dangerous puncher with knockout power in both hands.`,
        `With ${koPercent}% of his wins by knockout, ${shortName} is always looking for the big shot.`,
        `${shortName} is a natural puncher. One shot can change everything.`
      ],
      'boxer-puncher': [
        `${shortName} combines excellent boxing skills with legitimate knockout power.`,
        `A complete fighter, ${shortName} can box or brawl depending on what the fight calls for.`,
        `${shortName} is dangerous at every range. He can hurt you coming in or going out.`
      ],
      'counter-puncher': [
        `${shortName} is a master of timing. He makes you pay for every mistake.`,
        `Patience is the key to ${shortName}'s game. He waits for openings and capitalizes.`,
        `${shortName} has razor-sharp reflexes. You cannot be reckless against him.`
      ],
      'inside-fighter': [
        `${shortName} does his best work on the inside with those devastating hooks and uppercuts.`,
        `Once ${shortName} gets inside, he's like a buzzsaw to the body.`,
        `${shortName} wants to smother you, take away your reach, and break you down.`
      ],
      'volume-puncher': [
        `${shortName} throws punches in bunches. His work rate is second to none.`,
        `${shortName} will look to overwhelm his opponent with sheer volume.`,
        `The combinations flow like water from ${shortName}. He never stops throwing.`
      ]
    };

    const comments = styleComments[primaryStyle] || styleComments['boxer-puncher'];
    return this.selectRandom(comments);
  }

  /**
   * Generate matchup analysis commentary
   */
  generateMatchupCommentary(event) {
    const commentary = [];
    const fighterA = event.fighterA;
    const fighterB = event.fighterB;
    const nameA = fighterA.name.split(' ').pop();
    const nameB = fighterB.name.split(' ').pop();

    commentary.push({ text: `Now let's break down this matchup...`, priority: 'high' });

    // Physical comparison
    const heightDiff = (fighterA.physical?.height || 180) - (fighterB.physical?.height || 180);
    const reachDiff = (fighterA.physical?.reach || 180) - (fighterB.physical?.reach || 180);

    if (Math.abs(heightDiff) >= 5 || Math.abs(reachDiff) >= 5) {
      if (heightDiff > 0) {
        commentary.push({
          text: `${nameA} has the size advantage here, standing ${Math.abs(heightDiff)} cm taller with a ${Math.abs(reachDiff)} cm reach advantage.`,
          priority: 'normal'
        });
      } else if (heightDiff < 0) {
        commentary.push({
          text: `${nameB} is the bigger man tonight, with a ${Math.abs(heightDiff)} cm height advantage and ${Math.abs(reachDiff)} cm more reach.`,
          priority: 'normal'
        });
      }
    }

    // Style matchup analysis
    const styleA = fighterA.style?.primary || 'boxer-puncher';
    const styleB = fighterB.style?.primary || 'boxer-puncher';
    const matchupComment = this.getMatchupAnalysis(styleA, styleB, nameA, nameB);
    if (matchupComment) {
      commentary.push({ text: matchupComment, priority: 'normal' });
    }

    // Key to victory
    const keysToVictory = [
      `The key for ${nameA} will be ${this.getKeyToVictory(styleA, styleB, true)}.`,
      `Meanwhile, ${nameB} needs to ${this.getKeyToVictory(styleB, styleA, false)}.`
    ];
    commentary.push({ text: keysToVictory[0], priority: 'normal' });
    commentary.push({ text: keysToVictory[1], priority: 'normal' });

    // Prediction tease
    const predictions = [
      `This is a classic styles matchup. Someone's game plan is going to have to change.`,
      `On paper, this is as even as it gets. It should be a tremendous fight.`,
      `Something's got to give tonight. These two styles are going to produce fireworks.`,
      `I expect this one to be competitive from the opening bell.`
    ];
    commentary.push({ text: this.selectRandom(predictions), priority: 'normal' });

    return commentary;
  }

  /**
   * Get matchup-specific analysis
   */
  getMatchupAnalysis(styleA, styleB, nameA, nameB) {
    // Classic style matchups
    if (styleA === 'out-boxer' && styleB === 'swarmer') {
      return `Classic boxer vs pressure fighter matchup. Can ${nameA} keep ${nameB} at the end of his jab, or will ${nameB}'s pressure overwhelm him?`;
    }
    if (styleA === 'swarmer' && styleB === 'out-boxer') {
      return `${nameA} will look to close the distance, while ${nameB} wants to fight at range. Distance control will be crucial.`;
    }
    if (styleA === 'counter-puncher' && styleB === 'slugger') {
      return `${nameB}'s power against ${nameA}'s timing. If ${nameB} loads up, he could get countered. But one shot could change everything.`;
    }
    if (styleA === 'slugger' && styleB === 'counter-puncher') {
      return `${nameA} has the power to end it with one punch, but ${nameB} is a master at making aggressive fighters pay.`;
    }

    // Generic matchup
    const generic = [
      `Two ${styleA === styleB ? 'similar styles' : 'contrasting styles'} here. This should be a tactical battle.`,
      `Interesting style matchup. Both fighters will need to make adjustments as the fight develops.`,
      `We'll see whose game plan holds up better under fire.`
    ];
    return this.selectRandom(generic);
  }

  /**
   * Get key to victory for a style matchup
   */
  getKeyToVictory(myStyle, opponentStyle, isFirst) {
    const keys = {
      'out-boxer': ['use that jab to control distance', 'stay mobile and not get backed into corners', 'make him miss and make him pay'],
      'swarmer': ['close the distance early and often', 'break him down with body work', 'impose his will and dictate the pace'],
      'slugger': ['land that big right hand', 'cut off the ring and trap his opponent', 'stay patient and pick his spots'],
      'boxer-puncher': ['use his versatility', 'find the right moments to let his hands go', 'mix it up and keep his opponent guessing'],
      'counter-puncher': ['be patient and wait for mistakes', 'time those counters perfectly', 'make his opponent lead and capitalize'],
      'inside-fighter': ['get inside and stay there', 'work the body relentlessly', 'take away his opponent\'s reach advantage'],
      'volume-puncher': ['overwhelm with output', 'keep the combinations flowing', 'outwork his opponent']
    };

    const styleKeys = keys[myStyle] || keys['boxer-puncher'];
    return this.selectRandom(styleKeys);
  }

  /**
   * Generate pre-fight instructions commentary
   */
  generateInstructionsCommentary() {
    return [
      { text: `The referee calls both fighters to the center of the ring for final instructions.`, priority: 'high' },
      { text: `"Protect yourself at all times. Obey my commands at all times. Touch gloves if you want to, go back to your corners, and come out fighting."`, priority: 'normal' },
      { text: `Both fighters touch gloves and head back to their corners.`, priority: 'normal' },
      { text: `The crowd is on their feet... here we go!`, priority: 'high' }
    ];
  }

  /**
   * Generate fight start commentary
   */
  generateFightStartCommentary(fightState) {
    return [
      { text: `THE BELL RINGS! AND WE ARE UNDERWAY!`, priority: 'critical' }
    ];
  }

  /**
   * Generate round start commentary
   */
  generateRoundStartCommentary(event, fightState) {
    const round = event.round;
    const templates = [];

    if (round === 1) {
      templates.push(
        { text: `The bell rings and round one is underway!`, priority: 'high' },
        { text: `Both fighters come out to the center of the ring.`, priority: 'normal' }
      );
    } else if (round >= 10) {
      templates.push(
        { text: `Championship round ${round} begins! This is where legends are made.`, priority: 'high' }
      );
    } else {
      const openers = [
        `Round ${round} begins.`,
        `The bell sounds for round ${round}.`,
        `Here we go, round ${round}.`,
        `Round ${round} is underway.`
      ];
      templates.push({ text: this.selectRandom(openers), priority: 'normal' });
    }

    return templates;
  }

  /**
   * Generate round end commentary
   */
  generateRoundEndCommentary(event, fightState) {
    const commentary = [];
    const round = event.round;

    commentary.push({
      text: `The bell sounds to end round ${round}.`,
      priority: 'normal'
    });

    // Analyze round winner
    const statsA = this.roundStats.A;
    const statsB = this.roundStats.B;

    if (statsA.landed > statsB.landed + 5) {
      commentary.push({
        text: `${this.fighterNames.A} clearly won that round, out-landing his opponent ${statsA.landed} to ${statsB.landed}.`,
        priority: 'normal'
      });
    } else if (statsB.landed > statsA.landed + 5) {
      commentary.push({
        text: `${this.fighterNames.B} takes that round decisively with ${statsB.landed} punches landed.`,
        priority: 'normal'
      });
    } else {
      commentary.push({
        text: `Close round. The judges will have a tough time scoring that one.`,
        priority: 'normal'
      });
    }

    // Reset stats for next round
    this.resetForRound();

    return commentary;
  }

  /**
   * Generate punch commentary
   * Damage scale: jabs 0.3-1.0, power punches 1.5-5.0, big shots 4-8, devastating 6+
   */
  generatePunchCommentary(event, fightState) {
    const commentary = [];
    const attacker = this.fighterNames[event.attacker];
    const target = this.fighterNames[event.target];
    const punchName = this.formatPunchName(event.punchType);

    // Devastating shots (damage >= 6) - always comment
    if (event.damage >= 6) {
      const templates = [
        `${attacker} lands a HUGE ${punchName}!`,
        `What a ${punchName} from ${attacker}! That one hurt!`,
        `${attacker} connects with a devastating ${punchName}!`,
        `BOOM! ${punchName} lands flush for ${attacker}!`
      ];
      commentary.push({ text: this.selectRandom(templates), priority: 'high' });
    }
    // Big shots (damage >= 4) - always comment
    else if (event.damage >= 4) {
      if (event.isCounter) {
        const templates = [
          `Beautiful counter ${punchName} from ${attacker}!`,
          `${attacker} times him perfectly with the counter!`,
          `${attacker} makes him pay with a counter ${punchName}.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'high' });
      } else {
        const templates = [
          `Clean ${punchName} from ${attacker}.`,
          `${attacker} lands the ${punchName} cleanly.`,
          `Nice ${punchName} by ${attacker}.`,
          `That ${punchName} found the mark for ${attacker}.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'normal' });
      }
    }
    // Solid shots (damage >= 2) - always comment
    else if (event.damage >= 2) {
      if (event.isCounter) {
        const templates = [
          `Counter ${punchName} from ${attacker}.`,
          `${attacker} times the counter nicely.`,
          `${attacker} catches him with a counter.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'normal' });
      } else if (event.location === 'body') {
        const templates = [
          `${attacker} goes to the body.`,
          `Good body shot from ${attacker}.`,
          `${attacker} digs to the body with the ${punchName}.`,
          `That body shot will add up.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'normal' });
      } else {
        const templates = [
          `${attacker} lands the ${punchName}.`,
          `${punchName} connects for ${attacker}.`,
          `Solid ${punchName} from ${attacker}.`,
          `${attacker} scores with the ${punchName}.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'normal' });
      }
    }
    // Light shots (damage >= 0.8) - 60% chance
    else if (event.damage >= 0.8 && Math.random() < 0.6) {
      const isJab = event.punchType === 'jab' || event.punchType === 'body_jab';
      if (isJab) {
        const templates = [
          `${attacker} pops the jab.`,
          `Jab lands for ${attacker}.`,
          `${attacker} sticks the jab.`,
          `Good jab by ${attacker}.`,
          `${attacker} working behind the jab.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'low' });
      } else {
        const templates = [
          `${attacker} lands a ${punchName}.`,
          `${punchName} gets through for ${attacker}.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'low' });
      }
    }
    // Very light shots (damage >= 0.3) - 35% chance
    else if (event.damage >= 0.3 && Math.random() < 0.35) {
      const isJab = event.punchType === 'jab' || event.punchType === 'body_jab';
      if (isJab) {
        const templates = [
          `${attacker} flicks out the jab.`,
          `Light jab from ${attacker}.`,
          `${attacker} is jabbing.`
        ];
        commentary.push({ text: this.selectRandom(templates), priority: 'low' });
      }
    }

    return commentary;
  }

  /**
   * Generate knockdown commentary - HBO style with play-by-play and color
   */
  generateKnockdownCommentary(event, fightState) {
    const downed = this.fighterNames[event.fighter];
    const downedFull = this.fighterFullNames[event.fighter];
    const attacker = this.fighterNames[event.attacker];
    const attackerFull = this.fighterFullNames[event.attacker];
    const punch = this.formatPunchName(event.punch);
    const round = event.round || fightState?.currentRound || 1;
    const commentary = [];

    // Play-by-play: The moment (Jim Lampley style)
    const playByPlay = [
      `DOWN GOES ${downed.toUpperCase()}! DOWN GOES ${downed.toUpperCase()}!`,
      `OH! AND ${downed.toUpperCase()} IS DOWN! HE IS DOWN!`,
      `${downed.toUpperCase()} HAS BEEN DROPPED! A ${punch.toUpperCase()} PUTS HIM ON THE CANVAS!`,
      `TIMBER! ${attacker.toUpperCase()} DROPS ${downed.toUpperCase()} WITH A TREMENDOUS ${punch.toUpperCase()}!`
    ];
    commentary.push({ text: this.selectRandom(playByPlay), priority: 'critical' });

    // Color: The punch description (Roy Jones Jr. / Max Kellerman style)
    const punchAnalysis = [
      `That ${punch} came out of nowhere! ${attacker} timed it perfectly as ${downed} was stepping in.`,
      `Beautiful shot selection by ${attacker}. He set that up with the jab and ${downed} never saw it coming.`,
      `${attacker} caught him right on the button with that ${punch}. You can see ${downed}'s legs just gave out.`,
      `That's the punch ${attacker} has been looking for all night. ${downed} walked right into it.`,
      `What precision from ${attacker}! That ${punch} landed flush on the chin.`
    ];
    commentary.push({ text: this.selectRandom(punchAnalysis), priority: 'high' });

    // The count begins
    commentary.push({ text: `The referee is over ${downed}... he picks up the count...`, priority: 'high' });

    // Color: Stakes and context
    if (round === 1) {
      const earlyKDComments = [
        `Unbelievable! We're not even out of the first round and we have a knockdown!`,
        `This fight has just been turned on its head! First round knockdown!`,
        `What a start to this fight! Can ${downed} recover from this early disaster?`,
        `The crowd is on their feet! Nobody expected this fight to start like this!`
      ];
      commentary.push({ text: this.selectRandom(earlyKDComments), priority: 'high' });
    } else if (round >= 10) {
      const lateKDComments = [
        `A knockdown in the championship rounds! This could decide the fight!`,
        `${attacker} may have just stolen this fight with that knockdown!`,
        `In the late rounds, a knockdown like this is absolutely massive on the scorecards.`
      ];
      commentary.push({ text: this.selectRandom(lateKDComments), priority: 'high' });
    }

    return commentary;
  }

  /**
   * Generate recovery commentary
   */
  generateRecoveryCommentary(event, fightState) {
    const fighter = this.fighterNames[event.fighter];
    const count = event.count;

    const templates = count <= 6
      ? [
          `${fighter} is up at ${count}. He looks okay.`,
          `${fighter} beats the count at ${count}, showing great heart.`,
          `He's up at ${count}. ${fighter} wants to continue.`
        ]
      : [
          `${fighter} barely beats the count at ${count}!`,
          `${fighter} struggles up at ${count}. The referee checks him closely.`,
          `Just in time! ${fighter} gets up at ${count}, but is he fully recovered?`
        ];

    return [{ text: this.selectRandom(templates), priority: 'high' }];
  }

  /**
   * Generate hurt commentary
   */
  generateHurtCommentary(event, fightState) {
    const fighter = this.fighterNames[event.fighter];
    const opponent = event.fighter === 'A' ? this.fighterNames.B : this.fighterNames.A;

    const templates = [
      `${fighter} IS HURT! His legs are wobbly!`,
      `${fighter} is in trouble! ${opponent} needs to capitalize!`,
      `${fighter} is badly hurt! Can he survive?`,
      `${fighter}'s legs are gone! He's trying to hold on!`
    ];

    return [{ text: this.selectRandom(templates), priority: 'critical' }];
  }

  /**
   * Generate cut commentary
   */
  generateCutCommentary(event, fightState) {
    const fighter = this.fighterNames[event.fighter];
    const location = event.location.replace(/_/g, ' ');

    const templates = [
      `${fighter} has been cut above the ${location}!`,
      `Blood! ${fighter} is cut on the ${location}.`,
      `There's a cut opening up on ${fighter}'s ${location}.`,
      `${fighter} is bleeding from a cut on the ${location}.`
    ];

    return [{ text: this.selectRandom(templates), priority: 'high' }];
  }

  /**
   * Generate fight end commentary - HBO broadcast style
   */
  generateFightEndCommentary(event, fightState) {
    const commentary = [];
    const winner = event.winner;
    const loser = winner === 'A' ? 'B' : 'A';
    const method = event.method;
    const round = event.round || fightState?.currentRound;
    const winnerName = winner ? this.fighterFullNames[winner] : null;
    const winnerShort = winner ? this.fighterNames[winner] : null;
    const loserName = winner ? this.fighterFullNames[loser] : null;
    const loserShort = winner ? this.fighterNames[loser] : null;

    if (method === 'KO') {
      // Play-by-play: The stoppage call
      const stopCalls = [
        `IT'S OVER! IT'S ALL OVER! THE FIGHT IS OVER!`,
        `THE REFEREE HAS SEEN ENOUGH! THIS FIGHT IS OVER!`,
        `STOP THE FIGHT! IT'S OVER! KNOCKOUT!`,
        `AND THE REFEREE WAVES IT OFF! IT'S ALL OVER!`
      ];
      commentary.push({ text: this.selectRandom(stopCalls), priority: 'critical' });

      // The fallen fighter
      const fallenComments = [
        `${loserShort} is not getting up. He's still down on the canvas.`,
        `${loserShort} is flat on his back. The medical team is coming in.`,
        `${loserShort} took that last shot and his lights went out.`
      ];
      commentary.push({ text: this.selectRandom(fallenComments), priority: 'high' });

      // Winner celebration
      if (winner) {
        commentary.push({ text: `${winnerShort} raises his arms in triumph!`, priority: 'high' });

        // Color commentary analysis
        const analysis = [
          `What a performance by ${winnerName}! He said he would get the knockout and he delivered!`,
          `${winnerShort} showed tonight why he's one of the most dangerous punchers in the division.`,
          `That's the kind of knockout that will be replayed for years to come.`,
          `Spectacular finish! ${winnerShort} was patient, he picked his spots, and when he saw the opening, he took it.`
        ];
        commentary.push({ text: this.selectRandom(analysis), priority: 'high' });

        // Official announcement
        if (round === 1) {
          commentary.push({ text: `FIRST ROUND KNOCKOUT! ${winnerName.toUpperCase()} WINS IN DEVASTATING FASHION!`, priority: 'critical' });
          commentary.push({ text: `A star-making performance! That's the kind of knockout that launches careers!`, priority: 'high' });
        } else {
          commentary.push({ text: `Your winner by KNOCKOUT in round ${round}... ${winnerName.toUpperCase()}!`, priority: 'critical' });
        }
      }

    } else if (method.includes('TKO')) {
      // Determine type of TKO for specific commentary
      const isCornorStop = method.includes('CORNER');
      const isDoctorStop = method.includes('DOCTOR');
      const isThreeKD = method.includes('THREE_KNOCKDOWN');

      // Play-by-play: The stoppage
      if (isThreeKD) {
        commentary.push({ text: `THAT'S THREE KNOCKDOWNS! THE REFEREE HAS TO STOP THIS!`, priority: 'critical' });
        commentary.push({ text: `Under the three knockdown rule, this fight is over!`, priority: 'high' });
      } else if (isCornorStop) {
        commentary.push({ text: `THE CORNER HAS THROWN IN THE TOWEL! THEY'VE SEEN ENOUGH!`, priority: 'critical' });
        commentary.push({ text: `A wise decision by the corner. Their fighter was taking too much punishment.`, priority: 'high' });
      } else if (isDoctorStop) {
        commentary.push({ text: `THE RINGSIDE PHYSICIAN HAS STOPPED THIS FIGHT!`, priority: 'critical' });
        commentary.push({ text: `The cut was just too severe. Fighter safety has to come first.`, priority: 'high' });
      } else {
        const tkoCalls = [
          `THE REFEREE STEPS IN AND STOPS THE FIGHT! TKO!`,
          `THE REFEREE HAS SEEN ENOUGH! HE'S WAVING IT OFF!`,
          `STOPPAGE! THE REFEREE SAYS NO MAS! THIS ONE IS OVER!`,
          `AND THE REFEREE JUMPS IN! HE'S NOT GOING TO LET THIS CONTINUE!`
        ];
        commentary.push({ text: this.selectRandom(tkoCalls), priority: 'critical' });

        // Color: Why it was stopped
        const tkoReasons = [
          `${loserShort} was no longer intelligently defending himself. Good stoppage by the referee.`,
          `${loserShort} was taking too many unanswered shots. The referee had no choice.`,
          `${loserShort} was out on his feet. That's a referee doing his job right there.`,
          `You hate to see a fight end this way, but ${loserShort} had nothing left.`
        ];
        commentary.push({ text: this.selectRandom(tkoReasons), priority: 'high' });
      }

      // Winner announcement
      if (winner) {
        const analysis = [
          `${winnerShort} breaks down his opponent and gets the stoppage. Championship caliber performance.`,
          `The game plan worked to perfection for ${winnerShort}. He wore him down and finished him.`,
          `${winnerShort} showed tonight that he has both the skill and the power to finish fights.`
        ];
        commentary.push({ text: this.selectRandom(analysis), priority: 'high' });
        commentary.push({ text: `Your winner by TECHNICAL KNOCKOUT in round ${round}... ${winnerName.toUpperCase()}!`, priority: 'critical' });
      }

    } else if (method.includes('DECISION')) {
      // The anticipation
      commentary.push({ text: `The final bell has sounded! This fight goes to the scorecards!`, priority: 'high' });
      commentary.push({ text: `Both corners think they've done enough... now we wait for the judges.`, priority: 'normal' });

      // Scorecards
      if (event.scorecards) {
        commentary.push({ text: `Ladies and gentlemen, we go to the scorecards...`, priority: 'high' });
        for (const card of event.scorecards) {
          commentary.push({ text: `Judge scores it: ${card}`, priority: 'high' });
        }
      }

      // The decision
      if (winner) {
        const decisionType = method.includes('UNANIMOUS') ? 'UNANIMOUS'
          : method.includes('SPLIT') ? 'SPLIT'
          : 'MAJORITY';

        if (decisionType === 'UNANIMOUS') {
          commentary.push({ text: `All three judges have it the same way...`, priority: 'high' });
        } else if (decisionType === 'SPLIT') {
          commentary.push({ text: `We have a SPLIT DECISION...`, priority: 'high' });
        }

        commentary.push({ text: `YOUR WINNER... BY ${decisionType} DECISION... ${winnerName.toUpperCase()}!`, priority: 'critical' });

        // Post-fight analysis
        const decisionAnalysis = [
          `${winnerShort} did just enough to get the nod from the judges tonight.`,
          `A hard-fought victory for ${winnerShort}. He earned that one.`,
          `${winnerShort} showed championship heart going the distance and getting his hand raised.`
        ];
        commentary.push({ text: this.selectRandom(decisionAnalysis), priority: 'high' });
      } else {
        commentary.push({ text: `THIS FIGHT IS DECLARED A DRAW!`, priority: 'critical' });
        commentary.push({ text: `Neither fighter could separate themselves on the scorecards. We need a rematch!`, priority: 'high' });
      }
    }

    return commentary;
  }

  /**
   * Generate situational commentary
   */
  generateSituationalCommentary(fightState) {
    const commentary = [];
    const round = fightState.currentRound;
    const fighterA = fightState.fighterA;
    const fighterB = fightState.fighterB;

    // Championship rounds
    if (round >= 10 && !this.recentTopics.includes('championship_rounds')) {
      commentary.push({
        text: `We're in the championship rounds now. This is where it counts.`,
        priority: 'normal'
      });
      this.recentTopics.push('championship_rounds');
    }

    // Stamina observations
    if (fighterA.staminaTier === 'exhausted' && !this.recentTopics.includes('stamina_A')) {
      commentary.push({
        text: `${this.fighterNames.A} is visibly tired. His punch output has dropped significantly.`,
        priority: 'normal'
      });
      this.recentTopics.push('stamina_A');
    }

    if (fighterB.staminaTier === 'exhausted' && !this.recentTopics.includes('stamina_B')) {
      commentary.push({
        text: `${this.fighterNames.B} looks exhausted. The body work is paying off.`,
        priority: 'normal'
      });
      this.recentTopics.push('stamina_B');
    }

    return commentary;
  }

  /**
   * Format punch name for commentary
   */
  formatPunchName(punchType) {
    const names = {
      'jab': 'jab',
      'cross': 'right hand',
      'lead_hook': 'left hook',
      'rear_hook': 'right hook',
      'lead_uppercut': 'left uppercut',
      'rear_uppercut': 'right uppercut',
      'body_jab': 'jab to the body',
      'body_cross': 'right to the body',
      'body_hook_lead': 'left hook to the body',
      'body_hook_rear': 'right hook to the body'
    };

    return names[punchType] || punchType.replace(/_/g, ' ');
  }

  /**
   * Select random from array
   */
  selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

export default CommentaryGenerator;
