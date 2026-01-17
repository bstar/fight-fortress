# Fight Fortress - Claude Code Context

This is a professional boxing simulation engine with realistic mechanics, AI decision-making, and terminal-based visualization.

## Quick Commands

```bash
# Run interactive menu
npm start

# Run a specific fight
node src/index.js fight fighters/templates/historical/tyson-mike.yaml fighters/templates/historical/lewis-lennox.yaml --rounds 12 --speed 3

# Run batch test for balance checking
node src/index.js batch <fighterA> <fighterB> --count 100

# Run predefined balance tests
node scripts/batch-test.js
```

## Project Structure

```
src/
├── index.js              # CLI entry point, menu system
├── engine/
│   ├── SimulationLoop.js # Main game loop, tick system
│   ├── FighterAI.js      # AI decision making, style behaviors
│   ├── CombatResolver.js # Punch resolution, hit detection
│   ├── DamageCalculator.js # Damage formulas, KO mechanics
│   ├── StaminaManager.js # Energy system, fatigue
│   └── PositionTracker.js # Ring positioning, distance
├── display/
│   ├── GameMenu.js       # Interactive arrow-key menu
│   ├── SimpleTUI.js      # Classic HBO broadcast style display
│   ├── ArcadeTUI.js      # Video game style display (health bars, combos)
│   └── CommentaryGenerator.js # HBO broadcast team commentary
├── models/
│   ├── Fighter.js        # Fighter state, attributes
│   ├── Fight.js          # Fight state, rounds, scoring
│   └── Round.js          # Round tracking
└── utils/
    └── ConfigLoader.js   # YAML/JSON fighter loading

fighters/
├── templates/historical/ # Tyson, Lewis, Holyfield, etc.
└── custom/               # User-created fighters

docs/                     # Detailed system documentation
```

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Balance tuning | `src/engine/FighterAI.js`, `src/engine/DamageCalculator.js` |
| Fighter stats | `fighters/templates/historical/*.yaml` |
| Display/UI | `src/display/SimpleTUI.js`, `src/display/ArcadeTUI.js` |
| Menu system | `src/display/GameMenu.js`, `src/index.js:runGameMenu()` |
| Batch testing | `scripts/batch-test.js`, `src/index.js:runBatchTest()` |
| Commentary | `src/display/CommentaryGenerator.js` |

## Fighter YAML Schema

```yaml
identity:
  name: "Fighter Name"
  nickname: "The Nickname"

physical:
  height: 180        # cm
  weight: 90         # kg
  reach: 185         # cm
  stance: orthodox   # or southpaw

style:
  primary: out-boxer # out-boxer, swarmer, slugger, boxer-puncher,
                     # counter-puncher, inside-fighter, volume-puncher
  defensive: high-guard  # peek-a-boo, philly-shell, distance, slick
  offensive: jab-and-move # combo-puncher, body-snatcher, headhunter

# All attributes 1-100
power:
  powerLeft: 75
  powerRight: 85
  knockoutPower: 80

speed:
  handSpeed: 80
  footSpeed: 75
  reflexes: 78

stamina:
  cardio: 85
  recoveryRate: 80

defense:
  headMovement: 75
  blocking: 80

mental:
  chin: 85           # Ability to take a punch
  heart: 80          # Fighting through adversity
  killerInstinct: 75 # Finishing hurt opponents

record:
  wins: 30
  losses: 2
  kos: 20
```

## Balance Guidelines

Target win rates for style matchups:
- **Out-boxer vs Slugger**: 55-45 out-boxer (movement frustrates power)
- **Slugger vs Swarmer**: 55-45 slugger (power punishes aggression)
- **Swarmer vs Out-boxer**: 55-45 swarmer (pressure negates distance)
- **Counter-puncher vs Slugger**: 55-45 counter-puncher (timing beats loading up)

Historical targets:
- Tyson vs Lewis: ~45-55 (Lewis reach advantage)
- Lewis vs Holyfield: ~55-45 (Lewis size)
- Tyson vs Holyfield: ~45-55 (Holyfield conditioning)

## Display Modes

Two TUI modes available via `--display` flag:
- `hbo` (default): Classic broadcast style with detailed commentary
- `arcade`: Fighting game style with health bars, combos, hit effects

## Testing Balance

**Always use 100 fights for balance testing** - this gives clean percentages and statistically meaningful results.

```bash
# Standard balance test (100 fights - recommended)
node src/index.js batch fighter1.yaml fighter2.yaml --count 100

# Run all historical matchups
node scripts/batch-test.js
```

Look for:
- Win rates outside 35-65% range = needs tuning
- KO rates should match fighter styles (sluggers > 50% KO rate)
- Decision rate 30-50% is healthy
- Average fight length 8-11 rounds is good
