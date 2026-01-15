# Balance Testing Skill

Run batch fight simulations to test fighter balance and gather statistics.

## Usage

```
/balance [fighterA] [fighterB] [count]
```

Arguments are optional - if not provided, prompt the user to select.

## Instructions

1. **Identify Fighters**: If fighters aren't specified, list available fighters from `fighters/` directory and ask which two to test.

2. **Run Batch Simulation**: Execute batch fights using:
   ```bash
   node src/index.js batch <fighterA.yaml> <fighterB.yaml> --count <N> --rounds 12
   ```
   Default count is 100 fights if not specified.

3. **Analyze Results**: After the batch completes, summarize:
   - Win/Loss record (e.g., "Tyson: 45 wins, Lewis: 52 wins, 3 draws")
   - Win percentage for each fighter
   - KO/TKO rate vs Decision rate
   - Average knockdowns per fight
   - Average fight length (rounds)
   - Any concerning imbalances (>65% win rate suggests tuning needed)

4. **Balance Assessment**: Provide analysis:
   - Is the matchup reasonably balanced (40-60% range)?
   - Does the KO rate match fighter styles? (sluggers should have more KOs)
   - Are decisions too frequent or too rare?
   - Suggest attribute adjustments if severely imbalanced

## Fighter Locations

- Historical fighters: `fighters/templates/historical/`
- Custom fighters: `fighters/custom/`

## Example Output Format

```
BALANCE TEST: Tyson vs Lewis (100 fights)
==========================================
Record: Tyson 45-52-3 Lewis
Win Rate: Tyson 45%, Lewis 52%

Stoppage Breakdown:
  Tyson KO/TKO: 28 (62% of wins)
  Lewis KO/TKO: 19 (37% of wins)

Decision Rate: 47%
Avg Knockdowns: 1.8 per fight
Avg Fight Length: 8.2 rounds

Assessment: BALANCED - Within expected range for this style matchup.
Tyson's explosive power vs Lewis's reach creates good variance.
```

## Balance Targets (Historical Matchups)

Reference targets based on boxing analysis:
- Tyson vs Lewis: ~45-55 (Lewis slight edge due to reach/jab)
- Lewis vs Holyfield: ~55-45 (Lewis favored, size advantage)
- Tyson vs Holyfield: ~45-55 (Holyfield's chin and conditioning)
