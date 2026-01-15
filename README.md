# Fight Fortress - Boxing Simulation Engine

A CLI-based professional boxing simulation engine with extreme realism. Fully automated fights between two configurable fighters, rendered beautifully in the terminal with multiple playback speeds.

## Features

- **Realistic Boxing Mechanics**: Accurate punch types (jabs, crosses, hooks, uppercuts), blocking, evasion, and counter-punching
- **Style-Based AI**: Eight distinct fighting styles (out-boxer, swarmer, slugger, boxer-puncher, counter-puncher, inside-fighter, volume-puncher, switch-hitter)
- **Dynamic Fight Effects**: Buffs and debuffs triggered by fight events (adrenaline surge, momentum, fatigue, being hurt)
- **Authentic Stamina System**: Energy management, recovery between rounds, fatigue effects on performance
- **Damage Modeling**: Head and body damage accumulation, knockdowns, KOs, and stun mechanics
- **10-Point Must Scoring**: Realistic judging with round-by-round scoring
- **Terminal UI**: Beautiful Blessed-based display with ring visualization, stats, and live commentary
- **Historical Fighters**: Pre-configured legendary fighters (Tyson, Lewis, Holyfield)

## Quick Start

```bash
# Install dependencies
npm install

# Run a fight
node src/index.js fight fighters/templates/historical/tyson-mike.yaml fighters/templates/historical/lewis-lennox.yaml

# Run with options
node src/index.js fight <fighter1> <fighter2> --rounds 12 --speed 2.0
```

## Controls During Fight

| Key | Action |
|-----|--------|
| `P` / `Space` | Pause/Resume |
| `+` / `=` | Speed up |
| `-` / `_` | Slow down |
| `Q` / `Esc` | Quit |
| `Any key` | Continue to next round (during rest) |

## Fighter Configuration

Fighters are defined in YAML files with comprehensive attributes:

```yaml
identity:
  name: "Fighter Name"
  nickname: "The Nickname"

physical:
  height: 180  # cm
  weight: 80   # kg
  reach: 185   # cm
  stance: orthodox  # or southpaw

style:
  primary: boxer-puncher  # out-boxer, swarmer, slugger, etc.
  defensive: high-guard   # peek-a-boo, philly-shell, distance
  offensive: combo-puncher

power:
  powerLeft: 75
  powerRight: 85
  knockoutPower: 80

speed:
  handSpeed: 80
  footSpeed: 75
  reflexes: 78
  firstStep: 82

# ... plus stamina, defense, offense, technical, mental attributes
```

See `docs/FIGHTER_ATTRIBUTES.md` for complete attribute documentation.

## Style Matchups

The simulation models realistic style interactions:

| Matchup | Advantage |
|---------|-----------|
| Out-Boxer vs Slugger | Out-boxer (speed/movement frustrate power) |
| Slugger vs Swarmer | Slugger (power punishes aggression) |
| Swarmer vs Out-Boxer | Swarmer (pressure negates distance) |
| Counter-Puncher vs Slugger | Counter-puncher (timing beats loading up) |
| Inside-Fighter vs Swarmer | Inside-fighter (explosive short punches) |
| Boxer-Puncher | Wild card (adaptable to any matchup) |

## Historical Fighter Balance

Tested matchup results (100 fight samples):

| Matchup | Result | Notes |
|---------|--------|-------|
| Tyson vs Lewis | ~50-50 | Explosive power vs reach/jab |
| Lewis vs Holyfield | ~55-45 Lewis | Distance control vs pressure |
| Tyson vs Holyfield | ~45-55 Holyfield | Conditioning vs early KO power |

## Project Structure

```
fight/
├── src/
│   ├── engine/          # Core simulation (AI, combat, stamina, damage)
│   ├── display/         # TUI rendering and commentary
│   ├── models/          # Fighter, Fight, Round models
│   └── utils/           # Config loading utilities
├── fighters/
│   ├── templates/       # Style templates and historical fighters
│   └── custom/          # User-created fighters
├── docs/                # Comprehensive documentation
└── config/              # Default settings
```

## Documentation

- `docs/FIGHTER_ATTRIBUTES.md` - Complete attribute system
- `docs/FIGHTER_STYLES.md` - Style archetypes and behaviors
- `docs/COMBAT_MECHANICS.md` - Punch types, accuracy, damage calculations
- `docs/STAMINA_SYSTEM.md` - Energy management
- `docs/DAMAGE_MODEL.md` - Damage accumulation and knockdowns
- `docs/PROJECT_STATUS.md` - Implementation status and recent changes

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Config Format**: YAML (primary), JSON (supported)
- **TUI Framework**: Blessed + blessed-contrib
- **Dependencies**: Minimal (yaml, blessed)

## License

MIT
