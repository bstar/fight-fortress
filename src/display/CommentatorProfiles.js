/**
 * HBO Boxing Commentary Team Profiles
 *
 * Authentic HBO broadcast commentary with distinct personalities:
 * - Jim Lampley: Play-by-play (the voice of HBO Boxing)
 * - George Foreman: Color commentary (jokes, career references, homespun wisdom)
 * - Larry Merchant: Expert analysis (intellectual observations, boxing history)
 * - Harold Lederman: Unofficial scorer (scorecard updates every 3 rounds)
 */

export class CommentatorProfiles {
  constructor() {
    this.fighterA = null;
    this.fighterB = null;
    this.fighterAShort = null;
    this.fighterBShort = null;

    // Track conversation flow for natural back-and-forth
    this.lastSpeaker = null;
    this.exchangeCount = 0;
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

  // ============================================================================
  // JIM LAMPLEY - Play-by-Play
  // The authoritative voice of HBO Boxing. Dramatic, precise, builds tension.
  // ============================================================================

  lampley = {
    // Fight opening
    fightStart: () => {
      const templates = [
        `And here we go! {fighterA} and {fighterB}, two warriors about to wage war in the squared circle!`,
        `The moment has arrived! {fighterA} versus {fighterB}! This is what we've been waiting for!`,
        `Ladies and gentlemen, it's FIGHT TIME! {fighterA} and {fighterB} touching gloves and we are UNDERWAY!`,
        `The anticipation is over! {fighterA} and {fighterB} in what promises to be a spectacular battle!`,
        `At last! {fighterA} meets {fighterB}! The crowd is electric and so are we!`
      ];
      return this.fill(this.pick(templates), {
        fighterA: this.fighterA.name,
        fighterB: this.fighterB.name
      });
    },

    // Round start
    roundStart: (round) => {
      if (round === 1) {
        return this.pick([
          `The bell rings and round one is underway!`,
          `And we're off! Round one begins!`,
          `Here we go, round one! Both fighters come out to the center of the ring.`,
          `The opening bell! Let's see how these two want to establish themselves early.`
        ]);
      } else if (round >= 10) {
        const templates = [
          `Round {round}! Championship rounds! This is where legends are made!`,
          `Here we go, round {round}! The championship rounds! Who wants it more?`,
          `Round {round} begins! We're in the deep waters now!`,
          `The bell for round {round}! Can they dig deep when it matters most?`
        ];
        return this.fill(this.pick(templates), { round });
      } else {
        const templates = [
          `Round {round} begins.`,
          `The bell sounds for round {round}.`,
          `Here we go, round {round}.`,
          `Round {round} is underway.`,
          `We're into round {round} now.`
        ];
        return this.fill(this.pick(templates), { round });
      }
    },

    // Big punches
    hugePunch: (attacker, punchName, target) => {
      const templates = [
        `OH! {attacker} LANDS A HUGE {punch}!`,
        `WHAT A {punch} FROM {attacker}! {target} FELT THAT ONE!`,
        `{attacker} CONNECTS WITH A DEVASTATING {punch}!`,
        `BOOM! {punch} LANDS FLUSH FOR {attacker}!`,
        `OH MY! WHAT A {punch}! {attacker} JUST HURT HIM!`,
        `{attacker} WITH A MONSTER {punch}! {target} IS IN TROUBLE!`,
        `TREMENDOUS {punch} FROM {attacker}!`,
        `{attacker} UNLOADS A MASSIVE {punch}!`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        target: this.getName(target),
        punch: punchName.toUpperCase()
      });
    },

    // Clean punches
    cleanPunch: (attacker, punchName) => {
      const templates = [
        `Clean {punch} from {attacker}.`,
        `{attacker} lands the {punch} cleanly.`,
        `Nice {punch} by {attacker}. That one scored.`,
        `{attacker} connects with a crisp {punch}.`,
        `That {punch} snapped his head back.`,
        `{attacker} getting through with the {punch}.`,
        `Solid {punch} from {attacker}. Good leather.`,
        `{attacker} finding a home for that {punch}.`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchName
      });
    },

    // Counter punches
    counter: (attacker, punchName) => {
      const templates = [
        `Beautiful counter {punch} from {attacker}!`,
        `{attacker} times it PERFECTLY with the counter!`,
        `Counter {punch}! {attacker} makes him pay!`,
        `OH! {attacker} catches him coming in!`,
        `TIMING! {attacker} with the counter {punch}!`,
        `{attacker} was waiting for that! Counter {punch} lands flush!`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchName
      });
    },

    // Body shots
    bodyShot: (attacker, punchName) => {
      const templates = [
        `{attacker} goes to the body!`,
        `{attacker} DIGS to the body with the {punch}!`,
        `Body shot from {attacker}! That'll slow him down!`,
        `{attacker} targeting the midsection!`,
        `Good body work from {attacker}!`,
        `{attacker} investing in body shots. Smart boxing.`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchName
      });
    },

    // Jab work
    jab: (attacker) => {
      const templates = [
        `{attacker} working behind the jab.`,
        `{attacker} pops the jab.`,
        `Good jab from {attacker}.`,
        `{attacker} establishing the jab.`,
        `The jab is finding a home for {attacker}.`,
        `{attacker} sticks the jab out there.`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Knockdown
    knockdown: (downed, attacker, punch) => {
      const templates = [
        `DOWN GOES {downed}! DOWN GOES {downed}!`,
        `{downed} IS DOWN! {attacker} PUT HIM ON THE CANVAS!`,
        `HE'S DOWN! {downed} HAS BEEN DROPPED BY THAT {punch}!`,
        `{downed} IS ON THE CANVAS! WHAT A {punch} FROM {attacker}!`,
        `KNOCKDOWN! {downed} GOES DOWN FROM THAT {punch}!`,
        `{attacker} HAS {downed} DOWN! THE REFEREE IS COUNTING!`
      ];
      return this.fill(this.pick(templates), {
        downed: this.getName(downed).toUpperCase(),
        attacker: this.getName(attacker),
        punch: punch.toUpperCase()
      });
    },

    // Fighter hurt
    hurt: (fighter) => {
      const templates = [
        `{fighter} IS HURT! Can he survive?`,
        `{fighter} is in trouble! His legs are gone!`,
        `OH! {fighter} IS BADLY HURT!`,
        `{fighter} is wobbled! He's trying to hold on!`,
        `{fighter} is in serious trouble here!`,
        `{fighter}'s legs have betrayed him! He's hurt!`
      ];
      return this.fill(this.pick(templates), { fighter: this.getName(fighter) });
    },

    // Recovery
    recovery: (fighter) => {
      const templates = [
        `{fighter} has survived! He's back in the fight!`,
        `{fighter} has weathered the storm! What courage!`,
        `{fighter} clears his head! He's okay!`,
        `The champion's heart in {fighter}! He's recovered!`,
        `{fighter} has gathered himself! He's fighting back!`
      ];
      return this.fill(this.pick(templates), { fighter: this.getName(fighter) });
    },

    // Round end
    roundEnd: (round, statsA, statsB) => {
      const landedA = statsA?.punchesLanded || 0;
      const landedB = statsB?.punchesLanded || 0;
      const diff = Math.abs(landedA - landedB);

      if (diff > 15) {
        const winner = landedA > landedB ? 'A' : 'B';
        const templates = [
          `{winner} dominated that round, out-landing his opponent {winLanded} to {loseLanded}.`,
          `Dominant round for {winner}. {winLanded} punches landed to {loseLanded}.`,
          `{winner} controlled every second of that round.`,
          `One-sided round for {winner}. The stats tell the story.`
        ];
        return this.fill(this.pick(templates), {
          winner: this.getName(winner),
          winLanded: Math.max(landedA, landedB),
          loseLanded: Math.min(landedA, landedB)
        });
      } else if (diff > 5) {
        const winner = landedA > landedB ? 'A' : 'B';
        const templates = [
          `{winner} edges that round with {winLanded} punches landed.`,
          `Slight edge to {winner} in that round.`,
          `{winner} did enough to take that round.`,
          `Give that round to {winner}, but it was competitive.`
        ];
        return this.fill(this.pick(templates), {
          winner: this.getName(winner),
          winLanded: Math.max(landedA, landedB)
        });
      } else {
        return this.pick([
          `Close round! That one could go either way on the scorecards.`,
          `Very close round. The judges will have a tough time with that one.`,
          `Pick 'em round! Both fighters had their moments.`,
          `Razor thin round. Could go either way.`,
          `The judges earn their money on rounds like that.`
        ]);
      }
    },

    // Fight end - decision
    decisionAnnouncement: (winner, method, scoreA, scoreB) => {
      const templates = [
        `Ladies and gentlemen, we go to the scorecards!`,
        `This fight goes to the judges' scorecards!`,
        `After {rounds} rounds of action, we await the official decision!`
      ];
      return this.pick(templates);
    },

    // Fight end - KO
    koAnnouncement: (winner, loser, round, punch) => {
      const templates = [
        `IT'S ALL OVER! {winner} KNOCKS OUT {loser} IN ROUND {round}!`,
        `{loser} IS NOT GETTING UP! {winner} WINS BY KNOCKOUT!`,
        `THE FIGHT IS OVER! {winner} WITH A DEVASTATING KNOCKOUT VICTORY!`,
        `KNOCKOUT! {winner} FINISHES {loser} IN ROUND {round}!`,
        `{winner} HAS DONE IT! KNOCKOUT VICTORY IN ROUND {round}!`
      ];
      return this.fill(this.pick(templates), {
        winner: this.getName(winner).toUpperCase(),
        loser: this.getName(loser).toUpperCase(),
        round
      });
    },

    // Winner announcement
    winnerAnnouncement: (winner, method) => {
      const winnerFull = winner === 'A' ? this.fighterA.name : this.fighterB.name;
      const templates = [
        `YOUR WINNER... {winner}!`,
        `And the winner... {winner}!`,
        `{winner} gets the victory!`,
        `The winner and still fighting... {winner}!`
      ];
      return this.fill(this.pick(templates), { winner: winnerFull.toUpperCase() });
    }
  };

  // ============================================================================
  // GEORGE FOREMAN - Color Commentary
  // Jovial, references to food and his career, homespun wisdom, genuine warmth.
  // Known for: BBQ grill jokes, talking about his 10 kids named George,
  // referencing his comeback, praising punching power.
  // ============================================================================

  foreman = {
    // Fight opening
    fightStart: () => {
      const templates = [
        `Oh man, I love a good heavyweight fight! This is gonna be better than a double bacon cheeseburger!`,
        `I'm excited, Jim! These two boys are ready to rumble! Reminds me of my young days!`,
        `You know, this is what boxing is all about! Two warriors willing to put it all on the line!`,
        `I've been in that ring, I know how they feel! The butterflies, the excitement! Let's GO!`,
        `This is beautiful, Jim! Two fighters, one ring, and a whole lot of leather about to fly!`
      ];
      return this.pick(templates);
    },

    // Reaction to big punch
    bigPunch: (attacker, target) => {
      const templates = [
        `OHHH! That hurt! I felt that one from up here, Jim!`,
        `Now THAT'S what I call punching power! Reminds me of the old days!`,
        `Good NIGHT! That's the kind of punch that makes you forget your mama's name!`,
        `WOW! That's what we call a WHAM-burger with cheese!`,
        `Lord have mercy! That punch would've knocked the grill right off my patio!`,
        `That's a GOODNIGHT punch right there! Put you right to sleep!`,
        `OH MY! That's the kind of power I used to have before I discovered cheeseburgers!`,
        `See Jim, THAT'S what we call a receipt! He's collecting on that one!`,
        `That boy can PUNCH! That's God-given power right there!`,
        `WHOO! {attacker} hit him so hard I think I felt it!`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Reaction to body shot
    bodyShot: (attacker) => {
      const templates = [
        `Oh that body shot! That's gonna take something out of him!`,
        `You know Jim, body shots are like making deposits in the bank. They pay off later!`,
        `That's smart boxing! Attack the body, the head will follow!`,
        `OOOF! Right in the bread basket! That's gonna hurt in the morning!`,
        `See, that's what I always say - chop down the tree at the trunk!`,
        `Body shots, Jim! That's how Big George used to do it! Work that midsection!`,
        `That's gonna add up! Like calories at a buffet - it ALL adds up!`,
        `{attacker} is working that body like I work a grill!`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Knockdown reaction
    knockdown: (downed, attacker) => {
      const templates = [
        `OH LORD! Get up son! GET UP!`,
        `That's what punching power does! When you got it, you got it!`,
        `I've been there! I know what it feels like! The whole world goes sideways!`,
        `Wooo! That boy's seeing more stars than a planetarium!`,
        `That's heavyweight power, Jim! One punch can change EVERYTHING!`,
        `Get up! C'mon! You can do it! I got up against Ali, you can get up too!`,
        `Lord have mercy! That's the kind of punch that rearranges your furniture!`,
        `OH MY! That punch had BAD INTENTIONS written all over it!`
      ];
      return this.pick(templates);
    },

    // Fighter showing heart
    heart: (fighter) => {
      const templates = [
        `This boy's got HEART! You can't teach that!`,
        `That's a WARRIOR right there! Not giving up!`,
        `See Jim, this is what boxing is really about! The will to win!`,
        `He's hurt but he won't quit! That's a CHAMPION'S heart!`,
        `You know, I've been hurt like that. It's what you do AFTER that matters!`,
        `{fighter} is showing us something here! Real courage!`,
        `This is why I love this sport! The human spirit on display!`
      ];
      return this.fill(this.pick(templates), { fighter: this.getName(fighter) });
    },

    // Technical observation (simplified)
    technicalNote: (attacker) => {
      const templates = [
        `You know, I like what {attacker} is doing. Keep it simple, keep punching!`,
        `{attacker} is listening to his corner. That's important!`,
        `Good fundamentals from {attacker}! Jab, move, jab, move!`,
        `{attacker} is boxing smart. Not getting into a street fight!`,
        `I like that! {attacker} is picking his shots, not just throwing wild!`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Career reference / nostalgia
    careerReference: () => {
      const templates = [
        `You know Jim, this reminds me of when I fought Ali in Zaire. Different times!`,
        `Back in my day, I would've loved to fight guys like this!`,
        `I came back at 45 years old and won the heavyweight title! Anything is possible!`,
        `These young guys are good, but they ain't fighting George Foreman, I can tell you that!`,
        `My mama always said, 'George, you hit too hard!' She was right!`,
        `All 10 of my Georges are watching this fight! Family bonding time!`,
        `You know what this fight needs? Some of my special BBQ sauce! Keeps you strong!`,
        `I used to throw punches just like that. Now I just flip burgers!`,
        `When I was champion, we didn't have all these fancy footwork. We just PUNCHED!`
      ];
      return this.pick(templates);
    },

    // Joke / light moment
    joke: () => {
      const templates = [
        `You know Jim, I'm getting hungry watching all this action! Somebody order me a burger!`,
        `These boys are working harder than my grill on the Fourth of July!`,
        `If boxing doesn't work out, I could use a guy like that at my next BBQ!`,
        `My grill has seen softer action than this fight!`,
        `I got 10 kids named George and none of them punch this hard!`,
        `This is more exciting than finding an extra burger patty in the package!`,
        `You know what would make this fight perfect? A nice medium-rare ribeye!`,
        `They're throwing more punches than I throw burgers on Memorial Day!`,
        `If these guys hit my grill this hard, I'd be out of business!`,
        `Somebody's gonna need some ice cream after this one! Trust me, ice cream helps!`
      ];
      return this.pick(templates);
    },

    // Round end observation
    roundEnd: () => {
      const templates = [
        `Good round! Both boys came to fight tonight!`,
        `That's what I like to see! Heart and determination!`,
        `You know Jim, in MY day that would've been a 10-9 round!`,
        `These boys are earning their paychecks tonight!`,
        `Great action! This is why we love boxing!`,
        `Whoever wins this fight, they both showed up to WORK!`
      ];
      return this.pick(templates);
    },

    // Pre-round insight
    preRound: (round) => {
      if (round >= 10) {
        const templates = [
          `Championship rounds, Jim! This is where we separate the men from the boys!`,
          `Here's where conditioning matters! Who did the roadwork?`,
          `Deep waters now! When I came back at 45, these rounds were HARD!`,
          `This is where you find out what a fighter is really made of!`
        ];
        return this.pick(templates);
      }
      return null;
    }
  };

  // ============================================================================
  // LARRY MERCHANT - Expert Analysis
  // Intellectual, historical references, strategic insights, sometimes contrarian,
  // known for pointed questions and deep boxing knowledge.
  // ============================================================================

  merchant = {
    // Fight opening
    fightStart: () => {
      const templates = [
        `The styles make fights, and these two present an intriguing puzzle. Let's see who solves it first.`,
        `In the grand theater of boxing, we have two contrasting narratives about to collide.`,
        `The sweet science is about to reveal its secrets. May the better strategist prevail.`,
        `Boxing is chess with blood. Tonight we find out who's the grandmaster.`,
        `Every fight tells a story. I'm curious to see which chapter these two are about to write.`
      ];
      return this.pick(templates);
    },

    // Strategic observation
    strategicObservation: (attacker, target) => {
      const templates = [
        `{attacker} is establishing positional dominance - a fundamental that separates the elite from the merely good.`,
        `Notice how {attacker} controls the distance. Ring generalship is an underappreciated art.`,
        `{attacker} is boxing like a man who's studied the film. Every move has purpose.`,
        `The angles {attacker} is creating - that's the kind of subtle brilliance you don't see in the stats.`,
        `{attacker} is fighting a thinking man's fight. The cerebral approach.`,
        `What {attacker} understands, and many don't, is that boxing is about real estate. Control the center, control the fight.`,
        `{attacker} is making {target} fight the fight HE wants to fight. That's the key to victory.`,
        `There's a chess match happening here that casual observers might miss. {attacker} is three moves ahead.`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        target: this.getName(target)
      });
    },

    // Technical analysis
    technicalAnalysis: (attacker, punchType) => {
      const templates = [
        `The mechanics on that {punch} - textbook. {attacker} was taught by someone who understood the craft.`,
        `That {punch} came from the floor. That's where real power is generated.`,
        `{attacker}'s {punch} has that old-school torque. They don't teach that anymore.`,
        `The timing on that {punch} - you can't teach timing. You either have it or you don't.`,
        `Notice how {attacker} sits down on that {punch}. That's how you generate leverage.`,
        `That {punch} was set up three punches ago. Boxing is about combinations of intention.`,
        `{attacker} disguised that {punch} beautifully. Deception is the soul of boxing.`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchType
      });
    },

    // Historical reference
    historicalReference: (context) => {
      const templates = [
        `This reminds me of the Robinson-LaMotta rivalry - two contrasting styles destined to clash.`,
        `We're seeing shades of Ali's defensive genius here. Float like a butterfly indeed.`,
        `In the tradition of the great counterpunchers - Sweet Pea, Toney, Mayweather - timing trumps everything.`,
        `This body attack is reminiscent of Julio Cesar Chavez. Death by a thousand cuts.`,
        `The pressure we're seeing recalls Joe Frazier at his relentless best.`,
        `There's a Salvador Sanchez quality to this performance. Technical brilliance with power.`,
        `This is Duran-Leonard level chess. Two masters testing each other's defenses.`,
        `The old masters would appreciate this. Boxing is timeless when done right.`
      ];
      return this.pick(templates);
    },

    // Criticism / contrarian view
    criticalObservation: (fighter) => {
      const templates = [
        `{fighter} is leaving his chin exposed. At this level, that's an invitation for disaster.`,
        `I'm not sure what {fighter}'s corner is thinking. The game plan isn't working.`,
        `{fighter} needs to make adjustments. Doing the same thing and expecting different results...`,
        `There's a flaw in {fighter}'s technique that will be exploited by better opposition.`,
        `{fighter} is fighting emotionally. The great ones maintain composure.`,
        `{fighter} has physical gifts, but I question the boxing IQ we're seeing tonight.`,
        `If 50 years in boxing has taught me anything, it's that {fighter} needs to change something, and fast.`
      ];
      return this.fill(this.pick(templates), { fighter: this.getName(fighter) });
    },

    // Counter punch appreciation
    counterPunchReaction: (attacker) => {
      const templates = [
        `That's the sweet science in its purest form. {attacker} made him pay for aggression.`,
        `Counterpunching is the highest form of boxing intelligence. {attacker} just demonstrated why.`,
        `{attacker} was waiting for that all night. Patience rewarded.`,
        `The counter punch is boxing's great equalizer. Ask anyone who's been caught by one.`,
        `{attacker} is fighting in the negative space - punching where his opponent will be, not where he is.`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Body shot analysis
    bodyWorkAnalysis: (attacker) => {
      const templates = [
        `The body attack is boxing's forgotten art. {attacker} is reminding us of its importance.`,
        `Liver shots end fights that head shots only postpone. {attacker} understands this.`,
        `{attacker} is attacking the foundation. The body deteriorates; the head can only take so much.`,
        `This is old-school boxing. Attack the body, and the head becomes reachable.`,
        `The body work will pay dividends in the championship rounds. Smart investment.`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Knockdown analysis
    knockdownAnalysis: (downed, attacker) => {
      const templates = [
        `That knockdown was the culmination of accumulated damage. The punch that drops you is rarely the one you see.`,
        `{attacker} found the button. In boxing, everyone has one - the trick is finding it.`,
        `That's what happens when you take liberties with a puncher. {attacker} made him pay the full price.`,
        `The knockdown tells a story - {downed} was compromised before that punch landed.`,
        `Boxing is about accumulation. That knockdown was written several rounds ago.`
      ];
      return this.fill(this.pick(templates), {
        downed: this.getName(downed),
        attacker: this.getName(attacker)
      });
    },

    // Round end analysis
    roundEndAnalysis: (round, statsA, statsB) => {
      const landedA = statsA?.punchesLanded || 0;
      const landedB = statsB?.punchesLanded || 0;
      const powerA = statsA?.powerPunchesLanded || 0;
      const powerB = statsB?.powerPunchesLanded || 0;

      const templates = [
        `The stats only tell part of the story. The judges see things CompuBox doesn't measure.`,
        `Ring generalship, effective aggression, clean punching, defense - the four pillars of scoring. We saw all four at play.`,
        `Numbers can be deceiving in boxing. It's not how many you throw, it's how many change the fight.`,
        `The tale of the tape means nothing once the bell rings. We're seeing that truth unfold.`,
        `Boxing scoring remains an imperfect science. Two honest observers might see that round differently.`
      ];
      return this.pick(templates);
    },

    // Pre-round insight
    preRound: (round) => {
      if (round >= 10) {
        const templates = [
          `The championship rounds test something that can't be measured - the will to persevere when every fiber says stop.`,
          `This is where preparation meets desperation. The roadwork pays off now or never.`,
          `Historically, the fighter who imposes his will in rounds ten through twelve wins the war.`,
          `We're about to learn who trained harder, who sacrificed more. The championship rounds reveal all.`
        ];
        return this.pick(templates);
      }
      return null;
    },

    // Fight end analysis
    fightEndAnalysis: (winner, loser, method) => {
      const templates = [
        `{winner} solved the puzzle. That's what great fighters do - they find answers.`,
        `Tonight {winner} was the better man. Tomorrow is another story in this sport.`,
        `Boxing is cruel in its clarity. {winner} earned this victory with craft and will.`,
        `{winner} executed a game plan. In boxing, that's often the difference.`,
        `The better fighter won tonight. {winner} left no doubt.`
      ];
      return this.fill(this.pick(templates), {
        winner: this.getName(winner),
        loser: this.getName(loser)
      });
    }
  };

  // ============================================================================
  // HAROLD LEDERMAN - Unofficial Scorer
  // Enthusiastic, numbers-focused, scorecard analysis every 3 rounds.
  // Known for his distinctive "JIM!" calls and animated scoring breakdowns.
  // ============================================================================

  lederman = {
    // Introduction
    intro: (round) => {
      const templates = [
        `JIM! Harold Lederman here at ringside with my unofficial scorecard!`,
        `JIM! Let me give you my scorecard through ${round} rounds!`,
        `JIM! Harold Lederman, unofficial scorer here at ringside!`,
        `JIM! Time for my unofficial scorecard! Let me tell you what I've got!`
      ];
      return this.pick(templates);
    },

    // Scorecard announcement
    scorecard: (round, scoreA, scoreB, fighterALeading) => {
      const fighterA = this.fighterAShort;
      const fighterB = this.fighterBShort;
      const diff = Math.abs(scoreA - scoreB);

      if (scoreA === scoreB) {
        const templates = [
          `After ${round} rounds, I have it DEAD EVEN! ${scoreA} to ${scoreB}! This is a CLOSE fight, Jim!`,
          `My card shows ${scoreA}-${scoreB}, ALL TIED UP! Neither man has established control!`,
          `It's ${scoreA}-${scoreB} on my card! Even Steven! We need separation!`,
          `I've got it ${scoreA}-${scoreB}! Can't separate 'em! This could go either way!`
        ];
        return this.pick(templates);
      } else if (diff <= 2) {
        const leader = fighterALeading ? fighterA : fighterB;
        const leaderScore = Math.max(scoreA, scoreB);
        const trailerScore = Math.min(scoreA, scoreB);
        const templates = [
          `I have ${leader} ahead ${leaderScore} to ${trailerScore}! CLOSE FIGHT! Very close!`,
          `On my card, ${leader} leads ${leaderScore}-${trailerScore}! But it's RAZOR THIN!`,
          `${leader} is up ${leaderScore} to ${trailerScore} on my scorecard! But don't blink - this can change!`,
          `I've got ${leader} by just ${diff} points, ${leaderScore}-${trailerScore}! Anybody's fight!`
        ];
        return this.pick(templates);
      } else {
        const leader = fighterALeading ? fighterA : fighterB;
        const trailer = fighterALeading ? fighterB : fighterA;
        const leaderScore = Math.max(scoreA, scoreB);
        const trailerScore = Math.min(scoreA, scoreB);
        const templates = [
          `${leader} is IN CONTROL on my card! ${leaderScore} to ${trailerScore}! ${trailer} needs to do something!`,
          `I have ${leader} CLEARLY ahead ${leaderScore}-${trailerScore}! ${trailer} needs a knockout!`,
          `My scorecard shows ${leader} up BIG, ${leaderScore} to ${trailerScore}! ${trailer} is running out of time!`,
          `${leader} is dominating my card, ${leaderScore}-${trailerScore}! ${trailer} has to turn this around!`
        ];
        return this.pick(templates);
      }
    },

    // Round assessment
    roundAssessment: (round, winner, wasClose) => {
      const winnerName = this.getName(winner);
      if (wasClose) {
        const templates = [
          `I gave round ${round} to ${winnerName}, but JIM, it was CLOSE! Could've gone either way!`,
          `Round ${round} goes to ${winnerName} on my card, but the judges might see it differently!`,
          `${winnerName} edges round ${round} for me, but I wouldn't argue with a draw round!`,
          `I scored round ${round} for ${winnerName} by a HAIR! Tough round to score!`
        ];
        return this.pick(templates);
      } else {
        const templates = [
          `Round ${round} was CLEARLY ${winnerName}'s round! No doubt about it!`,
          `I gave ${winnerName} round ${round} - he DOMINATED that round!`,
          `${winnerName} took round ${round} decisively! Great round for him!`,
          `Round ${round} belongs to ${winnerName}! He was the BOSS in that round!`
        ];
        return this.pick(templates);
      }
    },

    // Key observation
    keyObservation: (statsA, statsB) => {
      const powerA = statsA?.powerPunchesLanded || 0;
      const powerB = statsB?.powerPunchesLanded || 0;
      const jabsA = statsA?.jabsLanded || 0;
      const jabsB = statsB?.jabsLanded || 0;

      const templates = [
        `The power punches are making the difference, Jim! The judges SEE those!`,
        `Jab totals don't always win rounds - it's the QUALITY of shots!`,
        `The body work is going to pay off in the late rounds, trust me!`,
        `Ring generalship matters! The judges notice who controls the center!`,
        `Clean punching is KEY! It's not just about volume, Jim!`
      ];
      return this.pick(templates);
    },

    // Dramatic moment reaction
    dramaticMoment: () => {
      const templates = [
        `JIM! Did you SEE that?! That's gonna affect the scoring!`,
        `WHOA! That changes EVERYTHING on the scorecards!`,
        `JIM! That's a 10-8 round right there if I ever saw one!`,
        `That knockdown is HUGE for the scorecards, Jim!`
      ];
      return this.pick(templates);
    },

    // Final prediction
    finalPrediction: (scoreA, scoreB) => {
      const fighterA = this.fighterA.name;
      const fighterB = this.fighterB.name;
      const diff = Math.abs(scoreA - scoreB);

      if (diff <= 2) {
        const templates = [
          `JIM, this is TOO CLOSE TO CALL! I wouldn't bet my house on this one!`,
          `My final card is tight! The judges could go EITHER WAY!`,
          `This one's going to the wire! I hope the judges got it right!`
        ];
        return this.pick(templates);
      } else {
        const leader = scoreA > scoreB ? fighterA : fighterB;
        const templates = [
          `JIM, on my card ${leader} should get the decision! But you never know with judges!`,
          `I have ${leader} winning this fight! Let's see what the official judges say!`,
          `${leader} should be getting his hand raised, Jim! At least on MY scorecard!`
        ];
        return this.pick(templates);
      }
    }
  };

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate complete commentary for an event with appropriate voices
   */
  generateCommentary(event, fightState) {
    const commentary = [];

    switch (event.type) {
      case 'FIGHT_START':
        commentary.push({ speaker: 'Lampley', text: this.lampley.fightStart(), priority: 'critical' });
        if (Math.random() < 0.7) {
          commentary.push({ speaker: 'Foreman', text: this.foreman.fightStart(), priority: 'high' });
        }
        if (Math.random() < 0.5) {
          commentary.push({ speaker: 'Merchant', text: this.merchant.fightStart(), priority: 'normal' });
        }
        break;

      case 'ROUND_START':
        commentary.push({ speaker: 'Lampley', text: this.lampley.roundStart(event.round), priority: 'high' });

        // Foreman pre-round for championship rounds
        const foremanPre = this.foreman.preRound(event.round);
        if (foremanPre) {
          commentary.push({ speaker: 'Foreman', text: foremanPre, priority: 'normal' });
        }

        // Merchant pre-round for championship rounds
        const merchantPre = this.merchant.preRound(event.round);
        if (merchantPre && Math.random() < 0.6) {
          commentary.push({ speaker: 'Merchant', text: merchantPre, priority: 'normal' });
        }
        break;

      case 'PUNCH_LANDED':
        commentary.push(...this.generatePunchCommentary(event, fightState));
        break;

      case 'KNOCKDOWN':
        commentary.push({ speaker: 'Lampley', text: this.lampley.knockdown(event.fighter, event.attacker, event.punch), priority: 'critical' });
        commentary.push({ speaker: 'Foreman', text: this.foreman.knockdown(event.fighter, event.attacker), priority: 'critical' });
        if (Math.random() < 0.7) {
          commentary.push({ speaker: 'Merchant', text: this.merchant.knockdownAnalysis(event.fighter, event.attacker), priority: 'high' });
        }
        // Harold on knockdowns
        commentary.push({ speaker: 'Lederman', text: this.lederman.dramaticMoment(), priority: 'high' });
        break;

      case 'HURT':
        commentary.push({ speaker: 'Lampley', text: this.lampley.hurt(event.fighter), priority: 'critical' });
        if (Math.random() < 0.8) {
          commentary.push({ speaker: 'Foreman', text: this.foreman.heart(event.fighter), priority: 'high' });
        }
        break;

      case 'RECOVERY':
        commentary.push({ speaker: 'Lampley', text: this.lampley.recovery(event.fighter), priority: 'high' });
        break;

      case 'ROUND_END':
        commentary.push(...this.generateRoundEndCommentary(event, fightState));
        break;

      case 'LEDERMAN_SCORECARD':
        commentary.push(...this.generateLedermanScorecard(event, fightState));
        break;

      case 'FIGHT_END':
        commentary.push(...this.generateFightEndCommentary(event, fightState));
        break;
    }

    return commentary;
  }

  /**
   * Generate punch commentary with appropriate voices
   */
  generatePunchCommentary(event, fightState) {
    const commentary = [];
    const attacker = event.attacker;
    const target = event.target;
    const punchName = this.formatPunchName(event.punchType);

    // Devastating shots (damage >= 6) - all commentators react
    if (event.damage >= 6) {
      commentary.push({ speaker: 'Lampley', text: this.lampley.hugePunch(attacker, punchName, target), priority: 'critical' });
      commentary.push({ speaker: 'Foreman', text: this.foreman.bigPunch(attacker, target), priority: 'high' });
      if (Math.random() < 0.5) {
        commentary.push({ speaker: 'Merchant', text: this.merchant.technicalAnalysis(attacker, punchName), priority: 'normal' });
      }
    }
    // Big shots (damage >= 4)
    else if (event.damage >= 4) {
      if (event.isCounter) {
        commentary.push({ speaker: 'Lampley', text: this.lampley.counter(attacker, punchName), priority: 'high' });
        if (Math.random() < 0.6) {
          commentary.push({ speaker: 'Merchant', text: this.merchant.counterPunchReaction(attacker), priority: 'normal' });
        }
      } else if (event.location === 'body') {
        commentary.push({ speaker: 'Lampley', text: this.lampley.bodyShot(attacker, punchName), priority: 'high' });
        if (Math.random() < 0.5) {
          commentary.push({ speaker: 'Foreman', text: this.foreman.bodyShot(attacker), priority: 'normal' });
        }
        if (Math.random() < 0.3) {
          commentary.push({ speaker: 'Merchant', text: this.merchant.bodyWorkAnalysis(attacker), priority: 'normal' });
        }
      } else {
        commentary.push({ speaker: 'Lampley', text: this.lampley.cleanPunch(attacker, punchName), priority: 'high' });
        // Random Foreman reaction
        if (Math.random() < 0.3) {
          commentary.push({ speaker: 'Foreman', text: this.foreman.technicalNote(attacker), priority: 'low' });
        }
      }
    }
    // Solid shots (damage >= 2) - Lampley only, sometimes
    else if (event.damage >= 2) {
      if (event.isCounter) {
        commentary.push({ speaker: 'Lampley', text: this.lampley.counter(attacker, punchName), priority: 'normal' });
      } else if (event.location === 'body') {
        commentary.push({ speaker: 'Lampley', text: this.lampley.bodyShot(attacker, punchName), priority: 'normal' });
      } else if (Math.random() < 0.7) {
        commentary.push({ speaker: 'Lampley', text: this.lampley.cleanPunch(attacker, punchName), priority: 'normal' });
      }
    }
    // Light jabs (damage >= 0.8) - occasional
    else if (event.damage >= 0.8 && Math.random() < 0.5) {
      const isJab = event.punchType === 'jab' || event.punchType === 'body_jab';
      if (isJab) {
        commentary.push({ speaker: 'Lampley', text: this.lampley.jab(attacker), priority: 'low' });
      }
    }
    // Very light - rare comment
    else if (event.damage >= 0.3 && Math.random() < 0.2) {
      const isJab = event.punchType === 'jab' || event.punchType === 'body_jab';
      if (isJab) {
        commentary.push({ speaker: 'Lampley', text: this.lampley.jab(attacker), priority: 'low' });
      }
    }

    // Occasional strategic observation from Merchant
    if (Math.random() < 0.05 && event.damage >= 2) {
      commentary.push({ speaker: 'Merchant', text: this.merchant.strategicObservation(attacker, target), priority: 'normal' });
    }

    // Occasional Foreman joke/career reference
    if (Math.random() < 0.03) {
      if (Math.random() < 0.5) {
        commentary.push({ speaker: 'Foreman', text: this.foreman.joke(), priority: 'low' });
      } else {
        commentary.push({ speaker: 'Foreman', text: this.foreman.careerReference(), priority: 'low' });
      }
    }

    return commentary;
  }

  /**
   * Generate round end commentary
   */
  generateRoundEndCommentary(event, fightState) {
    const commentary = [];
    const round = event.round;
    const statsA = event.stats?.A || event.stats?.stats?.A || {};
    const statsB = event.stats?.B || event.stats?.stats?.B || {};

    // Lampley always calls the end
    commentary.push({ speaker: 'Lampley', text: `The bell sounds to end round ${round}.`, priority: 'high' });
    commentary.push({ speaker: 'Lampley', text: this.lampley.roundEnd(round, statsA, statsB), priority: 'normal' });

    // Foreman observation
    if (Math.random() < 0.6) {
      commentary.push({ speaker: 'Foreman', text: this.foreman.roundEnd(), priority: 'normal' });
    }

    // Merchant analysis
    if (Math.random() < 0.5) {
      commentary.push({ speaker: 'Merchant', text: this.merchant.roundEndAnalysis(round, statsA, statsB), priority: 'normal' });
    }

    // Historical reference from Merchant occasionally
    if (Math.random() < 0.15) {
      commentary.push({ speaker: 'Merchant', text: this.merchant.historicalReference(), priority: 'low' });
    }

    return commentary;
  }

  /**
   * Generate Harold Lederman's scorecard (every 3 rounds)
   */
  generateLedermanScorecard(event, fightState) {
    const commentary = [];
    const round = event.round;
    const scoreA = event.scoreA;
    const scoreB = event.scoreB;
    const fighterALeading = scoreA >= scoreB;

    // Harold's intro
    commentary.push({ speaker: 'Lederman', text: this.lederman.intro(round), priority: 'high' });

    // The scorecard
    commentary.push({ speaker: 'Lederman', text: this.lederman.scorecard(round, scoreA, scoreB, fighterALeading), priority: 'high' });

    // Key observation
    if (Math.random() < 0.7) {
      commentary.push({ speaker: 'Lederman', text: this.lederman.keyObservation(event.statsA, event.statsB), priority: 'normal' });
    }

    return commentary;
  }

  /**
   * Generate fight end commentary
   */
  generateFightEndCommentary(event, fightState) {
    const commentary = [];
    const winner = event.winner;
    const loser = winner === 'A' ? 'B' : 'A';
    const method = event.method;

    if (method && (method.includes('KO') || method.includes('TKO'))) {
      // Knockout finish
      commentary.push({ speaker: 'Lampley', text: this.lampley.koAnnouncement(winner, loser, event.round, event.punch || 'punch'), priority: 'critical' });
      commentary.push({ speaker: 'Foreman', text: this.pick([
        `What a FINISH! That's why we love this sport!`,
        `I told you! When you got power, you're ALWAYS in the fight!`,
        `THAT'S heavyweight boxing, Jim! One punch changes everything!`,
        `I've been hit like that. Trust me, you don't get up from that!`
      ]), priority: 'high' });
      commentary.push({ speaker: 'Merchant', text: this.merchant.fightEndAnalysis(winner, loser, method), priority: 'normal' });
    } else {
      // Decision
      commentary.push({ speaker: 'Lampley', text: `The final bell has sounded! This fight goes to the scorecards!`, priority: 'high' });
      commentary.push({ speaker: 'Lampley', text: this.lampley.decisionAnnouncement(winner, method), priority: 'high' });

      // Lederman's final prediction
      if (event.scoreA !== undefined && event.scoreB !== undefined) {
        commentary.push({ speaker: 'Lederman', text: this.lederman.finalPrediction(event.scoreA, event.scoreB), priority: 'high' });
      }

      // Winner announcement
      commentary.push({ speaker: 'Lampley', text: this.lampley.winnerAnnouncement(winner, method), priority: 'critical' });

      // Post-fight analysis
      commentary.push({ speaker: 'Merchant', text: this.merchant.fightEndAnalysis(winner, loser, method), priority: 'normal' });
      commentary.push({ speaker: 'Foreman', text: this.pick([
        `Both fighters gave us a SHOW tonight! That's what boxing is about!`,
        `Great fight! Both guys showed heart!`,
        `You know Jim, win or lose, these boys earned their paychecks tonight!`,
        `What a battle! This is why I love this sport!`
      ]), priority: 'normal' });
    }

    return commentary;
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
}
