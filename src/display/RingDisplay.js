/**
 * Ring Display
 * ASCII visualization of the boxing ring and fighter positions
 */

export class RingDisplay {
  constructor(options = {}) {
    this.options = {
      width: options.width || 60,
      height: options.height || 30,
      showDistance: options.showDistance !== false,
      showStates: options.showStates !== false,
      showStamina: options.showStamina !== false,
      showHealth: options.showHealth !== false
    };

    // Ring dimensions in simulation units
    this.ringSize = 20; // 20 feet square
    this.fighterNames = { A: 'Fighter A', B: 'Fighter B' };
  }

  /**
   * Initialize with fighter names
   */
  initialize(fighterA, fighterB) {
    this.fighterNames = {
      A: fighterA.getShortName ? fighterA.getShortName() : fighterA.name.split(' ').pop(),
      B: fighterB.getShortName ? fighterB.getShortName() : fighterB.name.split(' ').pop()
    };
  }

  /**
   * Render the ring with current positions
   */
  render(positionData, fighterStates = {}) {
    const { width, height } = this.options;
    const lines = [];

    // Get positions (default to center if not provided)
    const posA = positionData?.A || { x: 8, y: 10 };
    const posB = positionData?.B || { x: 12, y: 10 };
    const distance = positionData?.distance || this.calculateDistance(posA, posB);

    // Calculate fighter positions on the display grid
    const gridA = this.toGridPosition(posA, width, height);
    const gridB = this.toGridPosition(posB, width, height);

    // Create the ring display
    lines.push(this.createTopBorder(width));
    lines.push(this.createCornerLabel(width, 'RED CORNER', 'BLUE CORNER'));

    // Create ring interior
    const ringTop = 3;
    const ringBottom = height - 3;
    const ringLeft = 3;
    const ringRight = width - 4;

    for (let y = 0; y < height - 4; y++) {
      let line = '';

      // Left rope
      if (y === 0 || y === height - 5) {
        line = this.createRopeHorizontal(width - 2);
      } else if (y % 3 === 0 && y > 0 && y < height - 5) {
        line = this.createRopeHorizontal(width - 2, true);
      } else {
        line = this.createRingRow(y, gridA, gridB, width, height, fighterStates);
      }

      lines.push(' ' + line);
    }

    lines.push(this.createBottomBorder(width));

    // Add fighter info panel
    lines.push('');
    lines.push(this.createFighterPanel(fighterStates, distance));

    return lines.join('\n');
  }

  /**
   * Convert simulation position to grid position
   */
  toGridPosition(pos, gridWidth, gridHeight) {
    // Ring is 20x20 feet, map to display grid (minus borders)
    const innerWidth = gridWidth - 8;
    const innerHeight = gridHeight - 8;

    return {
      x: Math.round((pos.x / this.ringSize) * innerWidth) + 4,
      y: Math.round((pos.y / this.ringSize) * innerHeight) + 2
    };
  }

  /**
   * Calculate distance between fighters
   */
  calculateDistance(posA, posB) {
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Create top border
   */
  createTopBorder(width) {
    return '  ' + '+' + '='.repeat(width - 4) + '+';
  }

  /**
   * Create bottom border
   */
  createBottomBorder(width) {
    return '  ' + '+' + '='.repeat(width - 4) + '+';
  }

  /**
   * Create corner labels
   */
  createCornerLabel(width, leftLabel, rightLabel) {
    const innerWidth = width - 6;
    const padding = innerWidth - leftLabel.length - rightLabel.length;
    return '  |' + leftLabel + ' '.repeat(Math.max(1, padding)) + rightLabel + '|';
  }

  /**
   * Create horizontal rope line
   */
  createRopeHorizontal(width, isMiddle = false) {
    if (isMiddle) {
      return '|' + '-'.repeat(width) + '|';
    }
    return '|' + '='.repeat(width) + '|';
  }

  /**
   * Create a row of the ring interior
   */
  createRingRow(rowIndex, gridA, gridB, width, height, fighterStates) {
    const innerWidth = width - 4;
    let row = '|';

    for (let x = 0; x < innerWidth; x++) {
      const gridX = x + 2;
      const gridY = rowIndex;

      // Check if fighter A is at this position
      if (Math.abs(gridA.x - gridX) <= 1 && Math.abs(gridA.y - gridY) <= 0) {
        if (gridA.x - gridX === -1) {
          row += '[';
        } else if (gridA.x - gridX === 0) {
          row += this.getFighterChar('A', fighterStates.A);
        } else {
          row += ']';
        }
      }
      // Check if fighter B is at this position
      else if (Math.abs(gridB.x - gridX) <= 1 && Math.abs(gridB.y - gridY) <= 0) {
        if (gridB.x - gridX === -1) {
          row += '{';
        } else if (gridB.x - gridX === 0) {
          row += this.getFighterChar('B', fighterStates.B);
        } else {
          row += '}';
        }
      }
      // Ring corner posts
      else if (this.isCornerPost(x, rowIndex, innerWidth, height - 6)) {
        row += 'O';
      }
      // Empty space
      else {
        row += ' ';
      }
    }

    row += '|';
    return row;
  }

  /**
   * Check if position is a corner post
   */
  isCornerPost(x, y, width, height) {
    const corners = [
      { x: 1, y: 1 },
      { x: width - 2, y: 1 },
      { x: 1, y: height - 1 },
      { x: width - 2, y: height - 1 }
    ];

    return corners.some(c => c.x === x && c.y === y);
  }

  /**
   * Get fighter display character based on state
   */
  getFighterChar(fighter, state) {
    if (!state) return fighter;

    const stateChars = {
      'KNOCKED_DOWN': 'X',
      'HURT': '!',
      'CLINCH': 'C',
      'OFFENSIVE': '*',
      'DEFENSIVE': 'D',
      'TIMING': 'T',
      'MOVING': '>',
      'NEUTRAL': fighter
    };

    return stateChars[state?.state] || fighter;
  }

  /**
   * Create fighter info panel
   */
  createFighterPanel(fighterStates, distance) {
    const lines = [];
    const stateA = fighterStates.A || {};
    const stateB = fighterStates.B || {};

    // Distance line
    const distStr = `Distance: ${distance.toFixed(1)} ft`;
    lines.push(this.centerText(distStr, this.options.width));

    // Fighter state line
    const stateAStr = `[A] ${this.fighterNames.A}: ${stateA.state || 'NEUTRAL'}${stateA.subState ? '/' + stateA.subState : ''}`;
    const stateBStr = `${stateB.state || 'NEUTRAL'}${stateB.subState ? '/' + stateB.subState : ''}: ${this.fighterNames.B} [B]`;

    lines.push(this.createTwoColumn(stateAStr, stateBStr, this.options.width));

    // Stamina bars
    if (this.options.showStamina) {
      const staminaA = this.createBar(stateA.stamina || 100, 100, 15, 'STA');
      const staminaB = this.createBar(stateB.stamina || 100, 100, 15, 'STA');
      lines.push(this.createTwoColumn(staminaA, staminaB, this.options.width));
    }

    // Health bars
    if (this.options.showHealth) {
      const healthA = this.createBar(100 - (stateA.damage || 0), 100, 15, 'HP');
      const healthB = this.createBar(100 - (stateB.damage || 0), 100, 15, 'HP');
      lines.push(this.createTwoColumn(healthA, healthB, this.options.width));
    }

    return lines.join('\n');
  }

  /**
   * Create a progress bar
   */
  createBar(value, max, width, label) {
    // Clamp values to valid range
    const clampedValue = Math.max(0, Math.min(value, max));
    const filled = Math.round((clampedValue / max) * width);
    const empty = Math.max(0, width - filled);
    const percent = Math.round((clampedValue / max) * 100);

    let bar = '';
    if (percent > 60) {
      bar = '#'.repeat(filled) + '-'.repeat(empty);
    } else if (percent > 30) {
      bar = '='.repeat(filled) + '-'.repeat(empty);
    } else {
      bar = '.'.repeat(filled) + '-'.repeat(empty);
    }

    return `${label}: [${bar}] ${percent}%`;
  }

  /**
   * Center text
   */
  centerText(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Create two column layout
   */
  createTwoColumn(left, right, width) {
    const padding = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(padding) + right;
  }

  /**
   * Render compact version (single line position indicator)
   */
  renderCompact(positionData, fighterStates = {}) {
    const width = 40;
    const posA = positionData?.A || { x: 8, y: 10 };
    const posB = positionData?.B || { x: 12, y: 10 };
    const distance = positionData?.distance || this.calculateDistance(posA, posB);

    // Map x positions to display width
    const displayA = Math.round((posA.x / this.ringSize) * (width - 6)) + 2;
    const displayB = Math.round((posB.x / this.ringSize) * (width - 6)) + 2;

    let line = '|';
    for (let i = 0; i < width - 2; i++) {
      if (i === displayA) {
        line += 'A';
      } else if (i === displayB) {
        line += 'B';
      } else if (i === 0 || i === width - 3) {
        line += '|';
      } else {
        line += '-';
      }
    }
    line += '|';

    const stateA = fighterStates.A?.state || 'NEUTRAL';
    const stateB = fighterStates.B?.state || 'NEUTRAL';

    return `${line}  [${stateA.substring(0, 3)}] ${distance.toFixed(1)}ft [${stateB.substring(0, 3)}]`;
  }

  /**
   * Get legend for display characters
   */
  getLegend() {
    return `
Legend:
  [A] / {B} - Fighter position
  * - Offensive    D - Defensive    T - Timing
  > - Moving       C - Clinch       ! - Hurt
  X - Knocked down O - Corner post
`;
  }
}

export default RingDisplay;
