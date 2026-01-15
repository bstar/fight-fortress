# Roster Skill

List all available fighters with their key attributes and ratings.

## Usage

```
/roster [filter]
```

Optional filter: `historical`, `custom`, or a style like `slugger`

## Instructions

1. **Scan Fighter Directories**:
   - `fighters/templates/historical/` - Historical boxing legends
   - `fighters/custom/` - User-created fighters

2. **Load Each Fighter YAML** and extract key info.

3. **Display Roster Table**:

   ```
   ==================== FIGHTER ROSTER ====================

   HISTORICAL FIGHTERS
   ───────────────────────────────────────────────────────
   Name              Style           Record      PWR  SPD  CHN  Overall
   ───────────────────────────────────────────────────────
   Mike Tyson        Inside-Fighter  37-0-0      98   95   90   94
   Lennox Lewis      Out-Boxer       41-2-1      88   82   88   86
   Evander Holyfield Swarmer         44-10-2     82   78   95   85
   Primo Carnera     Slugger         88-14-0     90   65   75   77
   Corrie Sanders    Slugger         42-4-0      92   80   72   81

   CUSTOM FIGHTERS
   ───────────────────────────────────────────────────────
   Roberto Martinez  Out-Boxer       30-2-0      70   88   75   78
   James Johnson     Slugger         28-3-0      88   72   80   80

   Legend: PWR=Power, SPD=Hand Speed, CHN=Chin
   Overall = Average of key attributes
   ```

4. **Calculate Overall Rating**:
   ```javascript
   overall = Math.round((
     power.powerRight +
     speed.handSpeed +
     defense.headMovement +
     mental.chin
   ) / 4);
   ```

5. **Fighter Details**: If user asks about a specific fighter, show full profile:
   - All physical attributes
   - Full style breakdown
   - Complete attribute list with values
   - Corner team info
   - Notable strengths/weaknesses

## Style Categories

- **Power Fighters**: slugger, inside-fighter
- **Speed Fighters**: out-boxer, swarmer
- **Balanced**: boxer-puncher, counter-puncher
- **Technical**: volume-puncher, switch-hitter

## File Format Reference

Fighter YAML structure:
```yaml
identity:
  name: "Fighter Name"
  nickname: "The Nickname"
physical:
  height: 180  # cm
  weight: 90   # kg
  reach: 185   # cm
style:
  primary: "out-boxer"
power:
  powerRight: 85
  knockoutPower: 80
speed:
  handSpeed: 82
mental:
  chin: 88
record:
  wins: 30
  losses: 2
  draws: 0
  kos: 20
```
