# Matchup Analysis Skill

Compare two fighters side-by-side with detailed attribute comparison and style analysis.

## Usage

```
/matchup [fighterA] [fighterB]
```

## Instructions

1. **Load Fighter Data**: Read both fighter YAML files from `fighters/` directory.

2. **Display Side-by-Side Comparison**:

   ```
   ================== MATCHUP ANALYSIS ==================

   MIKE TYSON              vs              LENNOX LEWIS
   "Iron Mike"                             "The Lion"
   37-0 (33 KOs)                           41-2 (32 KOs)

   PHYSICAL
   Height:     5'10" (178cm)               6'5" (196cm)
   Weight:     218 lbs (99kg)              250 lbs (113kg)
   Reach:      180cm                       213cm
   Stance:     Orthodox                    Orthodox

   STYLE
   Primary:    Inside-Fighter              Out-Boxer
   Defensive:  Peek-a-boo                  Distance
   Offensive:  Combo-puncher               Jab-and-move

   KEY ATTRIBUTES (scale 1-100)
                    TYSON    LEWIS    EDGE
   Power (R):         98       88      +10 Tyson
   Hand Speed:        95       82      +13 Tyson
   Knockout Power:    99       85      +14 Tyson
   Head Movement:     95       75      +20 Tyson
   Reach Advantage:   --       +33cm   Lewis
   Footwork:          88       85      +3 Tyson
   Jab Accuracy:      88       90      +2 Lewis
   Chin:              90       88      +2 Tyson
   Cardio:            88       90      +2 Lewis
   ```

3. **Style Matchup Analysis**: Explain how the styles interact:
   - Inside-fighter vs Out-boxer dynamics
   - Reach differential impact
   - Power vs conditioning tradeoffs
   - Who controls distance?
   - Key to victory for each fighter

4. **Prediction Factors**:
   - Early rounds favor: [fighter] because...
   - Late rounds favor: [fighter] because...
   - KO likelihood for each
   - Likely winning strategy

5. **Optional Quick Batch**: Ask if user wants a quick 20-fight sample to validate the analysis.

## Fighter File Locations

- `fighters/templates/historical/tyson-mike.yaml`
- `fighters/templates/historical/lewis-lennox.yaml`
- `fighters/templates/historical/holyfield-evander.yaml`
- `fighters/custom/martinez-roberto.yaml`
- `fighters/custom/johnson-james.yaml`

## Key Attributes to Compare

From fighter YAML files:
- `physical.height`, `physical.weight`, `physical.reach`
- `style.primary`, `style.defensive`, `style.offensive`
- `power.powerRight`, `power.knockoutPower`
- `speed.handSpeed`, `speed.reflexes`
- `defense.headMovement`, `defense.blocking`
- `stamina.cardio`, `stamina.recoveryRate`
- `mental.chin`, `mental.heart`, `mental.killerInstinct`
- `record.wins`, `record.losses`, `record.kos`
