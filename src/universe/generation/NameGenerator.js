/**
 * Name Generator
 * Generates realistic fighter names based on nationality/region
 */

// Name pools by region
const NAME_POOLS = {
  usa: {
    first: [
      // African American
      'Marcus', 'Darnell', 'Tyrone', 'Jamal', 'DeShawn', 'Terrell', 'Andre', 'Lamont',
      'Rashad', 'Demetrius', 'Jermaine', 'Deontay', 'Terence', 'Errol', 'Shawn', 'Keith',
      // Hispanic
      'Miguel', 'Carlos', 'Antonio', 'Luis', 'Jose', 'Juan', 'Ricardo', 'Fernando',
      'Oscar', 'Rafael', 'Sergio', 'Hector', 'Roberto', 'Gabriel', 'Danny', 'Jesse',
      // General American
      'Michael', 'James', 'Robert', 'David', 'William', 'Richard', 'Thomas', 'Chris',
      'Brian', 'Kevin', 'Jason', 'Ryan', 'Brandon', 'Tyler', 'Jake', 'Tommy'
    ],
    last: [
      // African American
      'Williams', 'Johnson', 'Brown', 'Jones', 'Davis', 'Jackson', 'Thomas', 'Harris',
      'Robinson', 'Lewis', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Carter',
      // Hispanic
      'Garcia', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez',
      'Ramirez', 'Torres', 'Rivera', 'Flores', 'Cruz', 'Morales', 'Ortiz', 'Vargas',
      // General
      'Smith', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'White', 'Martin'
    ]
  },

  uk: {
    first: [
      'Anthony', 'Tyson', 'David', 'Lennox', 'Frank', 'Joe', 'Tommy', 'Billy',
      'Carl', 'Ricky', 'Amir', 'Kell', 'Chris', 'Derek', 'Nigel', 'Lloyd',
      'James', 'Daniel', 'John', 'George', 'Charlie', 'Jack', 'Harry', 'Callum'
    ],
    last: [
      'Joshua', 'Fury', 'Haye', 'Lewis', 'Bruno', 'Calzaghe', 'Khan', 'Brook',
      'Eubank', 'Benn', 'Watson', 'Smith', 'Williams', 'Jones', 'Davies', 'Evans',
      'Taylor', 'Brown', 'Wilson', 'Thomas', 'Roberts', 'Hughes', 'Edwards', 'Collins'
    ]
  },

  mexico: {
    first: [
      'Canelo', 'Julio', 'Oscar', 'Juan', 'Marco', 'Erik', 'Miguel', 'Carlos',
      'Jorge', 'Fernando', 'Roberto', 'Salvador', 'Ricardo', 'Gilberto', 'Jesus', 'David',
      'Luis', 'Alejandro', 'Jose', 'Rafael', 'Eduardo', 'Francisco', 'Alberto', 'Daniel'
    ],
    last: [
      'Alvarez', 'Chavez', 'De La Hoya', 'Marquez', 'Barrera', 'Morales', 'Sanchez', 'Vazquez',
      'Garcia', 'Gonzalez', 'Martinez', 'Hernandez', 'Lopez', 'Rodriguez', 'Ramirez', 'Torres',
      'Soto', 'Flores', 'Mendoza', 'Castillo', 'Ortega', 'Rios', 'Vargas', 'Ruiz'
    ]
  },

  easternEurope: {
    first: [
      'Vitali', 'Wladimir', 'Oleksandr', 'Vasyl', 'Sergey', 'Gennady', 'Alexander', 'Dmitry',
      'Artur', 'Viktor', 'Ivan', 'Maxim', 'Andrei', 'Nikolai', 'Roman', 'Boris',
      'Oleg', 'Ruslan', 'Denis', 'Pavel', 'Aleksei', 'Igor', 'Evgeny', 'Yuri'
    ],
    last: [
      'Klitschko', 'Usyk', 'Lomachenko', 'Kovalev', 'Golovkin', 'Povetkin', 'Bivol', 'Beterbiev',
      'Spilka', 'Derevyanchenko', 'Khytrov', 'Redkach', 'Postol', 'Bursak', 'Kudryashov', 'Shishkin',
      'Petrov', 'Volkov', 'Sorokin', 'Morozov', 'Kozlov', 'Orlov', 'Popov', 'Smirnov'
    ]
  },

  philippines: {
    first: [
      'Manny', 'Nonito', 'John Riel', 'Jerwin', 'Johnriel', 'Mark', 'Marlon', 'Jonas',
      'Arthur', 'Gabriel', 'Rolando', 'Gerry', 'Brian', 'Michael', 'Rey', 'Romeo',
      'Ricardo', 'Roberto', 'Ramon', 'Ricky', 'Randy', 'Ronald', 'Ronaldo', 'Roel'
    ],
    last: [
      'Pacquiao', 'Donaire', 'Casimero', 'Ancajas', 'Villanueva', 'Plania', 'Tapales', 'Sultan',
      'dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Bautista', 'Gonzales', 'Aquino', 'Ramos',
      'Torres', 'Cruz', 'Fernandez', 'Lopez', 'Diaz', 'Mendoza', 'Castillo', 'Santiago'
    ]
  },

  japan: {
    first: [
      'Naoya', 'Kazuto', 'Ryota', 'Takuma', 'Kosei', 'Shinsuke', 'Yuki', 'Takeshi',
      'Kenshiro', 'Akira', 'Hiroto', 'Daiki', 'Ryo', 'Ken', 'Masahiro', 'Kenji',
      'Tatsuya', 'Yuya', 'Sota', 'Haruki', 'Kenta', 'Shota', 'Taku', 'Yuto'
    ],
    last: [
      'Inoue', 'Ioka', 'Murata', 'Tanaka', 'Teraji', 'Yamanaka', 'Taguchi', 'Nishioka',
      'Hasegawa', 'Kameda', 'Sato', 'Suzuki', 'Takahashi', 'Watanabe', 'Yamamoto', 'Nakamura',
      'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Shimizu', 'Hayashi', 'Mori'
    ]
  },

  cuba: {
    first: [
      'Teofilo', 'Felix', 'Guillermo', 'Joel', 'Yuriorkis', 'Erislandy', 'Luis', 'Yordenis',
      'David', 'Yuniel', 'Robeisy', 'Lazaro', 'Ramon', 'Andy', 'Ismael', 'Jorge',
      'Carlos', 'Orlando', 'Roberto', 'Hector', 'Pedro', 'Miguel', 'Eduardo', 'Frank'
    ],
    last: [
      'Stevenson', 'Savon', 'Rigondeaux', 'Casamayor', 'Gamboa', 'Lara', 'Ortiz', 'Ugas',
      'Alvarez', 'Hernandez', 'Garcia', 'Rodriguez', 'Lopez', 'Martinez', 'Perez', 'Gonzalez',
      'Fernandez', 'Torres', 'Diaz', 'Ramirez', 'Morales', 'Cruz', 'Santos', 'Vargas'
    ]
  },

  puertoRico: {
    first: [
      'Felix', 'Miguel', 'Hector', 'Wilfredo', 'Ivan', 'Juan', 'Carlos', 'Orlando',
      'Jose', 'Angel', 'Alberto', 'Edwin', 'Jonathan', 'Edgar', 'Abner', 'Danny',
      'Luis', 'Ramon', 'Roberto', 'Jesus', 'Pedro', 'David', 'Michael', 'Gabriel'
    ],
    last: [
      'Trinidad', 'Cotto', 'Camacho', 'Gomez', 'Calderon', 'Santos', 'Gonzalez', 'Cruz',
      'Lebron', 'Rodriguez', 'Rosario', 'Mares', 'Lopez', 'Martinez', 'Rivera', 'Ortiz',
      'Velazquez', 'Maldonado', 'Colon', 'Vargas', 'Mercado', 'Rojas', 'Soto', 'Torres'
    ]
  },

  africa: {
    first: [
      'Samuel', 'Francis', 'Joseph', 'Isaac', 'Daniel', 'Emmanuel', 'David', 'Richard',
      'Joshua', 'Lawrence', 'Martin', 'Chris', 'Peter', 'Paul', 'Anthony', 'Azumah',
      'Ike', 'Corrie', 'Gerrie', 'Johnny', 'Welcome', 'Lucky', 'Thabiso', 'Thulani'
    ],
    last: [
      'Peter', 'Ngouo', 'Ochieng', 'Kimani', 'Mensah', 'Asante', 'Diallo', 'Camara',
      'Nelson', 'Quartey', 'Clottey', 'Tagoe', 'Commey', 'Dogboe', 'Coetzee', 'Schultz',
      'Tshabalala', 'Ndou', 'Makhathini', 'Ncube', 'Dlamini', 'Mthembu', 'Zulu', 'Buthelezi'
    ]
  },

  argentina: {
    first: [
      'Carlos', 'Marcos', 'Sergio', 'Lucas', 'Brian', 'Sebastian', 'Matias', 'Fernando',
      'Jorge', 'Diego', 'Martin', 'Gustavo', 'Oscar', 'Nicolas', 'Emanuel', 'Fabian',
      'Pablo', 'Maximiliano', 'Alejandro', 'Federico', 'Leandro', 'Damian', 'Adrian', 'Ezequiel'
    ],
    last: [
      'Monzon', 'Galindez', 'Martinez', 'Maidana', 'Castano', 'Matthysse', 'Lopez', 'Garcia',
      'Rodriguez', 'Fernandez', 'Gonzalez', 'Perez', 'Romero', 'Diaz', 'Torres', 'Sanchez',
      'Alvarez', 'Ruiz', 'Ramirez', 'Gomez', 'Hernandez', 'Flores', 'Acosta', 'Medina'
    ]
  }
};

// Region weights for random nationality selection
const REGION_WEIGHTS = {
  usa: 30,
  mexico: 15,
  uk: 12,
  puertoRico: 8,
  philippines: 7,
  japan: 6,
  cuba: 5,
  easternEurope: 7,
  africa: 5,
  argentina: 5
};

// Nationality display names
const REGION_NATIONALITIES = {
  usa: 'United States',
  uk: 'United Kingdom',
  mexico: 'Mexico',
  easternEurope: ['Ukraine', 'Russia', 'Kazakhstan', 'Poland', 'Belarus'],
  philippines: 'Philippines',
  japan: 'Japan',
  cuba: 'Cuba',
  puertoRico: 'Puerto Rico',
  africa: ['Nigeria', 'Ghana', 'South Africa', 'Cameroon', 'Kenya'],
  argentina: 'Argentina'
};

export class NameGenerator {
  constructor() {
    this.usedNames = new Set();
  }

  /**
   * Generate a unique fighter name
   * @param {string} region - Optional specific region
   * @returns {Object} { firstName, lastName, fullName, nationality }
   */
  generate(region = null) {
    // Select region if not specified
    const selectedRegion = region || this.selectRandomRegion();
    const pool = NAME_POOLS[selectedRegion];

    if (!pool) {
      console.warn(`Unknown region: ${selectedRegion}, defaulting to USA`);
      return this.generate('usa');
    }

    let attempts = 0;
    let firstName, lastName, fullName;

    // Try to generate unique name
    do {
      firstName = this.randomElement(pool.first);
      lastName = this.randomElement(pool.last);
      fullName = `${firstName} ${lastName}`;
      attempts++;
    } while (this.usedNames.has(fullName) && attempts < 100);

    // If still not unique after 100 tries, add a suffix
    if (this.usedNames.has(fullName)) {
      const suffix = ['Jr.', 'II', 'III'][Math.floor(Math.random() * 3)];
      fullName = `${fullName} ${suffix}`;
    }

    this.usedNames.add(fullName);

    return {
      firstName,
      lastName,
      fullName,
      nationality: this.getNationality(selectedRegion),
      region: selectedRegion
    };
  }

  /**
   * Select a random region based on weights
   */
  selectRandomRegion() {
    const totalWeight = Object.values(REGION_WEIGHTS).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (const [region, weight] of Object.entries(REGION_WEIGHTS)) {
      random -= weight;
      if (random <= 0) {
        return region;
      }
    }

    return 'usa'; // Fallback
  }

  /**
   * Get nationality string for a region
   */
  getNationality(region) {
    const nationality = REGION_NATIONALITIES[region];
    if (Array.isArray(nationality)) {
      return this.randomElement(nationality);
    }
    return nationality;
  }

  /**
   * Generate a hometown based on nationality
   */
  generateHometown(nationality) {
    const hometowns = {
      'United States': ['Brooklyn, NY', 'Philadelphia, PA', 'Detroit, MI', 'Los Angeles, CA',
                        'Las Vegas, NV', 'Houston, TX', 'Chicago, IL', 'Miami, FL',
                        'Baltimore, MD', 'Cleveland, OH', 'St. Louis, MO', 'Oakland, CA'],
      'United Kingdom': ['London', 'Manchester', 'Liverpool', 'Birmingham', 'Sheffield',
                         'Cardiff', 'Glasgow', 'Belfast', 'Leeds', 'Newcastle'],
      'Mexico': ['Mexico City', 'Guadalajara', 'Tijuana', 'Monterrey', 'Culiacan',
                 'Los Mochis', 'Mexicali', 'Ciudad Juarez', 'Cancun', 'Merida'],
      'Ukraine': ['Kyiv', 'Kharkiv', 'Odessa', 'Lviv', 'Dnipro', 'Simferopol'],
      'Russia': ['Moscow', 'St. Petersburg', 'Chelyabinsk', 'Yekaterinburg', 'Grozny'],
      'Kazakhstan': ['Karaganda', 'Almaty', 'Nur-Sultan', 'Shymkent'],
      'Poland': ['Warsaw', 'Krakow', 'Lodz', 'Wroclaw', 'Gdansk'],
      'Philippines': ['Manila', 'General Santos City', 'Cebu City', 'Davao City'],
      'Japan': ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Kobe'],
      'Cuba': ['Havana', 'Santiago de Cuba', 'Guantanamo', 'Camaguey'],
      'Puerto Rico': ['San Juan', 'Ponce', 'Bayamon', 'Caguas'],
      'Nigeria': ['Lagos', 'Ibadan', 'Kano', 'Port Harcourt'],
      'Ghana': ['Accra', 'Kumasi', 'Tamale'],
      'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
      'Argentina': ['Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza']
    };

    const cities = hometowns[nationality] || ['Unknown'];
    return this.randomElement(cities);
  }

  /**
   * Get a random element from an array
   */
  randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Clear used names (for new universe)
   */
  reset() {
    this.usedNames.clear();
  }
}

export default NameGenerator;
