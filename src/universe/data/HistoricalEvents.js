/**
 * Historical Events Database
 * Real-world events organized by month/week for universe immersion
 * Events span 1920-2030 to cover all boxing eras
 * ~750+ events for comprehensive coverage
 */

// Events are keyed by "YYYY-WW" (year and week number)
// Multiple events per week are supported
const HISTORICAL_EVENTS = {
  // ============================================
  // 1920s - THE ROARING TWENTIES
  // ============================================

  // 1920
  '1920-02': [
    { headline: 'Prohibition begins as 18th Amendment takes effect', category: 'politics' },
  ],
  '1920-04': [
    { headline: 'League of Nations holds first meeting in Paris', category: 'world' },
  ],
  '1920-11': [
    { headline: 'Red Sox sell Babe Ruth to Yankees', category: 'sports' },
  ],
  '1920-33': [
    { headline: '19th Amendment ratified - women can vote', category: 'politics' },
  ],
  '1920-37': [
    { headline: 'Wall Street bombing kills 38 in New York', category: 'disaster' },
  ],
  '1920-40': [
    { headline: 'First commercial radio broadcast in Pittsburgh', category: 'technology' },
  ],
  '1920-45': [
    { headline: 'Warren Harding elected President', category: 'politics' },
  ],

  // 1921
  '1921-10': [
    { headline: 'Tulsa Race Massacre destroys Black Wall Street', category: 'society' },
  ],
  '1921-15': [
    { headline: 'First Miss America pageant held in Atlantic City', category: 'culture' },
  ],
  '1921-28': [
    { headline: 'Jack Dempsey knocks out Georges Carpentier', category: 'sports' },
  ],
  '1921-36': [
    { headline: 'Albert Einstein wins Nobel Prize in Physics', category: 'science' },
  ],
  '1921-46': [
    { headline: 'Insulin discovered at University of Toronto', category: 'science' },
  ],

  // 1922
  '1922-05': [
    { headline: 'Washington Naval Treaty limits battleship construction', category: 'world' },
  ],
  '1922-12': [
    { headline: 'USSR officially established', category: 'world' },
  ],
  '1922-31': [
    { headline: 'Lincoln Memorial dedicated in Washington DC', category: 'culture' },
  ],
  '1922-44': [
    { headline: 'Howard Carter discovers King Tut\'s tomb', category: 'science' },
  ],
  '1922-47': [
    { headline: 'BBC begins radio broadcasts in Britain', category: 'technology' },
  ],

  // 1923
  '1923-02': [
    { headline: 'Yankee Stadium opens - "The House That Ruth Built"', category: 'sports' },
  ],
  '1923-15': [
    { headline: 'Jack Dempsey loses "Long Count" fight controversy', category: 'sports' },
  ],
  '1923-31': [
    { headline: 'President Harding dies suddenly; Coolidge sworn in', category: 'politics' },
  ],
  '1923-36': [
    { headline: 'Great Kanto Earthquake devastates Tokyo', category: 'disaster' },
  ],
  '1923-45': [
    { headline: 'Hitler\'s Beer Hall Putsch fails in Munich', category: 'world' },
  ],

  // 1924
  '1924-04': [
    { headline: 'Vladimir Lenin dies; Stalin rises to power', category: 'world' },
  ],
  '1924-16': [
    { headline: 'J. Edgar Hoover appointed head of FBI', category: 'politics' },
  ],
  '1924-22': [
    { headline: 'Leopold and Loeb trial captivates nation', category: 'crime' },
  ],
  '1924-27': [
    { headline: 'Paris Olympics: first "Chariots of Fire" games', category: 'sports' },
  ],
  '1924-45': [
    { headline: 'Calvin Coolidge wins presidential election', category: 'politics' },
  ],

  // 1925
  '1925-01': [
    { headline: 'Nellie Tayloe Ross becomes first female US governor', category: 'politics' },
  ],
  '1925-07': [
    { headline: 'The Great Gatsby published by F. Scott Fitzgerald', category: 'culture' },
  ],
  '1925-11': [
    { headline: 'The New Yorker magazine publishes first issue', category: 'culture' },
  ],
  '1925-19': [
    { headline: 'Chrysler Corporation founded', category: 'economy' },
  ],
  '1925-28': [
    { headline: 'Scopes "Monkey Trial" concludes in Tennessee', category: 'society' },
  ],
  '1925-35': [
    { headline: 'Hitler publishes first volume of Mein Kampf', category: 'world' },
  ],
  '1925-49': [
    { headline: 'Grand Ole Opry begins broadcasting from Nashville', category: 'culture' },
  ],

  // 1926
  '1926-10': [
    { headline: 'Gertrude Ederle becomes first woman to swim English Channel', category: 'sports' },
  ],
  '1926-12': [
    { headline: 'A.A. Milne publishes Winnie-the-Pooh', category: 'culture' },
  ],
  '1926-20': [
    { headline: 'NBC Radio Network begins broadcasting', category: 'technology' },
  ],
  '1926-37': [
    { headline: 'Gene Tunney defeats Jack Dempsey for heavyweight title', category: 'sports' },
  ],
  '1926-39': [
    { headline: 'Houdini performs final show before his death', category: 'culture' },
  ],
  '1926-48': [
    { headline: 'Agatha Christie mysteriously disappears for 11 days', category: 'culture' },
  ],

  // 1927
  '1927-01': [
    { headline: 'Harlem Globetrotters founded in Chicago', category: 'sports' },
  ],
  '1927-12': [
    { headline: 'First transatlantic telephone call: New York to London', category: 'technology' },
  ],
  '1927-21': [
    { headline: 'Charles Lindbergh completes first solo transatlantic flight', category: 'technology' },
  ],
  '1927-27': [
    { headline: 'Babe Ruth hits 60th home run, setting new record', category: 'sports' },
  ],
  '1927-34': [
    { headline: 'The Jazz Singer premieres - first "talkie" film', category: 'culture' },
  ],
  '1927-40': [
    { headline: 'Mount Rushmore construction begins', category: 'culture' },
  ],
  '1927-50': [
    { headline: 'Show Boat opens on Broadway, transforms musicals', category: 'culture' },
  ],

  // 1928
  '1928-06': [
    { headline: 'Alexander Fleming notices mold killing bacteria', category: 'science' },
  ],
  '1928-24': [
    { headline: 'Amelia Earhart becomes first woman to fly across Atlantic', category: 'technology' },
  ],
  '1928-32': [
    { headline: 'Amsterdam Olympics: women compete in track events', category: 'sports' },
  ],
  '1928-36': [
    { headline: 'Alexander Fleming discovers penicillin', category: 'science' },
  ],
  '1928-45': [
    { headline: 'Herbert Hoover elected President', category: 'politics' },
  ],
  '1928-47': [
    { headline: 'Mickey Mouse debuts in Steamboat Willie', category: 'culture' },
  ],

  // 1929
  '1929-07': [
    { headline: 'St. Valentine\'s Day Massacre shocks Chicago', category: 'crime' },
  ],
  '1929-13': [
    { headline: 'First Academy Awards ceremony held in Hollywood', category: 'culture' },
  ],
  '1929-19': [
    { headline: 'Popeye the Sailor first appears in comic strip', category: 'culture' },
  ],
  '1929-33': [
    { headline: 'Museum of Modern Art opens in New York', category: 'culture' },
  ],
  '1929-43': [
    { headline: 'BLACK TUESDAY: Stock market crashes, Depression begins', category: 'economy' },
  ],

  // ============================================
  // 1930s - THE GREAT DEPRESSION
  // ============================================

  // 1930
  '1930-10': [
    { headline: 'Planet Pluto discovered by Clyde Tombaugh', category: 'science' },
  ],
  '1930-15': [
    { headline: 'First frozen food sold by Clarence Birdseye', category: 'technology' },
  ],
  '1930-20': [
    { headline: 'Amy Johnson flies solo from England to Australia', category: 'technology' },
  ],
  '1930-24': [
    { headline: 'First FIFA World Cup begins in Uruguay', category: 'sports' },
  ],
  '1930-35': [
    { headline: 'Max Schmeling wins heavyweight title', category: 'sports' },
  ],

  // 1931
  '1931-10': [
    { headline: 'Empire State Building opens as world\'s tallest', category: 'technology' },
  ],
  '1931-18': [
    { headline: 'Al Capone indicted for income tax evasion', category: 'crime' },
  ],
  '1931-22': [
    { headline: 'Star-Spangled Banner becomes national anthem', category: 'politics' },
  ],
  '1931-36': [
    { headline: 'Japan invades Manchuria', category: 'world' },
  ],
  '1931-40': [
    { headline: 'Al Capone convicted of tax evasion', category: 'crime' },
  ],
  '1931-46': [
    { headline: 'Thomas Edison dies at age 84', category: 'science' },
  ],

  // 1932
  '1932-10': [
    { headline: 'Lindbergh baby kidnapped in "Crime of the Century"', category: 'crime' },
  ],
  '1932-18': [
    { headline: 'Jack Sharkey wins heavyweight title', category: 'sports' },
  ],
  '1932-26': [
    { headline: 'Bonus Army marchers driven from Washington', category: 'politics' },
  ],
  '1932-31': [
    { headline: 'Los Angeles hosts Summer Olympics', category: 'sports' },
  ],
  '1932-45': [
    { headline: 'Franklin D. Roosevelt elected President', category: 'politics' },
  ],

  // 1933
  '1933-05': [
    { headline: 'Adolf Hitler appointed Chancellor of Germany', category: 'world' },
  ],
  '1933-09': [
    { headline: 'FDR delivers first "Fireside Chat" radio address', category: 'politics' },
  ],
  '1933-14': [
    { headline: 'Prohibition ends as 21st Amendment ratified', category: 'society' },
  ],
  '1933-24': [
    { headline: 'Primo Carnera wins heavyweight championship', category: 'sports' },
  ],
  '1933-27': [
    { headline: 'First drive-in movie theater opens in New Jersey', category: 'culture' },
  ],
  '1933-49': [
    { headline: 'King Kong premieres in New York theaters', category: 'culture' },
  ],

  // 1934
  '1934-04': [
    { headline: 'Clyde Barrow and Bonnie Parker rob banks across South', category: 'crime' },
  ],
  '1934-17': [
    { headline: 'Dust Bowl storms devastate Great Plains', category: 'disaster' },
  ],
  '1934-20': [
    { headline: 'Bonnie and Clyde killed in Louisiana ambush', category: 'crime' },
  ],
  '1934-24': [
    { headline: 'Max Baer KOs Primo Carnera for title', category: 'sports' },
  ],
  '1934-30': [
    { headline: 'John Dillinger shot dead outside Chicago theater', category: 'crime' },
  ],

  // 1935
  '1935-06': [
    { headline: 'Bruno Hauptmann convicted of Lindbergh kidnapping', category: 'crime' },
  ],
  '1935-18': [
    { headline: 'Alcoholics Anonymous founded', category: 'society' },
  ],
  '1935-21': [
    { headline: 'Babe Ruth retires from baseball', category: 'sports' },
  ],
  '1935-24': [
    { headline: 'James Braddock stuns Max Baer for title', category: 'sports' },
  ],
  '1935-36': [
    { headline: 'Social Security Act signed into law', category: 'politics' },
  ],
  '1935-41': [
    { headline: 'Italy invades Ethiopia', category: 'world' },
  ],
  '1935-47': [
    { headline: 'Parker Brothers releases Monopoly board game', category: 'culture' },
  ],

  // 1936
  '1936-15': [
    { headline: 'Gone with the Wind published', category: 'culture' },
  ],
  '1936-24': [
    { headline: 'Joe Louis loses to Max Schmeling', category: 'sports' },
  ],
  '1936-32': [
    { headline: 'Jesse Owens wins 4 gold medals at Berlin Olympics', category: 'sports' },
  ],
  '1936-36': [
    { headline: 'Spanish Civil War begins', category: 'world' },
  ],
  '1936-45': [
    { headline: 'FDR wins landslide reelection', category: 'politics' },
  ],
  '1936-49': [
    { headline: 'BBC begins world\'s first regular TV broadcasts', category: 'technology' },
  ],
  '1936-51': [
    { headline: 'Edward VIII abdicates for Wallis Simpson', category: 'world' },
  ],

  // 1937
  '1937-10': [
    { headline: 'Sit-down strikes spread across auto industry', category: 'economy' },
  ],
  '1937-19': [
    { headline: 'Hindenburg disaster: "Oh, the humanity!"', category: 'disaster' },
  ],
  '1937-22': [
    { headline: 'Golden Gate Bridge opens in San Francisco', category: 'technology' },
  ],
  '1937-24': [
    { headline: 'Joe Louis knocks out James Braddock for title', category: 'sports' },
  ],
  '1937-28': [
    { headline: 'Amelia Earhart vanishes over Pacific Ocean', category: 'disaster' },
  ],
  '1937-51': [
    { headline: 'Snow White becomes first full-length animated film', category: 'culture' },
  ],

  // 1938
  '1938-10': [
    { headline: 'Germany annexes Austria in Anschluss', category: 'world' },
  ],
  '1938-24': [
    { headline: 'JOE LOUIS KNOCKS OUT MAX SCHMELING IN ONE ROUND', category: 'sports' },
  ],
  '1938-26': [
    { headline: 'Superman debuts in Action Comics #1', category: 'culture' },
  ],
  '1938-39': [
    { headline: 'Kristallnacht: Nazi attacks on Jewish businesses', category: 'world' },
  ],
  '1938-43': [
    { headline: 'Orson Welles\' "War of the Worlds" causes panic', category: 'culture' },
  ],

  // 1939
  '1939-06': [
    { headline: 'Batman debuts in Detective Comics', category: 'culture' },
  ],
  '1939-15': [
    { headline: 'Lou Gehrig delivers "Luckiest Man" speech', category: 'sports' },
  ],
  '1939-18': [
    { headline: 'New York World\'s Fair opens', category: 'culture' },
  ],
  '1939-31': [
    { headline: 'The Wizard of Oz premieres', category: 'culture' },
  ],
  '1939-35': [
    { headline: 'Germany invades Poland - WWII begins', category: 'world' },
  ],
  '1939-50': [
    { headline: 'Gone with the Wind premieres in Atlanta', category: 'culture' },
  ],

  // ============================================
  // 1940s - WORLD WAR II ERA
  // ============================================

  // 1940
  '1940-15': [
    { headline: 'Germany invades France, Belgium, Netherlands', category: 'world' },
  ],
  '1940-19': [
    { headline: 'Winston Churchill becomes British Prime Minister', category: 'world' },
  ],
  '1940-23': [
    { headline: 'Dunkirk evacuation saves 338,000 Allied troops', category: 'world' },
  ],
  '1940-33': [
    { headline: 'Battle of Britain begins as Luftwaffe attacks', category: 'world' },
  ],
  '1940-40': [
    { headline: 'First McDonald\'s restaurant opens in California', category: 'economy' },
  ],
  '1940-46': [
    { headline: 'FDR wins unprecedented third term', category: 'politics' },
  ],

  // 1941
  '1941-03': [
    { headline: 'Captain America debuts in comic books', category: 'culture' },
  ],
  '1941-17': [
    { headline: 'Joe DiMaggio begins 56-game hitting streak', category: 'sports' },
  ],
  '1941-21': [
    { headline: 'Joe Louis KOs Billy Conn in classic fight', category: 'sports' },
  ],
  '1941-26': [
    { headline: 'Germany invades Soviet Union - Operation Barbarossa', category: 'world' },
  ],
  '1941-49': [
    { headline: 'PEARL HARBOR ATTACKED - US enters World War II', category: 'world' },
  ],

  // 1942
  '1942-06': [
    { headline: 'Japanese Americans ordered to internment camps', category: 'politics' },
  ],
  '1942-18': [
    { headline: 'Doolittle Raid: first US bombing of Japan', category: 'world' },
  ],
  '1942-23': [
    { headline: 'Battle of Midway turns tide in Pacific', category: 'world' },
  ],
  '1942-40': [
    { headline: 'Bing Crosby records "White Christmas"', category: 'culture' },
  ],
  '1942-47': [
    { headline: 'Casablanca premieres starring Bogart and Bergman', category: 'culture' },
  ],

  // 1943
  '1943-06': [
    { headline: 'German forces surrender at Stalingrad', category: 'world' },
  ],
  '1943-20': [
    { headline: 'Warsaw Ghetto Uprising begins', category: 'world' },
  ],
  '1943-28': [
    { headline: 'Race riots erupt in Detroit and Los Angeles', category: 'society' },
  ],
  '1943-36': [
    { headline: 'Allied forces invade Italy', category: 'world' },
  ],
  '1943-47': [
    { headline: 'Pentagon building completed', category: 'technology' },
  ],

  // 1944
  '1944-03': [
    { headline: 'Allied bombers target German ball bearing factories', category: 'world' },
  ],
  '1944-23': [
    { headline: 'D-DAY: Allied forces land at Normandy', category: 'world' },
  ],
  '1944-29': [
    { headline: 'Anne Frank\'s diary entries end', category: 'world' },
  ],
  '1944-34': [
    { headline: 'Paris liberated from Nazi occupation', category: 'world' },
  ],
  '1944-45': [
    { headline: 'FDR wins fourth term as President', category: 'politics' },
  ],
  '1944-51': [
    { headline: 'Battle of the Bulge - Germany\'s last offensive', category: 'world' },
  ],

  // 1945
  '1945-06': [
    { headline: 'Auschwitz concentration camp liberated', category: 'world' },
  ],
  '1945-15': [
    { headline: 'FDR dies; Harry Truman becomes President', category: 'politics' },
  ],
  '1945-18': [
    { headline: 'Hitler commits suicide as Berlin falls', category: 'world' },
  ],
  '1945-19': [
    { headline: 'V-E DAY: Germany surrenders, war ends in Europe', category: 'world' },
  ],
  '1945-28': [
    { headline: 'United Nations Charter signed in San Francisco', category: 'world' },
  ],
  '1945-32': [
    { headline: 'Atomic bomb dropped on Hiroshima', category: 'world' },
  ],
  '1945-33': [
    { headline: 'V-J DAY: Japan surrenders, WWII ends', category: 'world' },
  ],
  '1945-43': [
    { headline: 'United Nations officially established', category: 'world' },
  ],
  '1945-47': [
    { headline: 'Nuremberg trials of Nazi war criminals begin', category: 'world' },
  ],

  // 1946
  '1946-05': [
    { headline: 'ENIAC unveiled - first general-purpose computer', category: 'technology' },
  ],
  '1946-10': [
    { headline: 'First UN General Assembly meets in London', category: 'world' },
  ],
  '1946-19': [
    { headline: 'Joe Louis knocks out Billy Conn in rematch', category: 'sports' },
  ],
  '1946-24': [
    { headline: 'It\'s a Wonderful Life premieres', category: 'culture' },
  ],
  '1946-27': [
    { headline: 'Bikini Atoll atomic bomb tests begin', category: 'world' },
  ],
  '1946-36': [
    { headline: 'Dr. Benjamin Spock publishes baby care book', category: 'culture' },
  ],

  // 1947
  '1947-12': [
    { headline: 'Cold War begins: Truman Doctrine announced', category: 'world' },
  ],
  '1947-15': [
    { headline: 'Jackie Robinson breaks baseball\'s color barrier', category: 'sports' },
  ],
  '1947-24': [
    { headline: 'UFO reportedly crashes near Roswell, New Mexico', category: 'culture' },
  ],
  '1947-33': [
    { headline: 'India gains independence from Britain', category: 'world' },
  ],
  '1947-40': [
    { headline: 'House Un-American Activities Committee investigates Hollywood', category: 'politics' },
  ],
  '1947-48': [
    { headline: 'First Polaroid instant camera demonstrated', category: 'technology' },
  ],

  // 1948
  '1948-17': [
    { headline: 'Joe Louis retires as undefeated heavyweight champion', category: 'sports' },
  ],
  '1948-20': [
    { headline: 'State of Israel declared', category: 'world' },
  ],
  '1948-26': [
    { headline: 'Berlin Airlift begins as Soviets blockade city', category: 'world' },
  ],
  '1948-30': [
    { headline: 'London Olympics: first since 1936', category: 'sports' },
  ],
  '1948-45': [
    { headline: 'Harry Truman upsets Thomas Dewey', category: 'politics' },
  ],

  // 1949
  '1949-07': [
    { headline: 'Ezzard Charles wins vacant heavyweight title', category: 'sports' },
  ],
  '1949-14': [
    { headline: 'NATO alliance formed', category: 'world' },
  ],
  '1949-25': [
    { headline: '1984 published by George Orwell', category: 'culture' },
  ],
  '1949-35': [
    { headline: 'Soviet Union tests its first atomic bomb', category: 'world' },
  ],
  '1949-40': [
    { headline: 'Mao Zedong establishes People\'s Republic of China', category: 'world' },
  ],

  // ============================================
  // 1950s - POST-WAR AMERICA
  // ============================================

  // 1950
  '1950-03': [
    { headline: 'Senator McCarthy claims Communist infiltration', category: 'politics' },
  ],
  '1950-07': [
    { headline: 'Brink\'s robbery: $2.7 million stolen in Boston', category: 'crime' },
  ],
  '1950-26': [
    { headline: 'Korean War begins as North invades South', category: 'world' },
  ],
  '1950-36': [
    { headline: 'Ezzard Charles defeats Joe Louis', category: 'sports' },
  ],
  '1950-43': [
    { headline: 'Chinese forces enter Korean War', category: 'world' },
  ],

  // 1951
  '1951-14': [
    { headline: 'Julius and Ethel Rosenberg sentenced to death', category: 'politics' },
  ],
  '1951-18': [
    { headline: 'MacArthur fired by Truman over Korea strategy', category: 'politics' },
  ],
  '1951-27': [
    { headline: 'Jersey Joe Walcott KOs Ezzard Charles for title', category: 'sports' },
  ],
  '1951-40': [
    { headline: 'I Love Lucy premieres on CBS', category: 'culture' },
  ],
  '1951-42': [
    { headline: 'Color television introduced in United States', category: 'technology' },
  ],

  // 1952
  '1952-08': [
    { headline: 'Queen Elizabeth II ascends to throne', category: 'world' },
  ],
  '1952-30': [
    { headline: 'Helsinki Olympics: first Soviet participation', category: 'sports' },
  ],
  '1952-37': [
    { headline: 'Rocky Marciano knocks out Jersey Joe Walcott', category: 'sports' },
  ],
  '1952-45': [
    { headline: 'US tests first hydrogen bomb', category: 'world' },
  ],
  '1952-46': [
    { headline: 'Dwight Eisenhower elected President', category: 'politics' },
  ],

  // 1953
  '1953-10': [
    { headline: 'Stalin dies; power struggle in Soviet Union', category: 'world' },
  ],
  '1953-18': [
    { headline: 'Rocky Marciano KOs Jersey Joe Walcott in rematch', category: 'sports' },
  ],
  '1953-22': [
    { headline: 'Edmund Hillary and Tenzing Norgay summit Everest', category: 'sports' },
  ],
  '1953-23': [
    { headline: 'Coronation of Queen Elizabeth II', category: 'world' },
  ],
  '1953-25': [
    { headline: 'Rosenbergs executed for espionage', category: 'politics' },
  ],
  '1953-30': [
    { headline: 'Korean War armistice signed', category: 'world' },
  ],
  '1953-37': [
    { headline: 'Rocky Marciano KOs Roland LaStarza', category: 'sports' },
  ],

  // 1954
  '1954-14': [
    { headline: 'Army-McCarthy hearings begin', category: 'politics' },
  ],
  '1954-19': [
    { headline: 'Roger Bannister breaks 4-minute mile', category: 'sports' },
  ],
  '1954-20': [
    { headline: 'Brown v. Board of Education ends school segregation', category: 'politics' },
  ],
  '1954-24': [
    { headline: 'Rocky Marciano KOs Ezzard Charles', category: 'sports' },
  ],
  '1954-27': [
    { headline: 'Tolkien publishes first Lord of the Rings book', category: 'culture' },
  ],
  '1954-38': [
    { headline: 'Rocky Marciano stops Ezzard Charles in rematch', category: 'sports' },
  ],
  '1954-49': [
    { headline: 'Senate censures Joseph McCarthy', category: 'politics' },
  ],

  // 1955
  '1955-05': [
    { headline: 'Ray Kroc opens first McDonald\'s franchise', category: 'economy' },
  ],
  '1955-15': [
    { headline: 'Disneyland opens in Anaheim, California', category: 'culture' },
  ],
  '1955-21': [
    { headline: 'Rocky Marciano KOs Don Cockell in 9th round', category: 'sports' },
  ],
  '1955-29': [
    { headline: 'James Dean dies in car crash at age 24', category: 'culture' },
  ],
  '1955-36': [
    { headline: 'Rocky Marciano retires undefeated at 49-0', category: 'sports' },
  ],
  '1955-48': [
    { headline: 'Rosa Parks refuses to give up bus seat', category: 'society' },
  ],

  // 1956
  '1956-03': [
    { headline: 'Elvis Presley appears on Ed Sullivan Show', category: 'culture' },
  ],
  '1956-20': [
    { headline: 'Grace Kelly marries Prince Rainier of Monaco', category: 'culture' },
  ],
  '1956-27': [
    { headline: 'Andrea Doria sinks after collision', category: 'disaster' },
  ],
  '1956-35': [
    { headline: 'Floyd Patterson wins vacant heavyweight title', category: 'sports' },
  ],
  '1956-44': [
    { headline: 'Soviet tanks crush Hungarian uprising', category: 'world' },
  ],
  '1956-46': [
    { headline: 'Eisenhower wins reelection in landslide', category: 'politics' },
  ],

  // 1957
  '1957-06': [
    { headline: 'Humphrey Bogart dies of cancer at 57', category: 'culture' },
  ],
  '1957-30': [
    { headline: 'Floyd Patterson KOs Tommy Jackson', category: 'sports' },
  ],
  '1957-37': [
    { headline: 'Little Rock Nine integrate Arkansas school', category: 'society' },
  ],
  '1957-40': [
    { headline: 'SPUTNIK: USSR launches first satellite', category: 'technology' },
  ],
  '1957-44': [
    { headline: 'Leave It to Beaver premieres', category: 'culture' },
  ],
  '1957-47': [
    { headline: 'Laika the dog becomes first animal in orbit', category: 'technology' },
  ],

  // 1958
  '1958-05': [
    { headline: 'NASA established for space exploration', category: 'technology' },
  ],
  '1958-14': [
    { headline: 'Van Cliburn wins Tchaikovsky Competition in Moscow', category: 'culture' },
  ],
  '1958-23': [
    { headline: 'Charles de Gaulle returns to power in France', category: 'world' },
  ],
  '1958-31': [
    { headline: 'First transatlantic jet passenger service begins', category: 'technology' },
  ],
  '1958-34': [
    { headline: 'Ingemar Johansson KOs Floyd Patterson', category: 'sports' },
  ],

  // 1959
  '1959-01': [
    { headline: 'Fidel Castro takes power in Cuba', category: 'world' },
  ],
  '1959-05': [
    { headline: 'Buddy Holly, Ritchie Valens die in plane crash', category: 'culture' },
  ],
  '1959-08': [
    { headline: 'Alaska becomes 49th US state', category: 'politics' },
  ],
  '1959-25': [
    { headline: 'Ingemar Johansson shocks Floyd Patterson', category: 'sports' },
  ],
  '1959-30': [
    { headline: 'Nixon and Khrushchev have "Kitchen Debate"', category: 'politics' },
  ],
  '1959-34': [
    { headline: 'Hawaii becomes 50th US state', category: 'politics' },
  ],

  // ============================================
  // 1960s - TURBULENT TIMES
  // ============================================

  // 1960
  '1960-06': [
    { headline: 'Greensboro sit-ins begin civil rights movement', category: 'society' },
  ],
  '1960-19': [
    { headline: 'U-2 spy plane shot down over Soviet Union', category: 'world' },
  ],
  '1960-25': [
    { headline: 'Floyd Patterson KOs Ingemar Johansson in rematch', category: 'sports' },
  ],
  '1960-35': [
    { headline: 'Rome Olympics: Cassius Clay wins gold', category: 'sports' },
  ],
  '1960-39': [
    { headline: 'Kennedy-Nixon debates: first televised', category: 'politics' },
  ],
  '1960-45': [
    { headline: 'John F. Kennedy elected President', category: 'politics' },
  ],

  // 1961
  '1961-03': [
    { headline: 'JFK establishes Peace Corps', category: 'politics' },
  ],
  '1961-12': [
    { headline: 'Floyd Patterson KOs Ingemar Johansson again', category: 'sports' },
  ],
  '1961-15': [
    { headline: 'Bay of Pigs invasion fails', category: 'world' },
  ],
  '1961-16': [
    { headline: 'Yuri Gagarin: first human in space', category: 'technology' },
  ],
  '1961-20': [
    { headline: 'Freedom Riders challenge segregation', category: 'society' },
  ],
  '1961-33': [
    { headline: 'Berlin Wall construction begins', category: 'world' },
  ],
  '1961-40': [
    { headline: 'Roger Maris hits 61st home run', category: 'sports' },
  ],

  // 1962
  '1962-07': [
    { headline: 'John Glenn orbits Earth', category: 'technology' },
  ],
  '1962-26': [
    { headline: 'Sonny Liston destroys Floyd Patterson in one round', category: 'sports' },
  ],
  '1962-31': [
    { headline: 'Marilyn Monroe found dead at 36', category: 'culture' },
  ],
  '1962-40': [
    { headline: 'James Meredith integrates Ole Miss', category: 'society' },
  ],
  '1962-42': [
    { headline: 'CUBAN MISSILE CRISIS: World on nuclear brink', category: 'world' },
  ],

  // 1963
  '1963-24': [
    { headline: 'Martin Luther King delivers "I Have a Dream"', category: 'society' },
  ],
  '1963-29': [
    { headline: 'Sonny Liston KOs Floyd Patterson in rematch', category: 'sports' },
  ],
  '1963-47': [
    { headline: 'PRESIDENT KENNEDY ASSASSINATED in Dallas', category: 'politics' },
  ],
  '1963-51': [
    { headline: 'The Beatles release "I Want to Hold Your Hand"', category: 'culture' },
  ],

  // 1964
  '1964-06': [
    { headline: 'Beatles arrive in America - Beatlemania begins', category: 'culture' },
  ],
  '1964-09': [
    { headline: 'CASSIUS CLAY SHOCKS SONNY LISTON - "I AM THE GREATEST!"', category: 'sports' },
  ],
  '1964-10': [
    { headline: 'Clay changes name to Muhammad Ali', category: 'sports' },
  ],
  '1964-27': [
    { headline: 'Civil Rights Act signed by President Johnson', category: 'politics' },
  ],
  '1964-32': [
    { headline: 'Gulf of Tonkin Resolution escalates Vietnam War', category: 'world' },
  ],
  '1964-42': [
    { headline: 'Tokyo Olympics: first held in Asia', category: 'sports' },
  ],
  '1964-45': [
    { headline: 'LBJ wins landslide victory over Goldwater', category: 'politics' },
  ],

  // 1965
  '1965-08': [
    { headline: 'Malcolm X assassinated in New York', category: 'society' },
  ],
  '1965-11': [
    { headline: 'Selma to Montgomery marches for voting rights', category: 'society' },
  ],
  '1965-14': [
    { headline: 'First US combat troops arrive in Vietnam', category: 'world' },
  ],
  '1965-20': [
    { headline: 'Muhammad Ali KOs Sonny Liston with "phantom punch"', category: 'sports' },
  ],
  '1965-33': [
    { headline: 'Watts riots erupt in Los Angeles', category: 'society' },
  ],
  '1965-46': [
    { headline: 'Great Northeast Blackout affects 30 million', category: 'disaster' },
  ],

  // 1966
  '1966-11': [
    { headline: 'Muhammad Ali begins run of title defenses', category: 'sports' },
  ],
  '1966-24': [
    { headline: 'Muhammad Ali refuses military induction', category: 'sports' },
  ],
  '1966-27': [
    { headline: 'England wins FIFA World Cup at Wembley', category: 'sports' },
  ],
  '1966-36': [
    { headline: 'Star Trek premieres on NBC', category: 'culture' },
  ],
  '1966-44': [
    { headline: 'Black Panther Party founded in Oakland', category: 'society' },
  ],

  // 1967
  '1967-04': [
    { headline: 'Super Bowl I: Packers defeat Chiefs', category: 'sports' },
  ],
  '1967-17': [
    { headline: 'Ali stripped of title for refusing draft', category: 'sports' },
  ],
  '1967-23': [
    { headline: 'Six-Day War: Israel defeats Arab coalition', category: 'world' },
  ],
  '1967-25': [
    { headline: 'Summer of Love begins in San Francisco', category: 'culture' },
  ],
  '1967-29': [
    { headline: 'Detroit riots: 43 dead, city in flames', category: 'society' },
  ],
  '1967-43': [
    { headline: 'First heart transplant performed', category: 'science' },
  ],

  // 1968
  '1968-05': [
    { headline: 'Tet Offensive shocks American public', category: 'world' },
  ],
  '1968-09': [
    { headline: 'Joe Frazier wins New York heavyweight title', category: 'sports' },
  ],
  '1968-15': [
    { headline: 'MARTIN LUTHER KING JR. ASSASSINATED', category: 'society' },
  ],
  '1968-23': [
    { headline: 'ROBERT F. KENNEDY ASSASSINATED', category: 'politics' },
  ],
  '1968-34': [
    { headline: 'Soviet tanks crush Prague Spring', category: 'world' },
  ],
  '1968-35': [
    { headline: 'Protests erupt at Democratic Convention', category: 'politics' },
  ],
  '1968-42': [
    { headline: 'Mexico City Olympics: Black Power salute', category: 'sports' },
  ],
  '1968-45': [
    { headline: 'Richard Nixon elected President', category: 'politics' },
  ],
  '1968-51': [
    { headline: 'Apollo 8 orbits Moon on Christmas Eve', category: 'technology' },
  ],

  // 1969
  '1969-04': [
    { headline: 'Super Bowl III: Joe Namath guarantees Jets win', category: 'sports' },
  ],
  '1969-12': [
    { headline: 'Joe Frazier unifies heavyweight title', category: 'sports' },
  ],
  '1969-29': [
    { headline: 'MAN WALKS ON MOON: "One small step..."', category: 'technology' },
  ],
  '1969-33': [
    { headline: 'Woodstock music festival draws 400,000', category: 'culture' },
  ],
  '1969-35': [
    { headline: 'Manson Family murders shock Hollywood', category: 'crime' },
  ],
  '1969-43': [
    { headline: 'First ARPANET message sent - internet born', category: 'technology' },
  ],
  '1969-49': [
    { headline: 'Altamont concert ends in violence', category: 'culture' },
  ],

  // ============================================
  // 1970s - DISCO AND DISCONTENT
  // ============================================

  // 1970
  '1970-08': [
    { headline: 'Joe Frazier KOs Jimmy Ellis to keep title', category: 'sports' },
  ],
  '1970-15': [
    { headline: 'First Earth Day celebrated', category: 'society' },
  ],
  '1970-18': [
    { headline: 'Kent State shootings: 4 students killed', category: 'society' },
  ],
  '1970-36': [
    { headline: 'Jimi Hendrix dies at 27', category: 'culture' },
  ],
  '1970-40': [
    { headline: 'Janis Joplin dies at 27', category: 'culture' },
  ],
  '1970-44': [
    { headline: 'Muhammad Ali returns after 3-year exile', category: 'sports' },
  ],

  // 1971
  '1971-10': [
    { headline: 'Charles Manson sentenced to death', category: 'crime' },
  ],
  '1971-11': [
    { headline: 'ALI vs FRAZIER I: "Fight of the Century" - Frazier wins', category: 'sports' },
  ],
  '1971-23': [
    { headline: 'Pentagon Papers published by NY Times', category: 'politics' },
  ],
  '1971-27': [
    { headline: 'Jim Morrison found dead in Paris', category: 'culture' },
  ],
  '1971-40': [
    { headline: 'Walt Disney World opens in Florida', category: 'culture' },
  ],

  // 1972
  '1972-08': [
    { headline: 'Nixon visits China - historic breakthrough', category: 'politics' },
  ],
  '1972-04': [
    { headline: 'Joe Frazier knocks out Terry Daniels', category: 'sports' },
  ],
  '1972-24': [
    { headline: 'Watergate break-in at DNC headquarters', category: 'politics' },
  ],
  '1972-35': [
    { headline: 'Munich Olympics: 11 Israeli athletes killed', category: 'world' },
  ],
  '1972-46': [
    { headline: 'Nixon wins landslide reelection', category: 'politics' },
  ],

  // 1973
  '1973-03': [
    { headline: 'Vietnam War ceasefire signed', category: 'world' },
  ],
  '1973-04': [
    { headline: 'George Foreman destroys Joe Frazier for title', category: 'sports' },
  ],
  '1973-05': [
    { headline: 'Super Bowl VII: Dolphins complete perfect season', category: 'sports' },
  ],
  '1973-20': [
    { headline: 'Watergate hearings begin on live TV', category: 'politics' },
  ],
  '1973-36': [
    { headline: 'George Foreman KOs Jose Roman in one round', category: 'sports' },
  ],
  '1973-41': [
    { headline: 'OPEC oil embargo begins - gas crisis', category: 'economy' },
  ],
  '1973-42': [
    { headline: 'Saturday Night Massacre shocks nation', category: 'politics' },
  ],

  // 1974
  '1974-10': [
    { headline: 'George Foreman demolishes Ken Norton', category: 'sports' },
  ],
  '1974-15': [
    { headline: 'Hank Aaron breaks Babe Ruth\'s home run record', category: 'sports' },
  ],
  '1974-05': [
    { headline: 'ALI vs FRAZIER II: Ali wins rematch', category: 'sports' },
  ],
  '1974-32': [
    { headline: 'NIXON RESIGNS - Ford becomes President', category: 'politics' },
  ],
  '1974-44': [
    { headline: 'RUMBLE IN THE JUNGLE: Ali KOs Foreman in 8th', category: 'sports' },
  ],

  // 1975
  '1975-17': [
    { headline: 'Saigon falls - Vietnam War ends', category: 'world' },
  ],
  '1975-21': [
    { headline: 'Ali KOs Ron Lyle in dramatic fight', category: 'sports' },
  ],
  '1975-27': [
    { headline: 'Ali beats Joe Bugner in sweltering Malaysia', category: 'sports' },
  ],
  '1975-30': [
    { headline: 'Jimmy Hoffa disappears', category: 'crime' },
  ],
  '1975-40': [
    { headline: 'Saturday Night Live premieres', category: 'culture' },
  ],
  '1975-44': [
    { headline: 'THRILLA IN MANILA: Ali stops Frazier in epic', category: 'sports' },
  ],

  // 1976
  '1976-05': [
    { headline: 'Apple Computer founded in garage', category: 'technology' },
  ],
  '1976-20': [
    { headline: 'Ali beats Jimmy Young in controversial decision', category: 'sports' },
  ],
  '1976-25': [
    { headline: 'Ali knocks out Richard Dunn in 5th round', category: 'sports' },
  ],
  '1976-27': [
    { headline: 'US celebrates Bicentennial', category: 'culture' },
  ],
  '1976-29': [
    { headline: 'Viking 1 lands on Mars', category: 'technology' },
  ],
  '1976-39': [
    { headline: 'Ali barely beats Ken Norton in rubber match', category: 'sports' },
  ],
  '1976-45': [
    { headline: 'Jimmy Carter elected President', category: 'politics' },
  ],

  // 1977
  '1977-03': [
    { headline: 'Roots miniseries watched by 130 million', category: 'culture' },
  ],
  '1977-21': [
    { headline: 'Star Wars premieres - changes cinema forever', category: 'culture' },
  ],
  '1977-29': [
    { headline: 'New York City blackout sparks looting', category: 'disaster' },
  ],
  '1977-33': [
    { headline: 'Elvis Presley dies at Graceland', category: 'culture' },
  ],
  '1977-38': [
    { headline: 'Ali loses split decision to Leon Spinks', category: 'sports' },
  ],
  '1977-39': [
    { headline: 'Atari 2600 launches home video game era', category: 'technology' },
  ],

  // 1978
  '1978-09': [
    { headline: 'Leon Spinks upsets Muhammad Ali', category: 'sports' },
  ],
  '1978-28': [
    { headline: 'First test-tube baby born in England', category: 'science' },
  ],
  '1978-37': [
    { headline: 'Camp David Accords signed', category: 'world' },
  ],
  '1978-38': [
    { headline: 'Ali beats Spinks to become 3-time champion', category: 'sports' },
  ],
  '1978-46': [
    { headline: 'Jonestown massacre: 900+ dead', category: 'crime' },
  ],
  '1978-50': [
    { headline: 'Larry Holmes becomes WBC heavyweight champion', category: 'sports' },
  ],

  // 1979
  '1979-13': [
    { headline: 'Three Mile Island nuclear accident', category: 'disaster' },
  ],
  '1979-19': [
    { headline: 'Margaret Thatcher becomes British PM', category: 'world' },
  ],
  '1979-25': [
    { headline: 'ESPN launches 24-hour sports network', category: 'sports' },
  ],
  '1979-40': [
    { headline: 'Larry Holmes defends against Earnie Shavers', category: 'sports' },
  ],
  '1979-44': [
    { headline: 'Iran hostage crisis begins - 52 Americans held', category: 'world' },
  ],
  '1979-52': [
    { headline: 'Soviet Union invades Afghanistan', category: 'world' },
  ],

  // ============================================
  // 1980s - THE MTV GENERATION
  // ============================================

  // 1980
  '1980-07': [
    { headline: 'US hockey team\'s "Miracle on Ice"', category: 'sports' },
  ],
  '1980-12': [
    { headline: 'Larry Holmes stops Lorenzo Zanon', category: 'sports' },
  ],
  '1980-15': [
    { headline: 'US boycotts Moscow Olympics', category: 'sports' },
  ],
  '1980-20': [
    { headline: 'Mount St. Helens erupts violently', category: 'disaster' },
  ],
  '1980-23': [
    { headline: 'CNN launches as first 24-hour news network', category: 'technology' },
  ],
  '1980-40': [
    { headline: 'Ali loses comeback to Larry Holmes', category: 'sports' },
  ],
  '1980-45': [
    { headline: 'Ronald Reagan elected President', category: 'politics' },
  ],
  '1980-50': [
    { headline: 'John Lennon shot and killed in NYC', category: 'culture' },
  ],

  // 1981
  '1981-04': [
    { headline: 'Iran hostages released after 444 days', category: 'world' },
  ],
  '1981-12': [
    { headline: 'Reagan survives assassination attempt', category: 'politics' },
  ],
  '1981-15': [
    { headline: 'First Space Shuttle Columbia launches', category: 'technology' },
  ],
  '1981-24': [
    { headline: 'Larry Holmes defends vs. Leon Spinks', category: 'sports' },
  ],
  '1981-31': [
    { headline: 'MTV launches: "Video Killed the Radio Star"', category: 'culture' },
  ],
  '1981-39': [
    { headline: 'Sandra Day O\'Connor: first female Supreme Court Justice', category: 'politics' },
  ],
  '1981-45': [
    { headline: 'Larry Holmes stops Renaldo Snipes', category: 'sports' },
  ],

  // 1982
  '1982-17': [
    { headline: 'Falklands War: Britain vs Argentina', category: 'world' },
  ],
  '1982-23': [
    { headline: 'Larry Holmes defends vs. Gerry Cooney', category: 'sports' },
  ],
  '1982-24': [
    { headline: 'E.T. the Extra-Terrestrial breaks records', category: 'culture' },
  ],
  '1982-39': [
    { headline: 'Tylenol poisoning kills 7 in Chicago', category: 'crime' },
  ],
  '1982-46': [
    { headline: 'Larry Holmes stops Randall Cobb', category: 'sports' },
  ],
  '1982-48': [
    { headline: 'Michael Jackson releases Thriller', category: 'culture' },
  ],

  // 1983
  '1983-05': [
    { headline: 'M*A*S*H finale watched by 106 million', category: 'culture' },
  ],
  '1983-12': [
    { headline: 'Larry Holmes stops Lucien Rodriguez', category: 'sports' },
  ],
  '1983-14': [
    { headline: 'US Embassy bombing in Beirut kills 63', category: 'world' },
  ],
  '1983-35': [
    { headline: 'Soviet jet shoots down Korean Air Flight 007', category: 'world' },
  ],
  '1983-38': [
    { headline: 'Larry Holmes decisions Scott Frank', category: 'sports' },
  ],
  '1983-43': [
    { headline: 'Beirut barracks bombing kills 241 Marines', category: 'world' },
  ],
  '1983-47': [
    { headline: 'Larry Holmes stops Marvis Frazier in 1st round', category: 'sports' },
  ],

  // 1984
  '1984-05': [
    { headline: 'Apple Macintosh unveiled with iconic ad', category: 'technology' },
  ],
  '1984-21': [
    { headline: 'Tim Witherspoon wins WBC heavyweight title', category: 'sports' },
  ],
  '1984-31': [
    { headline: 'Los Angeles hosts Summer Olympics', category: 'sports' },
  ],
  '1984-36': [
    { headline: 'Pinklon Thomas wins WBC heavyweight title', category: 'sports' },
  ],
  '1984-40': [
    { headline: 'Indira Gandhi assassinated', category: 'world' },
  ],
  '1984-45': [
    { headline: 'Reagan wins 49 states against Mondale', category: 'politics' },
  ],
  '1984-49': [
    { headline: 'Bhopal disaster kills thousands in India', category: 'disaster' },
  ],

  // 1985
  '1985-11': [
    { headline: 'Mikhail Gorbachev becomes Soviet leader', category: 'world' },
  ],
  '1985-16': [
    { headline: 'Larry Holmes loses to Michael Spinks', category: 'sports' },
  ],
  '1985-28': [
    { headline: 'Live Aid concerts raise millions for famine', category: 'culture' },
  ],
  '1985-34': [
    { headline: 'Michael Spinks beats Larry Holmes in rematch', category: 'sports' },
  ],
  '1985-37': [
    { headline: 'Titanic wreckage discovered', category: 'science' },
  ],
  '1985-40': [
    { headline: 'Nintendo Entertainment System launches in US', category: 'technology' },
  ],

  // 1986
  '1986-04': [
    { headline: 'Space Shuttle Challenger explodes on launch', category: 'disaster' },
  ],
  '1986-09': [
    { headline: 'Trevor Berbick wins WBC heavyweight title', category: 'sports' },
  ],
  '1986-17': [
    { headline: 'Chernobyl nuclear disaster', category: 'disaster' },
  ],
  '1986-20': [
    { headline: 'Hands Across America forms human chain', category: 'culture' },
  ],
  '1986-44': [
    { headline: 'Iran-Contra scandal breaks', category: 'politics' },
  ],
  '1986-47': [
    { headline: 'MIKE TYSON KOs BERBICK - YOUNGEST HEAVYWEIGHT CHAMPION', category: 'sports' },
  ],

  // 1987
  '1987-05': [
    { headline: 'Super Bowl XXI watched by 87 million', category: 'sports' },
  ],
  '1987-10': [
    { headline: 'Tyson unifies WBA/WBC titles vs. James Smith', category: 'sports' },
  ],
  '1987-22': [
    { headline: 'Tyson stops Pinklon Thomas for 3rd title defense', category: 'sports' },
  ],
  '1987-23': [
    { headline: 'Reagan: "Mr. Gorbachev, tear down this wall!"', category: 'politics' },
  ],
  '1987-31': [
    { headline: 'Tyson KOs Tony Tucker - Undisputed Champion', category: 'sports' },
  ],
  '1987-42': [
    { headline: 'BLACK MONDAY: Stock market crashes 22%', category: 'economy' },
  ],
  '1987-48': [
    { headline: 'Infant Jessica rescued from well after 58 hours', category: 'society' },
  ],

  // 1988
  '1988-04': [
    { headline: 'Tyson destroys Larry Holmes in 4 rounds', category: 'sports' },
  ],
  '1988-05': [
    { headline: 'Soviet Union begins withdrawal from Afghanistan', category: 'world' },
  ],
  '1988-12': [
    { headline: 'Tyson knocks out Tony Tubbs in 2 rounds', category: 'sports' },
  ],
  '1988-26': [
    { headline: 'Tyson KOs Michael Spinks in 91 seconds', category: 'sports' },
  ],
  '1988-38': [
    { headline: 'Seoul Olympics: Ben Johnson stripped of gold', category: 'sports' },
  ],
  '1988-45': [
    { headline: 'George H.W. Bush elected President', category: 'politics' },
  ],
  '1988-51': [
    { headline: 'Pan Am Flight 103 bombed over Lockerbie', category: 'disaster' },
  ],

  // 1989
  '1989-08': [
    { headline: 'Tyson stops Frank Bruno in 5th round', category: 'sports' },
  ],
  '1989-10': [
    { headline: 'Exxon Valdez oil spill devastates Alaska', category: 'disaster' },
  ],
  '1989-15': [
    { headline: 'Hillsborough disaster kills 96 at FA Cup', category: 'sports' },
  ],
  '1989-23': [
    { headline: 'Tiananmen Square massacre in Beijing', category: 'world' },
  ],
  '1989-30': [
    { headline: 'Tyson KOs Carl Williams in 93 seconds', category: 'sports' },
  ],
  '1989-42': [
    { headline: 'San Francisco earthquake during World Series', category: 'disaster' },
  ],
  '1989-45': [
    { headline: 'BERLIN WALL FALLS - Cold War ending', category: 'world' },
  ],
  '1989-51': [
    { headline: 'US invades Panama to oust Noriega', category: 'world' },
  ],

  // ============================================
  // 1990s - THE INTERNET AGE BEGINS
  // ============================================

  // 1990
  '1990-06': [
    { headline: 'Nelson Mandela freed after 27 years', category: 'world' },
  ],
  '1990-07': [
    { headline: 'BUSTER DOUGLAS SHOCKS WORLD: Tyson KO\'d in 10th', category: 'sports' },
  ],
  '1990-17': [
    { headline: 'Hubble Space Telescope launched', category: 'technology' },
  ],
  '1990-32': [
    { headline: 'Iraq invades Kuwait - Gulf crisis begins', category: 'world' },
  ],
  '1990-40': [
    { headline: 'Germany officially reunified', category: 'world' },
  ],
  '1990-43': [
    { headline: 'Evander Holyfield KOs Buster Douglas for title', category: 'sports' },
  ],

  // 1991
  '1991-03': [
    { headline: 'Operation Desert Storm begins', category: 'world' },
  ],
  '1991-05': [
    { headline: 'Super Bowl XXV: Giants edge Bills', category: 'sports' },
  ],
  '1991-10': [
    { headline: 'Rodney King beaten by LAPD - caught on video', category: 'society' },
  ],
  '1991-15': [
    { headline: 'Holyfield beats George Foreman', category: 'sports' },
  ],
  '1991-17': [
    { headline: 'World Wide Web opened to public', category: 'technology' },
  ],
  '1991-34': [
    { headline: 'Soviet coup attempt fails', category: 'world' },
  ],
  '1991-42': [
    { headline: 'Clarence Thomas confirmed amid controversy', category: 'politics' },
  ],
  '1991-48': [
    { headline: 'Magic Johnson announces he has HIV', category: 'sports' },
  ],
  '1991-52': [
    { headline: 'Soviet Union dissolves - Cold War ends', category: 'world' },
  ],

  // 1992
  '1992-04': [
    { headline: 'Mike Tyson convicted of rape', category: 'sports' },
  ],
  '1992-18': [
    { headline: 'LA RIOTS after Rodney King verdict', category: 'society' },
  ],
  '1992-24': [
    { headline: 'Holyfield stops Larry Holmes', category: 'sports' },
  ],
  '1992-31': [
    { headline: 'Barcelona Olympics: Dream Team dominates', category: 'sports' },
  ],
  '1992-35': [
    { headline: 'Hurricane Andrew devastates Florida', category: 'disaster' },
  ],
  '1992-45': [
    { headline: 'Bill Clinton elected President', category: 'politics' },
  ],
  '1992-46': [
    { headline: 'Riddick Bowe beats Holyfield for title', category: 'sports' },
  ],

  // 1993
  '1993-08': [
    { headline: 'World Trade Center bombed', category: 'disaster' },
  ],
  '1993-16': [
    { headline: 'Waco siege ends in deadly fire', category: 'disaster' },
  ],
  '1993-24': [
    { headline: 'Lennox Lewis wins WBC heavyweight title', category: 'sports' },
  ],
  '1993-26': [
    { headline: 'Jurassic Park breaks box office records', category: 'culture' },
  ],
  '1993-30': [
    { headline: 'Flood of the Century hits Midwest', category: 'disaster' },
  ],
  '1993-45': [
    { headline: 'Holyfield beats Bowe in rematch for title', category: 'sports' },
  ],

  // 1994
  '1994-04': [
    { headline: 'Tonya Harding scandal rocks figure skating', category: 'sports' },
  ],
  '1994-15': [
    { headline: 'Kurt Cobain found dead at 27', category: 'culture' },
  ],
  '1994-16': [
    { headline: 'Rwandan genocide begins', category: 'world' },
  ],
  '1994-17': [
    { headline: 'Michael Moorer beats Holyfield for title', category: 'sports' },
  ],
  '1994-24': [
    { headline: 'O.J. Simpson slow-speed chase', category: 'crime' },
  ],
  '1994-26': [
    { headline: 'FIFA World Cup held in USA', category: 'sports' },
  ],
  '1994-33': [
    { headline: 'Major League Baseball strike cancels World Series', category: 'sports' },
  ],
  '1994-45': [
    { headline: 'George Foreman KOs Moorer - oldest heavyweight champ', category: 'sports' },
  ],

  // 1995
  '1995-04': [
    { headline: 'O.J. Simpson trial begins', category: 'crime' },
  ],
  '1995-15': [
    { headline: 'Oliver McCall upsets Lennox Lewis', category: 'sports' },
  ],
  '1995-16': [
    { headline: 'Oklahoma City bombing kills 168', category: 'disaster' },
  ],
  '1995-31': [
    { headline: 'Windows 95 launches to massive hype', category: 'technology' },
  ],
  '1995-35': [
    { headline: 'eBay founded', category: 'technology' },
  ],
  '1995-40': [
    { headline: 'O.J. Simpson found not guilty', category: 'crime' },
  ],
  '1995-45': [
    { headline: 'Riddick Bowe beats Holyfield III', category: 'sports' },
  ],
  '1995-46': [
    { headline: 'Israeli PM Rabin assassinated', category: 'world' },
  ],

  // 1996
  '1996-05': [
    { headline: 'Blizzard of \'96 buries East Coast', category: 'disaster' },
  ],
  '1996-11': [
    { headline: 'TYSON RETURNS: KOs Frank Bruno for title', category: 'sports' },
  ],
  '1996-14': [
    { headline: 'Unabomber Ted Kaczynski arrested', category: 'crime' },
  ],
  '1996-29': [
    { headline: 'Centennial Olympic Park bombing in Atlanta', category: 'disaster' },
  ],
  '1996-30': [
    { headline: 'Dolly the sheep: first cloned mammal', category: 'science' },
  ],
  '1996-36': [
    { headline: 'Tyson KOs Bruce Seldon in 1st round', category: 'sports' },
  ],
  '1996-37': [
    { headline: 'Tupac Shakur shot and killed', category: 'culture' },
  ],
  '1996-45': [
    { headline: 'Holyfield shocks Tyson - wins heavyweight title', category: 'sports' },
  ],
  '1996-46': [
    { headline: 'Clinton reelected over Bob Dole', category: 'politics' },
  ],

  // 1997
  '1997-06': [
    { headline: 'Notorious B.I.G. shot and killed', category: 'culture' },
  ],
  '1997-14': [
    { headline: 'Tiger Woods wins Masters by 12 strokes', category: 'sports' },
  ],
  '1997-19': [
    { headline: 'Deep Blue defeats Kasparov at chess', category: 'technology' },
  ],
  '1997-26': [
    { headline: 'TYSON BITES HOLYFIELD\'S EAR - Disqualified', category: 'sports' },
  ],
  '1997-27': [
    { headline: 'Hong Kong returned to China', category: 'world' },
  ],
  '1997-35': [
    { headline: 'Princess Diana killed in Paris crash', category: 'world' },
  ],
  '1997-40': [
    { headline: 'South Park premieres on Comedy Central', category: 'culture' },
  ],
  '1997-45': [
    { headline: 'Holyfield beats Moorer to unify titles', category: 'sports' },
  ],

  // 1998
  '1998-03': [
    { headline: 'Monica Lewinsky scandal breaks', category: 'politics' },
  ],
  '1998-15': [
    { headline: 'Titanic becomes highest-grossing film ever', category: 'culture' },
  ],
  '1998-24': [
    { headline: 'India and Pakistan test nuclear weapons', category: 'world' },
  ],
  '1998-32': [
    { headline: 'US embassies bombed in Kenya and Tanzania', category: 'world' },
  ],
  '1998-37': [
    { headline: 'Mark McGwire hits 70th home run', category: 'sports' },
  ],
  '1998-38': [
    { headline: 'Google founded in garage', category: 'technology' },
  ],
  '1998-45': [
    { headline: 'Holyfield beats Lennox Lewis in draw controversy', category: 'sports' },
  ],
  '1998-51': [
    { headline: 'Clinton impeached by House', category: 'politics' },
  ],

  // 1999
  '1999-06': [
    { headline: 'Clinton acquitted by Senate', category: 'politics' },
  ],
  '1999-12': [
    { headline: 'Lennox Lewis beats Holyfield in rematch for title', category: 'sports' },
  ],
  '1999-16': [
    { headline: 'Columbine High School massacre', category: 'disaster' },
  ],
  '1999-20': [
    { headline: 'Star Wars: The Phantom Menace premieres', category: 'culture' },
  ],
  '1999-27': [
    { headline: 'JFK Jr. dies in plane crash', category: 'disaster' },
  ],
  '1999-36': [
    { headline: 'Serena Williams wins first US Open', category: 'sports' },
  ],
  '1999-45': [
    { headline: 'Lennox Lewis stops Michael Grant', category: 'sports' },
  ],
  '1999-52': [
    { headline: 'Y2K preparations reach fever pitch', category: 'technology' },
  ],

  // ============================================
  // 2000s - NEW MILLENNIUM
  // ============================================

  // 2000
  '2000-01': [
    { headline: 'Y2K bug causes minimal disruption', category: 'technology' },
  ],
  '2000-04': [
    { headline: 'AOL merges with Time Warner', category: 'economy' },
  ],
  '2000-10': [
    { headline: 'Dot-com bubble begins to burst', category: 'economy' },
  ],
  '2000-17': [
    { headline: 'Lennox Lewis KOs Michael Grant', category: 'sports' },
  ],
  '2000-30': [
    { headline: 'Lewis stops Frans Botha in controversial fight', category: 'sports' },
  ],
  '2000-37': [
    { headline: 'Sydney Olympics: Cathy Freeman wins 400m', category: 'sports' },
  ],
  '2000-45': [
    { headline: 'Election deadlock: Bush vs Gore', category: 'politics' },
  ],
  '2000-47': [
    { headline: 'Lennox Lewis vs. David Tua - Lewis dominates', category: 'sports' },
  ],
  '2000-50': [
    { headline: 'Supreme Court decides election for Bush', category: 'politics' },
  ],

  // 2001
  '2001-05': [
    { headline: 'Wikipedia launches', category: 'technology' },
  ],
  '2001-15': [
    { headline: 'FBI agent Robert Hanssen arrested as spy', category: 'crime' },
  ],
  '2001-17': [
    { headline: 'Lennox Lewis KOs Hasim Rahman - loses title', category: 'sports' },
  ],
  '2001-23': [
    { headline: 'Timothy McVeigh executed for Oklahoma City bombing', category: 'crime' },
  ],
  '2001-37': [
    { headline: '9/11: AMERICA UNDER ATTACK - 3,000 dead', category: 'disaster' },
  ],
  '2001-40': [
    { headline: 'Anthrax letters terrorize nation', category: 'disaster' },
  ],
  '2001-41': [
    { headline: 'US invades Afghanistan', category: 'world' },
  ],
  '2001-43': [
    { headline: 'iPod unveiled by Apple', category: 'technology' },
  ],
  '2001-44': [
    { headline: 'Arizona Diamondbacks win dramatic World Series', category: 'sports' },
  ],
  '2001-46': [
    { headline: 'Lennox Lewis KOs Rahman in rematch', category: 'sports' },
  ],

  // 2002
  '2002-06': [
    { headline: 'Enron scandal leads to bankruptcy', category: 'economy' },
  ],
  '2002-07': [
    { headline: 'Super Bowl XXXVI: Patriots dynasty begins', category: 'sports' },
  ],
  '2002-23': [
    { headline: 'FIFA World Cup co-hosted by Japan and Korea', category: 'sports' },
  ],
  '2002-24': [
    { headline: 'LENNOX LEWIS KNOCKS OUT MIKE TYSON', category: 'sports' },
  ],
  '2002-43': [
    { headline: 'DC sniper attacks terrorize capital region', category: 'crime' },
  ],

  // 2003
  '2003-05': [
    { headline: 'Space Shuttle Columbia disintegrates on re-entry', category: 'disaster' },
  ],
  '2003-12': [
    { headline: 'US invades Iraq - "Shock and Awe"', category: 'world' },
  ],
  '2003-18': [
    { headline: 'Saddam statue toppled in Baghdad', category: 'world' },
  ],
  '2003-24': [
    { headline: 'Lennox Lewis beats Vitali Klitschko on cuts', category: 'sports' },
  ],
  '2003-33': [
    { headline: 'Northeast Blackout affects 55 million', category: 'disaster' },
  ],
  '2003-46': [
    { headline: 'Saddam Hussein captured', category: 'world' },
  ],

  // 2004
  '2004-06': [
    { headline: 'Facebook launches at Harvard', category: 'technology' },
  ],
  '2004-07': [
    { headline: 'Super Bowl XXXVIII: Janet Jackson "wardrobe malfunction"', category: 'culture' },
  ],
  '2004-15': [
    { headline: 'Abu Ghraib prison abuse photos released', category: 'world' },
  ],
  '2004-16': [
    { headline: 'Lennox Lewis retires as champion', category: 'sports' },
  ],
  '2004-24': [
    { headline: 'Ronald Reagan dies at 93', category: 'politics' },
  ],
  '2004-33': [
    { headline: 'Athens Olympics: Michael Phelps wins 8 medals', category: 'sports' },
  ],
  '2004-44': [
    { headline: 'Red Sox break Curse of the Bambino', category: 'sports' },
  ],
  '2004-52': [
    { headline: 'Indian Ocean tsunami kills 230,000', category: 'disaster' },
  ],

  // 2005
  '2005-14': [
    { headline: 'Pope John Paul II dies after 26 years', category: 'world' },
  ],
  '2005-17': [
    { headline: 'YouTube founded', category: 'technology' },
  ],
  '2005-27': [
    { headline: 'London transit bombings kill 52', category: 'disaster' },
  ],
  '2005-35': [
    { headline: 'Hurricane Katrina devastates Gulf Coast', category: 'disaster' },
  ],
  '2005-44': [
    { headline: 'Paris riots rage for weeks', category: 'world' },
  ],

  // 2006
  '2006-06': [
    { headline: 'Twitter founded', category: 'technology' },
  ],
  '2006-27': [
    { headline: 'Italy wins World Cup; Zidane headbutt', category: 'sports' },
  ],
  '2006-32': [
    { headline: 'Pluto demoted from planet status', category: 'science' },
  ],
  '2006-44': [
    { headline: 'Saddam Hussein executed', category: 'world' },
  ],

  // 2007
  '2007-01': [
    { headline: 'iPhone unveiled by Steve Jobs', category: 'technology' },
  ],
  '2007-06': [
    { headline: 'Super Bowl XLI: Colts win; first black head coach', category: 'sports' },
  ],
  '2007-16': [
    { headline: 'Virginia Tech shooting kills 32', category: 'disaster' },
  ],
  '2007-27': [
    { headline: 'iPhone goes on sale', category: 'technology' },
  ],
  '2007-32': [
    { headline: 'Barry Bonds breaks home run record', category: 'sports' },
  ],

  // 2008
  '2008-06': [
    { headline: 'Super Bowl XLII: Giants upset undefeated Patriots', category: 'sports' },
  ],
  '2008-32': [
    { headline: 'Beijing Olympics: Bolt electrifies, Phelps wins 8 golds', category: 'sports' },
  ],
  '2008-37': [
    { headline: 'Lehman Brothers collapses - financial crisis', category: 'economy' },
  ],
  '2008-40': [
    { headline: 'Government bails out banks', category: 'economy' },
  ],
  '2008-45': [
    { headline: 'Barack Obama elected first Black President', category: 'politics' },
  ],

  // 2009
  '2009-03': [
    { headline: 'US Airways Flight 1549 lands on Hudson River', category: 'disaster' },
  ],
  '2009-06': [
    { headline: 'Super Bowl XLIII: Steelers win on final play', category: 'sports' },
  ],
  '2009-17': [
    { headline: 'Swine flu pandemic declared', category: 'world' },
  ],
  '2009-26': [
    { headline: 'Michael Jackson dies at 50', category: 'culture' },
  ],
  '2009-50': [
    { headline: 'Avatar becomes highest-grossing film', category: 'culture' },
  ],

  // ============================================
  // 2010s - SOCIAL MEDIA ERA
  // ============================================

  // 2010
  '2010-02': [
    { headline: 'Haiti earthquake kills 230,000', category: 'disaster' },
  ],
  '2010-07': [
    { headline: 'Super Bowl XLIV: Saints win first championship', category: 'sports' },
  ],
  '2010-16': [
    { headline: 'Deepwater Horizon oil spill begins', category: 'disaster' },
  ],
  '2010-27': [
    { headline: 'FIFA World Cup in South Africa - first in Africa', category: 'sports' },
  ],
  '2010-40': [
    { headline: 'Chilean miners rescued after 69 days', category: 'world' },
  ],

  // 2011
  '2011-01': [
    { headline: 'Arab Spring protests spread across Middle East', category: 'world' },
  ],
  '2011-11': [
    { headline: 'Japan earthquake and tsunami - Fukushima disaster', category: 'disaster' },
  ],
  '2011-17': [
    { headline: 'Prince William marries Kate Middleton', category: 'world' },
  ],
  '2011-18': [
    { headline: 'Osama bin Laden killed by Navy SEALs', category: 'world' },
  ],
  '2011-42': [
    { headline: 'Steve Jobs dies at 56', category: 'technology' },
  ],
  '2011-45': [
    { headline: 'Wladimir Klitschko dominates heavyweight division', category: 'sports' },
  ],

  // 2012
  '2012-07': [
    { headline: 'Super Bowl XLVI: Giants defeat Patriots again', category: 'sports' },
  ],
  '2012-20': [
    { headline: 'Facebook IPO valued at $104 billion', category: 'technology' },
  ],
  '2012-30': [
    { headline: 'Aurora theater shooting at Dark Knight premiere', category: 'disaster' },
  ],
  '2012-32': [
    { headline: 'London Olympics: Bolt repeats; US women dominate', category: 'sports' },
  ],
  '2012-45': [
    { headline: 'Obama reelected over Romney', category: 'politics' },
  ],
  '2012-50': [
    { headline: 'Sandy Hook Elementary shooting kills 26', category: 'disaster' },
  ],

  // 2013
  '2013-06': [
    { headline: 'Super Bowl XLVII: Power outage delays game', category: 'sports' },
  ],
  '2013-07': [
    { headline: 'Pope Benedict XVI resigns', category: 'world' },
  ],
  '2013-16': [
    { headline: 'Boston Marathon bombing kills 3', category: 'disaster' },
  ],
  '2013-23': [
    { headline: 'Edward Snowden reveals NSA surveillance', category: 'politics' },
  ],
  '2013-29': [
    { headline: 'Royal baby: Prince George born', category: 'world' },
  ],

  // 2014
  '2014-06': [
    { headline: 'Super Bowl XLVIII: Seahawks crush Broncos', category: 'sports' },
  ],
  '2014-09': [
    { headline: 'Russia annexes Crimea', category: 'world' },
  ],
  '2014-12': [
    { headline: 'Malaysia Airlines Flight 370 disappears', category: 'disaster' },
  ],
  '2014-27': [
    { headline: 'Germany wins World Cup in Brazil', category: 'sports' },
  ],
  '2014-29': [
    { headline: 'Malaysia Airlines Flight 17 shot down over Ukraine', category: 'disaster' },
  ],
  '2014-33': [
    { headline: 'ALS Ice Bucket Challenge goes viral', category: 'culture' },
  ],
  '2014-46': [
    { headline: 'Ebola outbreak spreads fear globally', category: 'world' },
  ],

  // 2015
  '2015-02': [
    { headline: 'Charlie Hebdo attack in Paris', category: 'world' },
  ],
  '2015-06': [
    { headline: 'Super Bowl XLIX: Patriots win on goal-line interception', category: 'sports' },
  ],
  '2015-26': [
    { headline: 'Supreme Court legalizes same-sex marriage', category: 'politics' },
  ],
  '2015-29': [
    { headline: 'Pluto flyby reveals heart-shaped feature', category: 'science' },
  ],
  '2015-45': [
    { headline: 'Paris terror attacks kill 130', category: 'world' },
  ],
  '2015-48': [
    { headline: 'Tyson Fury upsets Wladimir Klitschko', category: 'sports' },
  ],

  // 2016
  '2016-06': [
    { headline: 'Super Bowl 50: Broncos defense dominates Panthers', category: 'sports' },
  ],
  '2016-14': [
    { headline: 'Panama Papers expose offshore accounts', category: 'world' },
  ],
  '2016-17': [
    { headline: 'Prince dies at 57', category: 'culture' },
  ],
  '2016-24': [
    { headline: 'Orlando Pulse nightclub shooting kills 49', category: 'disaster' },
  ],
  '2016-25': [
    { headline: 'Brexit: UK votes to leave European Union', category: 'world' },
  ],
  '2016-32': [
    { headline: 'Rio Olympics: Bolt three-peats; Phelps retires', category: 'sports' },
  ],
  '2016-44': [
    { headline: 'Cubs win World Series - end 108-year drought', category: 'sports' },
  ],
  '2016-45': [
    { headline: 'Donald Trump elected President', category: 'politics' },
  ],

  // 2017
  '2017-06': [
    { headline: 'Super Bowl LI: Patriots overcome 28-3 deficit', category: 'sports' },
  ],
  '2017-18': [
    { headline: 'Anthony Joshua KOs Wladimir Klitschko', category: 'sports' },
  ],
  '2017-34': [
    { headline: 'Charlottesville rally turns deadly', category: 'society' },
  ],
  '2017-35': [
    { headline: 'Hurricane Harvey floods Houston', category: 'disaster' },
  ],
  '2017-35': [
    { headline: 'Mayweather defeats McGregor in boxing ring', category: 'sports' },
  ],
  '2017-37': [
    { headline: 'Hurricane Maria devastates Puerto Rico', category: 'disaster' },
  ],
  '2017-40': [
    { headline: 'Las Vegas shooting kills 60', category: 'disaster' },
  ],
  '2017-42': [
    { headline: 'Harvey Weinstein scandal sparks #MeToo movement', category: 'society' },
  ],

  // 2018
  '2018-06': [
    { headline: 'Super Bowl LII: Eagles win first title; Foles MVP', category: 'sports' },
  ],
  '2018-07': [
    { headline: 'Parkland school shooting kills 17', category: 'disaster' },
  ],
  '2018-14': [
    { headline: 'Anthony Joshua KOs Joseph Parker - unified champion', category: 'sports' },
  ],
  '2018-20': [
    { headline: 'Royal Wedding: Harry marries Meghan Markle', category: 'world' },
  ],
  '2018-27': [
    { headline: 'France wins World Cup in Russia', category: 'sports' },
  ],
  '2018-28': [
    { headline: 'Thai cave rescue saves 12 boys and coach', category: 'world' },
  ],
  '2018-45': [
    { headline: 'California wildfires deadliest in state history', category: 'disaster' },
  ],
  '2018-49': [
    { headline: 'Deontay Wilder vs Fury ends in controversial draw', category: 'sports' },
  ],

  // 2019
  '2019-06': [
    { headline: 'Super Bowl LIII: Patriots win low-scoring game', category: 'sports' },
  ],
  '2019-15': [
    { headline: 'Notre-Dame Cathedral engulfed in flames', category: 'world' },
  ],
  '2019-18': [
    { headline: 'First image of a black hole revealed', category: 'science' },
  ],
  '2019-23': [
    { headline: 'Andy Ruiz Jr. shocks Anthony Joshua', category: 'sports' },
  ],
  '2019-30': [
    { headline: 'US Women win second straight World Cup', category: 'sports' },
  ],
  '2019-33': [
    { headline: 'Jeffrey Epstein found dead in jail cell', category: 'crime' },
  ],
  '2019-49': [
    { headline: 'Joshua beats Ruiz in rematch', category: 'sports' },
  ],
  '2019-51': [
    { headline: 'Trump impeached by House of Representatives', category: 'politics' },
  ],
  '2019-52': [
    { headline: 'First COVID-19 cases reported in Wuhan, China', category: 'world' },
  ],

  // ============================================
  // 2020s - PANDEMIC AND BEYOND
  // ============================================

  // 2020
  '2020-04': [
    { headline: 'Kobe Bryant dies in helicopter crash', category: 'sports' },
  ],
  '2020-05': [
    { headline: 'Trump acquitted by Senate', category: 'politics' },
  ],
  '2020-06': [
    { headline: 'Super Bowl LIV: Chiefs end 50-year drought', category: 'sports' },
  ],
  '2020-08': [
    { headline: 'Tyson Fury KOs Deontay Wilder in rematch', category: 'sports' },
  ],
  '2020-11': [
    { headline: 'WHO declares COVID-19 a pandemic', category: 'world' },
  ],
  '2020-12': [
    { headline: 'NBA suspends season; sports world follows', category: 'sports' },
  ],
  '2020-13': [
    { headline: 'National emergency declared; lockdowns begin', category: 'world' },
  ],
  '2020-22': [
    { headline: 'George Floyd killed - protests erupt nationwide', category: 'society' },
  ],
  '2020-37': [
    { headline: 'Ruth Bader Ginsburg dies at 87', category: 'politics' },
  ],
  '2020-45': [
    { headline: 'Biden defeats Trump; Trump disputes results', category: 'politics' },
  ],
  '2020-50': [
    { headline: 'First COVID-19 vaccines administered', category: 'science' },
  ],

  // 2021
  '2021-01': [
    { headline: 'Capitol riot: Trump supporters storm Congress', category: 'politics' },
  ],
  '2021-03': [
    { headline: 'Biden inaugurated; Trump skips ceremony', category: 'politics' },
  ],
  '2021-06': [
    { headline: 'Super Bowl LV: Brady wins 7th ring with Buccaneers', category: 'sports' },
  ],
  '2021-11': [
    { headline: 'Derek Chauvin found guilty in Floyd murder', category: 'society' },
  ],
  '2021-26': [
    { headline: 'Surfside condo collapse kills 98', category: 'disaster' },
  ],
  '2021-32': [
    { headline: 'Tokyo Olympics held without spectators', category: 'sports' },
  ],
  '2021-34': [
    { headline: 'US withdraws from Afghanistan; Kabul falls', category: 'world' },
  ],
  '2021-39': [
    { headline: 'Tyson Fury KOs Deontay Wilder in trilogy', category: 'sports' },
  ],

  // 2022
  '2022-06': [
    { headline: 'Super Bowl LVI: Rams win in home stadium', category: 'sports' },
  ],
  '2022-08': [
    { headline: 'Russia invades Ukraine', category: 'world' },
  ],
  '2022-17': [
    { headline: 'Tyson Fury KOs Dillian Whyte at Wembley', category: 'sports' },
  ],
  '2022-21': [
    { headline: 'Uvalde school shooting kills 21', category: 'disaster' },
  ],
  '2022-25': [
    { headline: 'Supreme Court overturns Roe v. Wade', category: 'politics' },
  ],
  '2022-36': [
    { headline: 'Queen Elizabeth II dies after 70-year reign', category: 'world' },
  ],
  '2022-38': [
    { headline: 'Usyk beats Joshua in rematch - undisputed coming?', category: 'sports' },
  ],
  '2022-50': [
    { headline: 'Argentina wins World Cup; Messi\'s crowning glory', category: 'sports' },
  ],

  // 2023
  '2023-06': [
    { headline: 'Super Bowl LVII: Chiefs edge Eagles', category: 'sports' },
  ],
  '2023-07': [
    { headline: 'Chinese spy balloon shot down over US', category: 'world' },
  ],
  '2023-14': [
    { headline: 'Trump indicted - first former president charged', category: 'politics' },
  ],
  '2023-20': [
    { headline: 'Fury vs Usyk set for undisputed title', category: 'sports' },
  ],
  '2023-31': [
    { headline: 'Threads app launches, gains 100M users in days', category: 'technology' },
  ],
  '2023-32': [
    { headline: 'Maui wildfires deadliest in US in century', category: 'disaster' },
  ],
  '2023-41': [
    { headline: 'Hamas attacks Israel; war begins', category: 'world' },
  ],
  '2023-47': [
    { headline: 'ChatGPT turns one year old; AI revolution continues', category: 'technology' },
  ],

  // 2024
  '2024-06': [
    { headline: 'Super Bowl LVIII: Chiefs repeat as champions', category: 'sports' },
  ],
  '2024-08': [
    { headline: 'Alexei Navalny dies in Russian prison', category: 'world' },
  ],
  '2024-14': [
    { headline: 'Total solar eclipse crosses North America', category: 'science' },
  ],
  '2024-15': [
    { headline: 'Iran launches drone attack on Israel', category: 'world' },
  ],
  '2024-20': [
    { headline: 'Oleksandr Usyk beats Fury - first undisputed since Lewis', category: 'sports' },
  ],
  '2024-28': [
    { headline: 'Biden withdraws from presidential race', category: 'politics' },
  ],
  '2024-32': [
    { headline: 'Paris Olympics: historic venues, new stars', category: 'sports' },
  ],
  '2024-45': [
    { headline: 'US Presidential election decides nation\'s future', category: 'politics' },
  ],
  '2024-51': [
    { headline: 'Fury-Usyk rematch in Saudi Arabia', category: 'sports' },
  ],
};

/**
 * Get historical events for a specific week
 * @param {number} year - The year
 * @param {number} week - The week number (1-52)
 * @returns {Array} Array of event objects
 */
export function getEventsForWeek(year, week) {
  const key = `${year}-${String(week).padStart(2, '0')}`;
  return HISTORICAL_EVENTS[key] || [];
}

/**
 * Get a random event from nearby weeks if exact week has no events
 * @param {number} year - The year
 * @param {number} week - The week number (1-52)
 * @param {number} range - How many weeks to search in each direction
 * @returns {Object|null} Event object or null
 */
export function getEventNearWeek(year, week, range = 4) {
  // First try exact week
  let events = getEventsForWeek(year, week);
  if (events.length > 0) {
    return events[Math.floor(Math.random() * events.length)];
  }

  // Search nearby weeks
  for (let offset = 1; offset <= range; offset++) {
    // Check week before
    let checkWeek = week - offset;
    let checkYear = year;
    if (checkWeek < 1) {
      checkWeek += 52;
      checkYear--;
    }
    events = getEventsForWeek(checkYear, checkWeek);
    if (events.length > 0) {
      return events[Math.floor(Math.random() * events.length)];
    }

    // Check week after
    checkWeek = week + offset;
    checkYear = year;
    if (checkWeek > 52) {
      checkWeek -= 52;
      checkYear++;
    }
    events = getEventsForWeek(checkYear, checkWeek);
    if (events.length > 0) {
      return events[Math.floor(Math.random() * events.length)];
    }
  }

  // No events found in range, try same week in nearby years
  for (let yearOffset = 1; yearOffset <= 5; yearOffset++) {
    events = getEventsForWeek(year - yearOffset, week);
    if (events.length > 0) {
      return events[Math.floor(Math.random() * events.length)];
    }
    events = getEventsForWeek(year + yearOffset, week);
    if (events.length > 0) {
      return events[Math.floor(Math.random() * events.length)];
    }
  }

  return null;
}

/**
 * Get all events for a year
 * @param {number} year - The year
 * @returns {Array} Array of event objects with week info
 */
export function getEventsForYear(year) {
  const events = [];
  for (let week = 1; week <= 52; week++) {
    const weekEvents = getEventsForWeek(year, week);
    for (const event of weekEvents) {
      events.push({ ...event, week });
    }
  }
  return events;
}

/**
 * Get category color for theming
 * @param {string} category - Event category
 * @returns {string} Color name for the category
 */
export function getCategoryColor(category) {
  const colors = {
    politics: 'blue',
    world: 'red',
    sports: 'green',
    culture: 'magenta',
    technology: 'cyan',
    science: 'cyan',
    economy: 'yellow',
    disaster: 'red',
    crime: 'red',
    society: 'blue'
  };
  return colors[category] || 'white';
}

/**
 * Get category icon/prefix
 * @param {string} category - Event category
 * @returns {string} Icon/prefix for the category
 */
export function getCategoryPrefix(category) {
  const prefixes = {
    politics: 'POLITICS',
    world: 'WORLD',
    sports: 'SPORTS',
    culture: 'CULTURE',
    technology: 'TECH',
    science: 'SCIENCE',
    economy: 'ECONOMY',
    disaster: 'BREAKING',
    crime: 'CRIME',
    society: 'SOCIETY'
  };
  return prefixes[category] || 'NEWS';
}

export default HISTORICAL_EVENTS;
