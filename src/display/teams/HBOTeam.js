/**
 * HBO Boxing Broadcast Team
 *
 * The legendary HBO Boxing commentary team:
 * - Jim Lampley: Play-by-play (the voice of HBO Boxing)
 * - George Foreman: Color commentary (jokes, career references, homespun wisdom)
 * - Larry Merchant: Expert analysis (intellectual observations, boxing history)
 * - Harold Lederman: Unofficial scorer (scorecard updates every 3 rounds)
 *
 * This represents the golden era of HBO Boxing from the 1990s-2010s.
 */

import { BroadcastTeam, registerBroadcastTeam } from '../BroadcastTeam.js';

export class HBOTeam extends BroadcastTeam {
  constructor() {
    super('HBO Boxing');

    this.playByPlay = { name: 'Jim Lampley', id: 'lampley' };
    this.colorCommentator = { name: 'George Foreman', id: 'foreman' };
    this.analyst = { name: 'Larry Merchant', id: 'merchant' };
    this.scorer = { name: 'Harold Lederman', id: 'lederman' };
  }

  // ============================================================================
  // JIM LAMPLEY - Play-by-Play
  // The authoritative voice of HBO Boxing. Dramatic, precise, builds tension.
  // ============================================================================

  lampley = {
    // Fight opening - Jim Lampley's dramatic voice
    fightStart: () => {
      const templates = [
        `And here we go! {fighterA} and {fighterB}, two warriors about to wage war in the squared circle!`,
        `The moment has arrived! {fighterA} versus {fighterB}! This is what we've been waiting for!`,
        `Ladies and gentlemen, it's FIGHT TIME! {fighterA} and {fighterB} touching gloves and we are UNDERWAY!`,
        `The anticipation is over! {fighterA} and {fighterB} in what promises to be a spectacular battle!`,
        `At last! {fighterA} meets {fighterB}! The crowd is electric and so are we!`,
        `Good evening, I'm Jim Lampley. We are LIVE for {fighterA} versus {fighterB}!`,
        `This is the fight the boxing world has been waiting for! {fighterA}! {fighterB}! HERE WE GO!`,
        `From ringside, this is Jim Lampley. {fighterA} and {fighterB} are about to settle it in the ring!`,
        `The referee calls them together... the gloves touch... and IT'S ON! {fighterA} versus {fighterB}!`,
        `After months of anticipation, {fighterA} and {fighterB} finally meet! This is HBO Boxing!`,
        `Welcome to HBO Boxing! I'm Jim Lampley, ringside for {fighterA} versus {fighterB}!`,
        `The lights dim, the crowd roars, and we're ready! {fighterA}! {fighterB}! LET'S GO!`,
        `This is the moment of truth! {fighterA} against {fighterB}! The bell is about to ring!`
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

    // Big punches - EXPANDED variations
    hugePunch: (attacker, punchName, target) => {
      const templates = [
        `OH! {attacker} LANDS A HUGE {punch}!`,
        `WHAT A {punch} FROM {attacker}! {target} FELT THAT ONE!`,
        `{attacker} CONNECTS WITH A DEVASTATING {punch}!`,
        `BOOM! {punch} LANDS FLUSH FOR {attacker}!`,
        `OH MY! WHAT A {punch}! {attacker} JUST HURT HIM!`,
        `{attacker} WITH A MONSTER {punch}! {target} IS IN TROUBLE!`,
        `TREMENDOUS {punch} FROM {attacker}!`,
        `{attacker} UNLOADS A MASSIVE {punch}!`,
        `THUNDEROUS {punch} FROM {attacker}! THE CANVAS ALMOST SHOOK!`,
        `{attacker} DELIVERS A VICIOUS {punch}! {target} IS ROCKED!`,
        `EXPLOSIVE {punch} FROM {attacker}! THAT ONE LANDED CLEAN!`,
        `{attacker} DETONATES A {punch}! {target} IS STAGGERED!`,
        `WICKED {punch} FROM {attacker}! PURE VIOLENCE!`,
        `{attacker} CRACKS HIM WITH A {punch}! WHAT A SHOT!`,
        `TREMENDOUS POWER! {attacker} WITH THE {punch}!`,
        `{attacker} LAUNCHES A MISSILE! THE {punch} CONNECTS!`,
        `THAT {punch} BUCKLED {target}'S LEGS!`,
        `{attacker} ABSOLUTELY BLASTS {target} WITH A {punch}!`,
        `A BOMB OF A {punch} FROM {attacker}!`,
        `CRUSHING {punch}! {attacker} PUT EVERYTHING INTO THAT!`,
        `{target} JUST ATE A HUGE {punch} FROM {attacker}!`,
        `{attacker} CATCHES {target} COLD WITH THE {punch}!`,
        `THE {punch} FROM {attacker} WAS DEVASTATING!`,
        `{attacker} NEARLY TAKES {target}'S HEAD OFF WITH THAT {punch}!`,
        `WHAT POWER! {attacker} WITH A HELLACIOUS {punch}!`,
        `{attacker} CONNECTS UPSTAIRS! HUGE {punch}!`,
        `{target} IS WOBBLED BY THAT {punch} FROM {attacker}!`,
        `A SLEDGEHAMMER {punch} FROM {attacker}!`,
        `{attacker} LANDS THE {punch} RIGHT ON THE BUTTON!`,
        `PICTURE PERFECT {punch}! {attacker} CAUGHT HIM CLEAN!`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        target: this.getName(target),
        punch: punchName.toUpperCase()
      });
    },

    // Clean punches - EXPANDED variations
    cleanPunch: (attacker, punchName) => {
      const templates = [
        `Clean {punch} from {attacker}.`,
        `{attacker} lands the {punch} cleanly.`,
        `Nice {punch} by {attacker}. That one scored.`,
        `{attacker} connects with a crisp {punch}.`,
        `That {punch} snapped his head back.`,
        `{attacker} getting through with the {punch}.`,
        `Solid {punch} from {attacker}. Good leather.`,
        `{attacker} finding a home for that {punch}.`,
        `{attacker} scores with the {punch}.`,
        `The {punch} lands for {attacker}.`,
        `{attacker} with a sharp {punch}.`,
        `{punch} connects! Good shot from {attacker}.`,
        `{attacker} tags him with a {punch}.`,
        `Right on target! {punch} from {attacker}.`,
        `{attacker} sneaks in that {punch}.`,
        `{attacker} slips in a nice {punch}.`,
        `That {punch} got through for {attacker}.`,
        `{attacker} makes contact with the {punch}.`,
        `{punch} finds the mark for {attacker}.`,
        `{attacker} catches him with the {punch}.`,
        `{attacker} deposits a {punch}.`,
        `Good shot! {attacker} with the {punch}.`,
        `{attacker} nails him with that {punch}.`,
        `{attacker} peppers him with the {punch}.`,
        `{attacker} scores points with the {punch}.`,
        `Flush! {attacker} lands the {punch}.`,
        `{attacker} is connecting with that {punch}.`,
        `{attacker} stings him with the {punch}.`,
        `The {punch} sneaks through for {attacker}.`,
        `{attacker} drills him with a {punch}.`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchName
      });
    },

    // Counter punches - Jim Lampley appreciates the timing
    counter: (attacker, punchName) => {
      const templates = [
        `Beautiful counter {punch} from {attacker}!`,
        `{attacker} times it PERFECTLY with the counter!`,
        `Counter {punch}! {attacker} makes him pay!`,
        `OH! {attacker} catches him coming in!`,
        `TIMING! {attacker} with the counter {punch}!`,
        `{attacker} was waiting for that! Counter {punch} lands flush!`,
        `{attacker} counters brilliantly with the {punch}!`,
        `Textbook counter from {attacker}! That's championship boxing!`,
        `{attacker} sits down on that counter {punch}!`,
        `That's why you don't rush in! {attacker} makes him pay!`,
        `PRECISION COUNTER from {attacker}!`,
        `{attacker} with the counter {punch}! Beautiful timing!`,
        `The counter {punch} lands! {attacker} read it perfectly!`,
        `{attacker} PUNISHES the aggression! Counter {punch}!`,
        `{attacker} turns defense into offense! Counter {punch}!`,
        `THAT'S the counter {attacker} was looking for!`,
        `{attacker} springs the trap! Counter {punch} lands clean!`,
        `{attacker} makes him miss and makes him PAY!`,
        `The {punch} on the counter! {attacker} timed it perfectly!`,
        `{attacker} anticipated it! Counter {punch} right on target!`,
        `{attacker} was laying in wait! Counter {punch}!`,
        `What reflexes! {attacker} with the counter {punch}!`,
        `{attacker} slips and counters with the {punch}!`,
        `That's RING IQ! {attacker} counters beautifully!`,
        `{attacker} fires back with the counter {punch}!`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchName
      });
    },

    // Body shots - EXPANDED variations
    bodyShot: (attacker, punchName) => {
      const templates = [
        `{attacker} goes to the body!`,
        `{attacker} DIGS to the body with the {punch}!`,
        `Body shot from {attacker}! That'll slow him down!`,
        `{attacker} targeting the midsection!`,
        `Good body work from {attacker}!`,
        `{attacker} investing in body shots. Smart boxing.`,
        `{attacker} attacks the body!`,
        `That body shot found the mark!`,
        `{attacker} digging to the ribs!`,
        `The body is the target for {attacker}!`,
        `{attacker} goes downstairs with the {punch}!`,
        `{attacker} buries one in the midsection!`,
        `Punishing body shot from {attacker}!`,
        `{attacker} lands to the body!`,
        `{attacker} sinks a {punch} into the breadbasket!`,
        `Body! Body! {attacker} working downstairs!`,
        `{attacker} rips one to the ribs!`,
        `That body shot doubled him over!`,
        `{attacker} finding the soft spots!`,
        `The body attack continues from {attacker}!`,
        `{attacker} hammering the body!`,
        `Another one to the body from {attacker}!`,
        `{attacker} digs a {punch} into the solar plexus!`,
        `{attacker} punishing the body!`,
        `Nasty body shot from {attacker}!`,
        `{attacker} going to work on the body!`,
        `Right to the liver! {attacker} with the body shot!`,
        `{attacker} lands a thudding body shot!`,
        `The body is taking punishment from {attacker}!`,
        `{attacker} folds him with a body shot!`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchName
      });
    },

    // Jab work - EXPANDED variations
    jab: (attacker) => {
      const templates = [
        `{attacker} working behind the jab.`,
        `{attacker} pops the jab.`,
        `Good jab from {attacker}.`,
        `{attacker} establishing the jab.`,
        `The jab is finding a home for {attacker}.`,
        `{attacker} sticks the jab out there.`,
        `{attacker} pumping the jab.`,
        `Nice jab work from {attacker}.`,
        `{attacker} using the jab to control distance.`,
        `That jab keeps snapping his head back.`,
        `{attacker} with the range-finder.`,
        `The jab is working for {attacker}.`,
        `{attacker} flicks out the jab.`,
        `Jab lands for {attacker}.`,
        `{attacker} touching him with the jab.`,
        `{attacker} measuring with the jab.`,
        `The jab scores for {attacker}.`,
        `{attacker} feints and jabs.`,
        `{attacker} doubling up on the jab.`,
        `That jab found its mark.`,
        `{attacker} is peppering him with jabs.`,
        `Another jab lands for {attacker}.`,
        `{attacker} probing with the left hand.`,
        `{attacker} controls distance with the jab.`,
        `{attacker} spears him with the jab.`,
        `The jab is {attacker}'s best friend tonight.`,
        `{attacker} is busy with that jab.`,
        `{attacker} snaps out another jab.`,
        `{attacker} keeps touching him with the jab.`,
        `{attacker} establishing range with jabs.`,
        `The stiff jab from {attacker}.`,
        `{attacker} pawing with the jab.`,
        `{attacker} setting things up with the jab.`,
        `{attacker} scoring with the lead hand.`,
        `{attacker} finds the target with the jab.`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Knockdown - Jim Lampley's iconic dramatic calls
    knockdown: (downed, attacker, punch) => {
      const templates = [
        `DOWN GOES {downed}! DOWN GOES {downed}!`,
        `DOWN GOES {downed}! DOWN GOES {downed}! DOWN GOES {downed}!`,
        `{downed} IS DOWN! {attacker} PUT HIM ON THE CANVAS!`,
        `HE'S DOWN! {downed} HAS BEEN DROPPED BY THAT {punch}!`,
        `{downed} IS ON THE CANVAS! WHAT A {punch} FROM {attacker}!`,
        `KNOCKDOWN! {downed} GOES DOWN FROM THAT {punch}!`,
        `{attacker} HAS {downed} DOWN! THE REFEREE IS COUNTING!`,
        `OH! {downed} CRUMBLES TO THE CANVAS!`,
        `{downed} IS HURT AND DOWN! CAN HE BEAT THE COUNT?`,
        `THE {punch} SENDS {downed} DOWN! WHAT A SHOT!`,
        `{downed} IS DOWN! THE CROWD IS ON ITS FEET!`,
        `AND {downed} IS DOWN! TREMENDOUS {punch} FROM {attacker}!`,
        `{downed} HITS THE CANVAS! THE COUNT IS ON!`,
        `UNBELIEVABLE! {downed} HAS BEEN DROPPED! THE CROWD ERUPTS!`,
        `{attacker} FLOORS {downed}! WHAT A MOMENT!`,
        `THE {punch} LANDS AND {downed} GOES DOWN HARD!`,
        `{downed} ON THE CANVAS! {attacker} MAY HAVE JUST CHANGED THIS FIGHT!`,
        `DOWN! {downed} IS DOWN! THE REFEREE STARTS THE COUNT!`,
        `A {punch} AND {downed} COLLAPSES! THIS IS INCREDIBLE!`,
        `{downed} CANNOT STAY UP! HE'S DOWN FROM THAT {punch}!`,
        `THIS IS DRAMA! {downed} HIT THE DECK! {attacker} CELEBRATING!`,
        `AND {downed} FALLS! THE {punch} WAS DEVASTATING!`,
        `{attacker} WITH THE {punch} OF THE NIGHT! {downed} IS DOWN!`,
        `TIMBER! {downed} GOES DOWN LIKE A REDWOOD!`,
        `{downed} CRASHING TO THE CANVAS! CAN HE SURVIVE?`
      ];
      return this.fill(this.pick(templates), {
        downed: this.getName(downed).toUpperCase(),
        attacker: this.getName(attacker),
        punch: punch.toUpperCase()
      });
    },

    // Fighter hurt - Jim Lampley's dramatic urgency
    hurt: (fighter) => {
      const templates = [
        `{fighter} IS HURT! Can he survive?`,
        `{fighter} is in trouble! His legs are gone!`,
        `OH! {fighter} IS BADLY HURT!`,
        `{fighter} is wobbled! He's trying to hold on!`,
        `{fighter} is in serious trouble here!`,
        `{fighter}'s legs have betrayed him! He's hurt!`,
        `{fighter} is STAGGERED! He's holding on for dear life!`,
        `{fighter} is in desperate trouble now!`,
        `THE LEGS ARE GONE! {fighter} is badly hurt!`,
        `{fighter} is on shaky legs! Can his corner save him?`,
        `{fighter} IS IN SURVIVAL MODE! He's badly hurt!`,
        `{fighter} TRYING TO SURVIVE! The legs are rubber!`,
        `THIS IS A CRISIS FOR {fighter}! He's hurt badly!`,
        `{fighter} IS REELING! Can he make it to the bell?`,
        `{fighter} HAS BEEN STUNNED! His senses are scrambled!`,
        `{fighter} IS FIGHTING FOR SURVIVAL NOW!`,
        `THE SITUATION IS DIRE FOR {fighter}!`,
        `{fighter} BARELY STANDING! This could be over any second!`,
        `{fighter} IS ON QUEER STREET! He doesn't know where he is!`,
        `{fighter} HANGING ON BY A THREAD!`,
        `{fighter}'S LEGS HAVE TURNED TO JELLY!`,
        `{fighter} IS IN THE FIGHT OF HIS LIFE RIGHT NOW!`,
        `{fighter} DESPERATELY CLINCHING! He's hurt!`,
        `{fighter} IS BUZZED! The punch landed flush!`,
        `CAN {fighter} RECOVER? He's badly shaken!`
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
        `{fighter} has gathered himself! He's fighting back!`,
        `{fighter} is back! What a warrior!`,
        `{fighter} has steadied the ship! He's still in this!`,
        `The heart of a champion! {fighter} survives!`
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
          `One-sided round for {winner}. The stats tell the story.`,
          `{winner} takes that round clearly. Complete control.`
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
          `Give that round to {winner}, but it was competitive.`,
          `{winner} takes the round. Solid work.`
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
          `The judges earn their money on rounds like that.`,
          `Coin flip round! Hard to separate them.`,
          `Both fighters had success. Tough round to score.`
        ]);
      }
    },

    // Fight end - KO
    koAnnouncement: (winner, loser, round, punch) => {
      const templates = [
        `IT'S ALL OVER! {winner} KNOCKS OUT {loser} IN ROUND {round}!`,
        `{loser} IS NOT GETTING UP! {winner} WINS BY KNOCKOUT!`,
        `THE FIGHT IS OVER! {winner} WITH A DEVASTATING KNOCKOUT VICTORY!`,
        `KNOCKOUT! {winner} FINISHES {loser} IN ROUND {round}!`,
        `{winner} HAS DONE IT! KNOCKOUT VICTORY IN ROUND {round}!`,
        `THE REFEREE WAVES IT OFF! {winner} BY KNOCKOUT!`,
        `{loser} CANNOT CONTINUE! {winner} WINS BY KO!`
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
        `And the winner by {method}... {winner}!`,
        `{winner} gets the victory!`,
        `Ladies and gentlemen, the winner... {winner}!`,
        `The winner and NEW... {winner}!`
      ];
      return this.fill(this.pick(templates), {
        winner: winnerFull.toUpperCase(),
        method: method || 'decision'
      });
    }
  };

  // ============================================================================
  // GEORGE FOREMAN - Color Commentary
  // Jovial, references to food and his career, homespun wisdom, genuine warmth.
  // Known for: BBQ grill jokes, talking about his kids named George,
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
        `This is beautiful, Jim! Two fighters, one ring, and a whole lot of leather about to fly!`,
        `Man oh man, Jim! I can feel the electricity! These boys are READY!`,
        `This takes me back! Nothing like the anticipation before a big fight!`
      ];
      return this.pick(templates);
    },

    // Reaction to big punch - EXPANDED variations
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
        `WHOO! {attacker} hit him so hard I think I felt it!`,
        `My GOODNESS! That punch had some SEASONING on it!`,
        `Jim! Did you SEE that? That's REAL power!`,
        `That's the kind of punch that sends you to bed early! GOOD NIGHT!`,
        `OH LORD! That punch had BAD INTENTIONS!`,
        `WHAM! That's what I'm talking about! POWER punching!`,
        `OH MAMA! That one scrambled his eggs!`,
        `Now THAT'S a punch! Makes my knuckles hurt just watching!`,
        `Jim, that punch was MEANER than my mother-in-law!`,
        `WHOOO-WEEE! That one registered on the Richter scale!`,
        `That's HEAVYWEIGHT power, baby! You can't teach that!`,
        `Man oh MAN! That punch would wake up a grizzly bear!`,
        `BOOM! That's the kind of shot that changes careers!`,
        `Lord ALMIGHTY! That boy felt that one in his SOUL!`,
        `OUCH! I'm checking MY chin after that one!`,
        `That punch was NASTIER than day-old grill grease!`,
        `Jim! THAT'S how Big George used to do it!`,
        `Sweet JESUS! That one had his whole family on it!`,
        `OH MY! Even my BURGERS don't sizzle that loud!`,
        `Now THAT is what we call a TOUCH OF DEATH!`,
        `WOW! {attacker} put some STANK on that one!`,
        `That's a LIGHTS OUT punch! Somebody call the electrician!`,
        `OH BABY! That's the kind of punch that makes you call your mama!`,
        `Jim, I've THROWN punches like that! That one HURTS!`,
        `THUNDER and LIGHTNING! {attacker} brought the STORM!`,
        `That's GROWN MAN power right there, Jim!`
      ];
      return this.fill(this.pick(templates), { attacker: this.getName(attacker) });
    },

    // Reaction to body shot - George Foreman style with BBQ/food references
    bodyShot: (attacker) => {
      const templates = [
        `Oh that body shot! That's gonna take something out of him!`,
        `You know Jim, body shots are like making deposits in the bank. They pay off later!`,
        `That's smart boxing! Attack the body, the head will follow!`,
        `OOOF! Right in the bread basket! That's gonna hurt in the morning!`,
        `See, that's what I always say - chop down the tree at the trunk!`,
        `Body shots, Jim! That's how Big George used to do it! Work that midsection!`,
        `That's gonna add up! Like calories at a buffet - it ALL adds up!`,
        `{attacker} is working that body like I work my George Foreman Grill!`,
        `That body shot hit him right in the lunch! Ooof!`,
        `Keep going to the body! That's the recipe for success!`,
        `That body shot made ME want to sit down!`,
        `Man! That body shot was MEANER than burnt brisket!`,
        `That's like tenderizing a steak, Jim! Break down the body!`,
        `OOOF! I felt that one in MY belly, and I got a LOT of belly!`,
        `Body work, Jim! Like marinating - takes time but it PAYS OFF!`,
        `That body shot would've made a grown man cry! Ask me how I know!`,
        `{attacker} is cooking him with those body shots! Like slow-roasted ribs!`,
        `My TEN Georges all felt THAT one, Jim!`,
        `Body punches are like hot sauce - they BURN later!`,
        `That's what I used to do to Joe Frazier! Work that body!`,
        `Keep punching that body! It's like checking if the turkey's done!`,
        `WHAM to the body! That's gonna take the STARCH right out of him!`
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
        `OH MY! That punch had BAD INTENTIONS written all over it!`,
        `WHOA! When you get hit like that, you don't know where you ARE!`,
        `I remember being on that canvas, Jim. It's lonely down there!`,
        `That punch would've knocked over a BUILDING!`,
        `GET UP! C'mon now! You're a FIGHTER! FIGHT!`
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
        `This is why I love this sport! The human spirit on display!`,
        `{fighter} is a TRUE fighter! Won't give up!`,
        `That's what we call GUTS, Jim! Pure GUTS!`,
        `When you've got heart, you're NEVER out of a fight!`
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
        `I like that! {attacker} is picking his shots, not just throwing wild!`,
        `{attacker} is doing the right things. Smart boxing!`,
        `That's textbook right there from {attacker}!`,
        `{attacker} must've watched some tape! Good game plan!`
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
        `When I was champion, we didn't have all these fancy footwork. We just PUNCHED!`,
        `I knocked out Joe Frazier TWICE! That's the kind of power you need in this sport!`,
        `They called me Big George for a reason, Jim!`,
        `In the Rumble in the Jungle, I learned that boxing is about MORE than just power!`,
        `You know, I was undefeated before Ali. Forty wins, no losses! Then Zaire happened.`,
        `I came back from retirement to become the oldest heavyweight champion ever! At 45!`
      ];
      return this.pick(templates);
    },

    // Joke / light moment - Pure George Foreman personality
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
        `Somebody's gonna need some ice cream after this one! Trust me, ice cream helps!`,
        `These boys are hungrier than I am at an all-you-can-eat buffet!`,
        `I named all my sons George so I wouldn't forget their names. True story!`,
        `My grill could learn something from these two! That's some HEAT!`,
        `This fight is hotter than my grill on Super Bowl Sunday!`,
        `You know, after this fight, we should ALL go get some BBQ!`,
        `I'd rather face either of these guys than my wife when dinner's late!`,
        `These punches are so hard, I'm checking MY chin from up here!`,
        `Jim, this action is making me hungry! Is there a concession stand nearby?`,
        `My Lean Mean Grilling Machine couldn't handle THIS much heat!`,
        `You know what I tell my ten Georges? Don't box, GRILL! It's safer!`,
        `This fight is spicier than my secret BBQ sauce recipe!`,
        `I sold millions of grills, Jim, but I can't sell courage like THIS!`,
        `These boys are tougher than a well-done steak! And I like mine WELL-done!`,
        `Jim, I'm sweating more than a brisket at 225 degrees!`,
        `My grill does knock the fat out... but not like THAT punch!`,
        `I've had sparring sessions easier than making Thanksgiving dinner for 12 kids!`,
        `You know what pairs well with boxing? A cheeseburger! Trust Big George!`,
        `This reminds me of my training days... minus the cheeseburgers!`,
        `George Junior through George the Tenth are all watching this! Family bonding!`,
        `My grandkids call me 'Big Poppa Grill' - I wonder why!`,
        `I may have sold grills, but tonight we're GRILLING in the ring!`,
        `Jim, when I retired, I ate so many burgers I came BACK at 45!`,
        `The only thing harder than their punches is my arteries after a BBQ!`,
        `I tell you Jim, boxing is tough... but so is a overcooked burger!`
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
        `Whoever wins this fight, they both showed up to WORK!`,
        `These fighters are giving us our money's worth!`,
        `THAT'S boxing, Jim! Give and take!`,
        `Both fighters showed something that round!`
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
          `This is where you find out what a fighter is really made of!`,
          `Championship rounds! Time to dig DEEP!`,
          `These are the rounds that define careers, Jim!`
        ];
        return this.pick(templates);
      }
      return null;
    },

    // Post-fight reaction
    postFight: () => {
      const templates = [
        `What a FIGHT! Both fighters gave us everything they had!`,
        `That's boxing at its finest, Jim! I love this sport!`,
        `Both guys should be proud! They left it all in the ring!`,
        `THAT'S what we came to see! Great fight!`,
        `Win or lose, these boys are warriors! WARRIORS!`
      ];
      return this.pick(templates);
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
        `Every fight tells a story. I'm curious to see which chapter these two are about to write.`,
        `The tale of the tape is just prologue. The real story begins with the opening bell.`,
        `Boxing's beauty lies in its uncertainty. Two men enter, and only the ring knows what will happen.`
      ];
      return this.pick(templates);
    },

    // Strategic observation - context-aware based on fight state
    strategicObservation: (attacker, target, context = {}) => {
      let templates;

      // Choose templates based on context
      if (context.isCounter) {
        templates = [
          `{attacker} is fighting the patient game. Let them come to you, make them pay.`,
          `This is the counterpuncher's art - {attacker} is making aggression costly.`,
          `{attacker} understands that sometimes the best offense is waiting for mistakes.`,
          `{attacker} is fighting in the negative space - punching where the opponent will be.`
        ];
      } else if (context.isBody) {
        templates = [
          `{attacker} is investing in the body. That's long-term thinking in a short-term sport.`,
          `The body attack from {attacker} is textbook. Break down the foundation, the structure collapses.`,
          `{attacker} understands what the old trainers taught - kill the body and the head dies.`,
          `This body work will manifest in the later rounds. {attacker} is playing chess.`
        ];
      } else if (context.damage >= 4) {
        templates = [
          `{attacker} is imposing his will now. This is what dominance looks like.`,
          `{attacker} has found the range and the timing. {target} needs to make adjustments.`,
          `{attacker} is in complete control of the distance and the tempo.`,
          `The momentum has shifted decisively toward {attacker}. The fight is being dictated.`
        ];
      } else {
        templates = [
          `{attacker} is establishing positional dominance - a fundamental that separates the elite from the merely good.`,
          `Notice how {attacker} controls the distance. Ring generalship is an underappreciated art.`,
          `{attacker} is boxing like a man who's studied the film. Every move has purpose.`,
          `The angles {attacker} is creating - that's the kind of subtle brilliance you don't see in the stats.`,
          `{attacker} is fighting a thinking man's fight. The cerebral approach.`,
          `What {attacker} understands, and many don't, is that boxing is about real estate. Control the center, control the fight.`,
          `{attacker} is making {target} fight the fight HE wants to fight. That's the key to victory.`,
          `There's a chess match happening here that casual observers might miss. {attacker} is three moves ahead.`,
          `{attacker} is dictating the tempo. In boxing, rhythm matters more than people realize.`,
          `The positioning is everything here. {attacker} understands spatial relationships.`,
          `{attacker} is fighting with intention. Every punch, every step has meaning.`,
          `This is the kind of nuanced boxing that doesn't make highlight reels but wins championships.`
        ];
      }

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
        `{attacker} disguised that {punch} beautifully. Deception is the soul of boxing.`,
        `The economy of motion on that {punch} - nothing wasted. Pure efficiency.`,
        `{attacker}'s {punch} has snap. That comes from years of hitting the heavy bag correctly.`,
        `The transfer of weight on that {punch} was perfect. Physics meets pugilism.`,
        `That {punch} traveled the shortest distance between two points. Einstein would approve.`
      ];
      return this.fill(this.pick(templates), {
        attacker: this.getName(attacker),
        punch: punchType
      });
    },

    // Historical reference - Larry Merchant's encyclopedic boxing knowledge
    historicalReference: (context) => {
      const templates = [
        `This reminds me of the Robinson-LaMotta rivalry - two contrasting styles destined to clash.`,
        `We're seeing shades of Ali's defensive genius here. Float like a butterfly indeed.`,
        `In the tradition of the great counterpunchers - Sweet Pea, Toney, Mayweather - timing trumps everything.`,
        `This body attack is reminiscent of Julio Cesar Chavez. Death by a thousand cuts.`,
        `The pressure we're seeing recalls Joe Frazier at his relentless best.`,
        `There's a Salvador Sanchez quality to this performance. Technical brilliance with power.`,
        `This is Duran-Leonard level chess. Two masters testing each other's defenses.`,
        `The old masters would appreciate this. Boxing is timeless when done right.`,
        `Archie Moore would have loved to analyze this fight. The nuance is extraordinary.`,
        `This has echoes of Hagler-Hearns - two men unwilling to take a backward step.`,
        `The great Willie Pep could have won a round without throwing a punch. We're seeing that kind of craft here.`,
        `This defensive display rivals anything we saw from Pernell Whitaker in his prime.`,
        `The last time I saw footwork this good, Sugar Ray Leonard was wearing the shoes.`,
        `This has shades of the four kings era - Leonard, Hagler, Hearns, Duran. Pure boxing.`,
        `Henry Armstrong would've loved this pace. Three-division champion who never stopped throwing.`,
        `Joe Louis had an economy of motion like this. The Brown Bomber wasted nothing.`,
        `This reminds me of when Duran told Leonard 'No mas'. The body work broke him.`,
        `Jack Johnson would smile at this defensive mastery. The Galveston Giant was the original.`,
        `The great Benny Leonard used his mind as much as his fists. We're seeing that tonight.`,
        `This is reminiscent of Ezzard Charles - underrated brilliance in the ring.`,
        `I covered Ali-Frazier III in Manila. This intensity reminds me of that crucible.`,
        `Sandy Saddler and Willie Pep fought four times. This rivalry has that same magnetism.`,
        `The craftsmanship here recalls Carlos Monzon - the perfect middleweight.`,
        `Tony Zale and Rocky Graziano had three wars. This fight has that same electricity.`,
        `Jersey Joe Walcott had this kind of lateral movement. Criminally underrated.`,
        `This brings back memories of Emile Griffith's speed and accuracy.`,
        `I'm reminded of Alexis Arguello - power and precision in beautiful harmony.`,
        `The ring generalship here recalls Larry Holmes at his methodical best.`,
        `This pressure is like Evander Holyfield - relentless but intelligent.`,
        `In fifty years of covering boxing, nights like this are why I stayed.`
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
        `If 50 years in boxing has taught me anything, it's that {fighter} needs to change something, and fast.`,
        `{fighter} is being predictable. In boxing, predictability gets you hurt.`,
        `{fighter}'s footwork is betraying him. You can't punch what you can't reach.`,
        `{fighter} is arm-punching. The power should come from the legs.`,
        `{fighter} appears to have left his game plan in the locker room.`
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
        `{attacker} is fighting in the negative space - punching where his opponent will be, not where he is.`,
        `That's the art of anticipation. {attacker} knew that punch was coming before it was thrown.`,
        `{attacker} turned his opponent's aggression against him. Boxing judo, if you will.`,
        `The great counterpunchers make you pay for every mistake. {attacker} collected.`
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
        `The body work will pay dividends in the championship rounds. Smart investment.`,
        `{attacker} is digging for gold in that midsection. It'll pay off.`,
        `The body attack has been boxing's secret weapon for a hundred years. Still works.`,
        `{attacker} is draining the tank, one body shot at a time.`
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
        `Boxing is about accumulation. That knockdown was written several rounds ago.`,
        `{attacker} set that up masterfully. The knockdown was inevitable.`,
        `In boxing, you're only as good as your chin. {downed}'s just got tested.`,
        `The great Jack Blackburn said the punch that hurts you is the one you don't see. Case in point.`
      ];
      return this.fill(this.pick(templates), {
        downed: this.getName(downed),
        attacker: this.getName(attacker)
      });
    },

    // Round end analysis - context-aware based on round stats
    roundEndAnalysis: (round, statsA, statsB) => {
      const landedA = statsA?.punchesLanded || 0;
      const landedB = statsB?.punchesLanded || 0;
      const diff = Math.abs(landedA - landedB);

      let templates;

      if (diff > 15) {
        // One-sided round
        const dominant = landedA > landedB ? 'A' : 'B';
        templates = [
          `That was a masterclass in ring control. One fighter imposed his will completely.`,
          `When a round is that one-sided, the judges' job is easy. Dominance is impossible to miss.`,
          `That's what happens when one fighter solves the puzzle and the other has no answers.`,
          `A shutout round if I ever saw one. The difference in execution was stark.`
        ];
      } else if (diff > 5) {
        // Clear winner
        templates = [
          `Close but clear. The more effective aggression wins the day.`,
          `You could see the difference in clean punching. That's what separates rounds.`,
          `The fighter who controlled the center controlled the round.`,
          `Activity without effectiveness loses to precision. We saw that play out.`
        ];
      } else {
        // Very close round
        templates = [
          `The stats only tell part of the story. The judges see things CompuBox doesn't measure.`,
          `Ring generalship, effective aggression, clean punching, defense - the four pillars of scoring. We saw all four at play.`,
          `Numbers can be deceiving in boxing. It's not how many you throw, it's how many change the fight.`,
          `Boxing scoring remains an imperfect science. Two honest observers might see that round differently.`,
          `The aesthetic of boxing matters. Judges reward craft as much as volume.`,
          `Quality over quantity. That's been true in boxing for a hundred years.`,
          `The eye test matters more than the stat sheet. Always has, always will.`,
          `A swing round. The fighter who the judges perceive as the aggressor often gets these.`
        ];
      }

      return this.pick(templates);
    },

    // Pre-round insight
    preRound: (round) => {
      if (round >= 10) {
        const templates = [
          `The championship rounds test something that can't be measured - the will to persevere when every fiber says stop.`,
          `This is where preparation meets desperation. The roadwork pays off now or never.`,
          `Historically, the fighter who imposes his will in rounds ten through twelve wins the war.`,
          `We're about to learn who trained harder, who sacrificed more. The championship rounds reveal all.`,
          `The last three rounds are boxing's final exam. No extra credit for showing up.`,
          `Championship rounds separate the good from the great. Always have.`
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
        `The better fighter won tonight. {winner} left no doubt.`,
        `{winner} imposed his will. In boxing, that's the ultimate achievement.`,
        `Tonight we saw {winner} at his best. Or perhaps {loser} at less than his best. Boxing leaves questions.`,
        `{winner} wrote the final chapter tonight. Boxing's book remains open.`
      ];
      return this.fill(this.pick(templates), {
        winner: this.getName(winner),
        loser: this.getName(loser)
      });
    },

    // Post-fight philosophical
    postFight: () => {
      const templates = [
        `Boxing remains the most honest sport. In the end, there's nowhere to hide.`,
        `The ring reveals truth. It always has, it always will.`,
        `Another chapter in boxing's endless narrative. The story continues.`,
        `Boxing asks the ultimate question: What are you made of? Tonight we got an answer.`,
        `The sweet science delivered again. As it has for over a century.`
      ];
      return this.pick(templates);
    }
  };

  // ============================================================================
  // HAROLD LEDERMAN - Unofficial Scorer
  // Enthusiastic, numbers-focused, scorecard analysis every 3 rounds.
  // Known for his distinctive "JIM!" calls and animated scoring breakdowns.
  // ============================================================================

  lederman = {
    // Introduction - Harold Lederman's animated style (mostly "JIM!" with some variety)
    intro: (round) => {
      const templates = [
        `JIM! Harold Lederman here at ringside with my unofficial scorecard!`,
        `JIM! Let me give you my scorecard through ${round} rounds!`,
        `JIM! Harold Lederman, unofficial scorer here at ringside!`,
        `JIM! Time for my unofficial scorecard! Let me tell you what I've got!`,
        `JIM! Harold Lederman here! Let me break down my scorecard for you!`,
        `JIM! It's scorecard time! Here's how I see it through ${round}!`,
        `JIM! I gotta tell you what I'm seeing from my scorecard!`,
        `JIM! Harold Lederman with the unofficial scores after ${round}!`,
        `JIM! You want to know how I have it? Here's my card through ${round}!`,
        `JIM! I've been scoring this fight and BOY do I have numbers for you!`,
        `JIM! Let me jump in here with my unofficial scorecard!`,
        `Harold here! I've got some INTERESTING numbers for you!`,
        `Alright, let me give you my scorecard!`,
        `JIM! I've been watching closely! Here's my unofficial score!`,
        `JIM! Harold Lederman, your unofficial scorer, checking in!`
      ];
      return this.pick(templates);
    },

    // Scorecard announcement (mostly with "JIM!")
    scorecard: (round, scoreA, scoreB, fighterALeading) => {
      const fighterA = this.fighterAShort;
      const fighterB = this.fighterBShort;
      const diff = Math.abs(scoreA - scoreB);

      if (scoreA === scoreB) {
        const templates = [
          `JIM! After ${round} rounds, I have it DEAD EVEN! ${scoreA} to ${scoreB}! This is a CLOSE fight!`,
          `JIM! My card shows ${scoreA}-${scoreB}, ALL TIED UP! Neither man has established control!`,
          `It's ${scoreA}-${scoreB} on my card! Even Steven! We need separation!`,
          `JIM! I've got it ${scoreA}-${scoreB}! Can't separate 'em! This could go either way!`,
          `JIM! EVEN at ${scoreA}-${scoreB}! This fight is too close to call right now!`
        ];
        return this.pick(templates);
      } else if (diff <= 2) {
        const leader = fighterALeading ? fighterA : fighterB;
        const leaderScore = Math.max(scoreA, scoreB);
        const trailerScore = Math.min(scoreA, scoreB);
        const templates = [
          `JIM! I have ${leader} ahead ${leaderScore} to ${trailerScore}! CLOSE FIGHT! Very close!`,
          `JIM! On my card, ${leader} leads ${leaderScore}-${trailerScore}! But it's RAZOR THIN!`,
          `${leader} is up ${leaderScore} to ${trailerScore} on my scorecard! But don't blink - this can change!`,
          `JIM! I've got ${leader} by just ${diff} points, ${leaderScore}-${trailerScore}! Anybody's fight!`,
          `JIM! ${leader} edges ahead ${leaderScore}-${trailerScore} but this thing is TIGHT!`
        ];
        return this.pick(templates);
      } else {
        const leader = fighterALeading ? fighterA : fighterB;
        const trailer = fighterALeading ? fighterB : fighterA;
        const leaderScore = Math.max(scoreA, scoreB);
        const trailerScore = Math.min(scoreA, scoreB);
        const templates = [
          `JIM! ${leader} is IN CONTROL on my card! ${leaderScore} to ${trailerScore}! ${trailer} needs to do something!`,
          `JIM! I have ${leader} CLEARLY ahead ${leaderScore}-${trailerScore}! ${trailer} needs a knockout!`,
          `My scorecard shows ${leader} up BIG, ${leaderScore} to ${trailerScore}! ${trailer} is running out of time!`,
          `JIM! ${leader} is dominating my card, ${leaderScore}-${trailerScore}! ${trailer} has to turn this around!`,
          `JIM! ${leader} with a COMMANDING lead, ${leaderScore}-${trailerScore}! ${trailer} better make something happen!`
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
          `I scored round ${round} for ${winnerName} by a HAIR! Tough round to score!`,
          `Round ${round} to ${winnerName}, but JIM, I could see it the other way too!`
        ];
        return this.pick(templates);
      } else {
        const templates = [
          `Round ${round} was CLEARLY ${winnerName}'s round! No doubt about it!`,
          `I gave ${winnerName} round ${round} - he DOMINATED that round!`,
          `${winnerName} took round ${round} decisively! Great round for him!`,
          `Round ${round} belongs to ${winnerName}! He was the BOSS in that round!`,
          `No question, Jim! Round ${round} goes to ${winnerName}! CLEAR winner!`
        ];
        return this.pick(templates);
      }
    },

    // Key observation - Harold's scoring expertise (mostly with "JIM!")
    keyObservation: (statsA, statsB) => {
      const templates = [
        `JIM! The power punches are making the difference! The judges SEE those!`,
        `JIM! Jab totals don't always win rounds - it's the QUALITY of shots!`,
        `JIM! The body work is going to pay off in the late rounds, trust me!`,
        `JIM! Ring generalship matters! The judges notice who controls the center!`,
        `JIM! Clean punching is KEY! It's not just about volume!`,
        `JIM! Effective aggression! That's what the judges are looking for!`,
        `JIM! Defense wins rounds too! Don't forget about defense!`,
        `The cleaner puncher usually wins the round! That's scoring 101!`,
        `JIM! Watch the body work! It's affecting the pace of this fight!`,
        `JIM! The judges love clean punches! And we're seeing a LOT of them!`,
        `JIM! It's not just about throwing! It's about LANDING!`,
        `The compubox numbers tell ONE story, but the SCORING tells another!`,
        `JIM! Ring control! The judges reward ring control!`,
        `JIM! These body shots are gonna show up on the scorecards!`,
        `Whoever controls the center of the ring usually wins the round!`,
        `JIM! The power shots catch the judges' eyes! Trust me on this!`,
        `JIM! Defense is underrated! Judges notice who's NOT getting hit!`,
        `Activity alone doesn't win rounds! It's about EFFECTIVE activity!`,
        `JIM! The fighter who lands the cleaner shots wins! That's how I score!`,
        `JIM! Watch who's dictating the action! The judges are watching!`,
        `Landing percentage matters more than total punches thrown!`,
        `JIM! You can't just throw punches, you gotta LAND them!`,
        `I've scored thousands of fights! Clean, effective punching wins!`,
        `JIM! The aggressor usually gets the close rounds! Usually!`
      ];
      return this.pick(templates);
    },

    // Dramatic moment reaction (mostly with "JIM!")
    dramaticMoment: () => {
      const templates = [
        `JIM! Did you SEE that?! That's gonna affect the scoring!`,
        `JIM! WHOA! That changes EVERYTHING on the scorecards!`,
        `JIM! That's a 10-8 round right there if I ever saw one!`,
        `JIM! That knockdown is HUGE for the scorecards!`,
        `JIM! That's gonna be hard to overcome on the scorecards!`,
        `JIM! WOOO! That punch might have just won the fight!`,
        `JIM! The scorecards just got REAL interesting!`,
        `OH MY! That's gonna swing this fight!`,
        `JIM! THAT could be the turning point right there!`,
        `JIM! Forget the scorecards - this might not GO to the scorecards!`,
        `That changes everything! EVERYTHING!`,
        `JIM! We might not NEED the scorecards after that!`
      ];
      return this.pick(templates);
    },

    // Final prediction (mostly with "JIM!")
    finalPrediction: (scoreA, scoreB) => {
      const fighterA = this.fighterA.name;
      const fighterB = this.fighterB.name;
      const diff = Math.abs(scoreA - scoreB);

      if (diff <= 2) {
        const templates = [
          `JIM! This is TOO CLOSE TO CALL! I wouldn't bet my house on this one!`,
          `JIM! My final card is tight! The judges could go EITHER WAY!`,
          `JIM! This one's going to the wire! I hope the judges got it right!`,
          `JIM! This could go EITHER direction! It's THAT close!`,
          `Nail-biter! I don't know which way the judges will go!`
        ];
        return this.pick(templates);
      } else {
        const leader = scoreA > scoreB ? fighterA : fighterB;
        const templates = [
          `JIM! On my card ${leader} should get the decision! But you never know with judges!`,
          `JIM! I have ${leader} winning this fight! Let's see what the official judges say!`,
          `JIM! ${leader} should be getting his hand raised! At least on MY scorecard!`,
          `JIM! ${leader} SHOULD win this! My card has it clear!`,
          `The winner SHOULD be ${leader}! That's what my scorecard says!`
        ];
        return this.pick(templates);
      }
    }
  };

  // ============================================================================
  // MAIN COMMENTARY GENERATION
  // ============================================================================

  /**
   * Generate complete commentary for an event with appropriate voices
   */
  generateCommentary(event, fightState) {
    const commentary = [];

    switch (event.type) {
      case 'FIGHT_START':
        commentary.push({ speaker: 'Lampley', text: this.lampley.fightStart(), priority: 'critical' });
        if (Math.random() < 0.8) {
          commentary.push({ speaker: 'Foreman', text: this.foreman.fightStart(), priority: 'high' });
        }
        if (Math.random() < 0.2) {
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

        // Merchant pre-round for championship rounds (rare)
        const merchantPre = this.merchant.preRound(event.round);
        if (merchantPre && Math.random() < 0.15) {
          commentary.push({ speaker: 'Merchant', text: merchantPre, priority: 'normal' });
        }
        break;

      case 'PUNCH_LANDED':
        commentary.push(...this.generatePunchCommentary(event, fightState));
        break;

      case 'KNOCKDOWN':
        commentary.push({ speaker: 'Lampley', text: this.lampley.knockdown(event.fighter, event.attacker, event.punch || 'punch'), priority: 'critical' });
        commentary.push({ speaker: 'Foreman', text: this.foreman.knockdown(event.fighter, event.attacker), priority: 'critical' });
        if (Math.random() < 0.2) {
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

    // Devastating shots (damage >= 6) - Lampley + Foreman react, Merchant rarely
    if (event.damage >= 6) {
      commentary.push({ speaker: 'Lampley', text: this.lampley.hugePunch(attacker, punchName, target), priority: 'critical' });
      commentary.push({ speaker: 'Foreman', text: this.foreman.bigPunch(attacker, target), priority: 'high' });
      if (Math.random() < 0.12) {
        commentary.push({ speaker: 'Merchant', text: this.merchant.technicalAnalysis(attacker, punchName), priority: 'normal' });
      }
    }
    // Big shots (damage >= 4)
    else if (event.damage >= 4) {
      if (event.isCounter) {
        commentary.push({ speaker: 'Lampley', text: this.lampley.counter(attacker, punchName), priority: 'high' });
        if (Math.random() < 0.4) {
          commentary.push({ speaker: 'Foreman', text: this.foreman.technicalNote(attacker), priority: 'normal' });
        }
        if (Math.random() < 0.15) {
          commentary.push({ speaker: 'Merchant', text: this.merchant.counterPunchReaction(attacker), priority: 'normal' });
        }
      } else if (event.location === 'body') {
        commentary.push({ speaker: 'Lampley', text: this.lampley.bodyShot(attacker, punchName), priority: 'high' });
        if (Math.random() < 0.5) {
          commentary.push({ speaker: 'Foreman', text: this.foreman.bodyShot(attacker), priority: 'normal' });
        }
        if (Math.random() < 0.08) {
          commentary.push({ speaker: 'Merchant', text: this.merchant.bodyWorkAnalysis(attacker), priority: 'normal' });
        }
      } else {
        commentary.push({ speaker: 'Lampley', text: this.lampley.cleanPunch(attacker, punchName), priority: 'high' });
        // Random Foreman reaction
        if (Math.random() < 0.35) {
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

    // Occasional Foreman joke/career reference (5% chance)
    if (Math.random() < 0.05) {
      if (Math.random() < 0.5) {
        commentary.push({ speaker: 'Foreman', text: this.foreman.joke(), priority: 'low' });
      } else {
        commentary.push({ speaker: 'Foreman', text: this.foreman.careerReference(), priority: 'low' });
      }
    }

    // Rare strategic observation from Merchant (1.5% chance on any solid+ punch)
    if (Math.random() < 0.015 && event.damage >= 2) {
      const context = {
        isCounter: event.isCounter,
        isBody: event.location === 'body',
        damage: event.damage,
        punchType: event.punchType
      };
      commentary.push({ speaker: 'Merchant', text: this.merchant.strategicObservation(attacker, target, context), priority: 'normal' });
    }

    // Rare historical reference from Merchant (0.5% chance)
    if (Math.random() < 0.005 && event.damage >= 3) {
      commentary.push({ speaker: 'Merchant', text: this.merchant.historicalReference(), priority: 'low' });
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

    // Foreman observation (frequent)
    if (Math.random() < 0.7) {
      commentary.push({ speaker: 'Foreman', text: this.foreman.roundEnd(), priority: 'normal' });
    }

    // Merchant analysis (rare - about 1/4 of Foreman)
    if (Math.random() < 0.18) {
      commentary.push({ speaker: 'Merchant', text: this.merchant.roundEndAnalysis(round, statsA, statsB), priority: 'normal' });
    }

    // Historical reference from Merchant (very rare)
    if (Math.random() < 0.04) {
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
        `I've been hit like that. Trust me, you don't get up from that!`,
        `WHOO! That's POWER punching right there!`
      ]), priority: 'high' });
      commentary.push({ speaker: 'Merchant', text: this.merchant.fightEndAnalysis(winner, loser, method), priority: 'normal' });
    } else {
      // Decision
      commentary.push({ speaker: 'Lampley', text: `The final bell has sounded! This fight goes to the scorecards!`, priority: 'high' });

      // Lederman's final prediction
      if (event.scoreA !== undefined && event.scoreB !== undefined) {
        commentary.push({ speaker: 'Lederman', text: this.lederman.finalPrediction(event.scoreA, event.scoreB), priority: 'high' });
      }

      // Winner announcement
      commentary.push({ speaker: 'Lampley', text: this.lampley.winnerAnnouncement(winner, method), priority: 'critical' });

      // Post-fight analysis
      commentary.push({ speaker: 'Merchant', text: this.merchant.fightEndAnalysis(winner, loser, method), priority: 'normal' });
      commentary.push({ speaker: 'Foreman', text: this.foreman.postFight(), priority: 'normal' });
    }

    return commentary;
  }

  /**
   * Generate scorecard update (called every 3 rounds)
   */
  generateScorecardUpdate(round, scoreA, scoreB, statsA, statsB) {
    if (round % 3 !== 0 || round === 0) {
      return [];
    }

    return this.generateLedermanScorecard({
      round,
      scoreA,
      scoreB,
      statsA,
      statsB
    }, null);
  }
}

// Register the team
registerBroadcastTeam('hbo', HBOTeam);
