// Interface text for the reading surface, written in registers under the
// same rules as the data (CLAUDE.md "Writing rules"): the registers change
// vocabulary and sentence length, never which facts are present.
//
// These objects count toward the register-availability test in
// registers.js (A76). A register the interface cannot speak is not offered,
// so the Kid pass has to reach this file too before Kid appears.

export const COPY = {
  // SPEC.md "Confidence tiers as curriculum". The difference between these
  // three is one of the things the project exists to teach.
  tiers: {
    documented: {
      name: { age13: 'Documented', adult: 'Documented' },
      explain: {
        age13: 'Someone involved said so on the record, in an interview, a credit, a liner note, or a court case.',
        adult: 'Attested on the record by a participant or a primary document: an interview, a credit, a liner note, or a lawsuit.',
      },
    },
    consensus: {
      name: { age13: 'Consensus', adult: 'Consensus' },
      explain: {
        age13: 'Historians and critics mostly agree this happened, but nobody involved spelled it out.',
        adult: 'Broad agreement among historians and critics, without a primary statement from anyone involved.',
      },
    },
    asserted: {
      name: { age13: 'Our reading', adult: 'Asserted' },
      explain: {
        age13: 'This is our own reading. We hear a likeness, but nobody has shown that one led to the other.',
        adult: 'Our interpretation. A resemblance we are pointing out, not a line of transmission anyone has documented.',
      },
    },
  },

  // The permanent confidence legend (SPEC.md, docs/m3-architecture.md
  // section 5) and the version stamp beneath it (A20).
  legend: {
    title: { age13: 'How sure are we?', adult: 'Confidence' },
    intro: {
      age13: 'Every line on the map is a claim that one thing changed another. How the line is drawn shows how sure we are.',
      adult: 'Every edge is a claim of influence. Its stroke shows the strength of the evidence behind it.',
    },
    close: { age13: 'Hide this', adult: 'Hide the confidence key' },
    reopen: { age13: 'Show how sure we are', adult: 'Show the confidence key' },
    version: { age13: 'Map version', adult: 'Dataset version' },
    updated: { age13: 'last updated', adult: 'last updated' },
  },

  search: {
    label: { age13: 'Search the map', adult: 'Search the map' },
    placeholder: {
      age13: 'Find a name, a city, or a year',
      adult: 'Search names, places, years',
    },
    none: {
      age13: 'Nothing on the map matches that yet.',
      adult: 'No matches on the map yet.',
    },
    goToYear: { age13: 'Go to', adult: 'Go to' },
    names: { age13: 'Names', adult: 'Names' },
    from: { age13: 'From', adult: 'From' },
  },

  // The first-run card (reading/welcome.js). Every door and the goal point
  // at records already on the map, and the text only says what those
  // records say.
  // Lenses (reading/lens.js). Each intro says what its tag covers, in the
  // words the tag is used with in data/SCHEMA.md.
  // The control dock's buttons (reading/dock.js). Each names its row.
  dock: {
    label: { age13: 'Map controls', adult: 'Map controls' },
    show: { age13: 'Show', adult: 'Layers' },
    read: { age13: 'Reading level', adult: 'Reading level' },
    arrange: { age13: 'Arrange by', adult: 'Arrange by' },
    spotlight: { age13: 'Spotlight', adult: 'Spotlight' },
    changed: { age13: 'changed from the start', adult: 'not the default' },
  },

  // "Spotlight" to the reader (Q42): "lens" is the code's name for it.
  lenses: {
    caption: { age13: 'Spotlight', adult: 'Spotlight' },
    none: { age13: 'None', adult: 'None' },
    of: { age13: 'of', adult: 'of' },
    connections: { age13: 'connections are lit', adult: 'edges lit' },
    howTo: {
      age13: 'Lit lines stay bright and the rest go quiet. Click any lit line to read it. Choose None to see everything again.',
      adult: 'Tagged edges stay lit and the rest go quiet. Choose None to clear the spotlight.',
    },
    clear: { age13: 'Turn the spotlight off', adult: 'Clear the spotlight' },
    production: {
      name: { age13: 'Production', adult: 'Production' },
      intro: {
        age13: 'Lights the connections made in the studio: producers, engineers, and the way a record was put together.',
        adult: 'Influence carried by studio practice: production credits, engineering, and the techniques of putting a record together.',
      },
    },
    labels: {
      name: { age13: 'Labels', adult: 'Labels' },
      intro: {
        age13: 'Lights the connections that ran through record labels: who put out whose records, and which labels built a sound. Try it with Arrange by label.',
        adult: 'Influence carried by labels and the business of releasing records. Pairs with Arrange by label, which lays the map out by roster.',
      },
    },
    politics: {
      name: { age13: 'Politics', adult: 'Politics' },
      intro: {
        age13: 'Lights the connections where politics is part of the story. There are only a few so far. That is a gap in this map, not a sign that politics did not matter to the music.',
        adult: 'Edges where politics is part of the causal story. Few are tagged so far, which reflects how far the map has got, not the history itself.',
      },
    },
    technology: {
      name: { age13: 'Technology', adult: 'Technology' },
      intro: {
        age13: 'Lights the connections made by machines: drum machines, samplers, effects, and what people did with them.',
        adult: 'Influence carried by instruments and equipment, often used in ways their makers did not intend.',
      },
    },
  },

  // The thread player (reading/threads.js).
  // Six Degrees of Weird Al (reading/sixDegrees.js). Names and numbers are
  // joined on in code, so each string is a whole phrase on its own.
  sixDegrees: {
    kicker: { age13: 'Six Degrees of Weird Al', adult: 'Six Degrees of Weird Al' },
    doorTitle: { age13: 'Six Degrees of Weird Al', adult: 'Six Degrees of Weird Al' },
    doorLine: {
      age13: 'Get from a random artist to "Weird Al" Yankovic in six hops or fewer.',
      adult: 'A route-finding game: any artist to "Weird Al" Yankovic in six hops or fewer.',
    },
    startHere: { age13: 'Six Degrees of Weird Al from here', adult: 'Play Six Degrees from here' },
    intro: {
      age13: 'Each hop follows one connection on the map: a cover, a sample, a producer, a scene they both belonged to. Pick where to go next. Six hops or fewer wins.',
      adult: 'Each hop follows one connection: any edge in either direction, or a shared scene. Reach him in six or fewer.',
    },
    hopsLabel: { age13: 'Hops', adult: 'Hops' },
    hopsWord: { age13: 'hops', adult: 'hops' },
    overLimit: { age13: 'past six, but keep going', adult: 'over the limit; carry on' },
    youAreAt: { age13: 'You are at', adult: 'Now at' },
    readStop: { age13: 'Read about them', adult: 'Open this record' },
    readLink: { age13: 'How you got here', adult: 'Read the link you just took' },
    whereNext: { age13: 'Where next?', adult: 'Connections' },
    sceneLink: { age13: 'Same scene', adult: 'Scene membership' },
    showRoute: { age13: 'Show me a route', adult: 'Show a shortest route' },
    routeHeading: { age13: 'One shortest way from here', adult: 'A shortest route from here' },
    newStart: { age13: 'New game', adult: 'New start' },
    sameStart: { age13: 'Try the same start again', adult: 'Replay this start' },
    won: { age13: 'You reached Weird Al!', adult: 'Reached' },
    onPar: { age13: 'That is the shortest route there is.', adult: 'That matches the shortest route.' },
    shortestWas: { age13: 'The shortest route possible was', adult: 'Shortest possible:' },
    yourRoute: { age13: 'Your route', adult: 'Route taken' },
    isTarget: { age13: 'This is Weird Al himself. Start from someone else!', adult: 'This is the target. Choose another start.' },
    isAway: { age13: 'is', adult: 'is' },
    tooFar: {
      age13: 'hops from Weird Al on the map so far, more than six. The map is still growing. Try a closer start.',
      adult: 'hops from the target on the current map, beyond the limit. Try another start.',
    },
    noRoute: {
      age13: 'has no route to Weird Al on the map yet. The map is still growing.',
      adult: 'has no route to the target on the current map.',
    },
    chip: { age13: 'Six Degrees', adult: 'Six Degrees' },
    backTo: { age13: 'Back to your game', adult: 'Return to the game' },
    end: { age13: 'Stop playing', adult: 'End the game' },
  },

  threads: {
    kicker: { age13: 'A thread', adult: 'Thread' },
    listHeading: { age13: 'Follow a thread', adult: 'Threads' },
    listLine: {
      age13: 'A thread walks you through the map one stop at a time.',
      adult: 'Guided routes through the map, a few stops each.',
    },
    stops: { age13: 'stops', adult: 'stops' },
    stop: { age13: 'Stop', adult: 'Stop' },
    of: { age13: 'of', adult: 'of' },
    start: { age13: 'Start', adult: 'Begin' },
    next: { age13: 'Next', adult: 'Next' },
    previous: { age13: 'Previous', adult: 'Previous' },
    finish: { age13: 'Finish', adult: 'Finish' },
    again: { age13: 'Start again', adult: 'Start again' },
    finished: { age13: 'finished', adult: 'finished' },
    more: { age13: 'More threads', adult: 'Other threads' },
    backTo: { age13: 'Back to the thread', adult: 'Return to thread' },
    end: { age13: 'End the thread', adult: 'End thread' },
    ended: { age13: 'The end of the thread', adult: 'End of thread' },
    partOf: { age13: 'Part of a thread', adult: 'In a thread' },
    searchGroup: { age13: 'Threads', adult: 'Threads' },
  },

  welcome: {
    kicker: { age13: 'Start here', adult: 'Start here' },
    title: { age13: 'Where do you want to start?', adult: 'Three ways in' },
    intro: {
      age13: 'Every dot is an artist, a machine or a label, placed at the year it started. Every line says one of them changed another.',
      adult: 'Dots are artists, machines and labels, placed by the year they began. Lines are claims of influence.',
    },
    doors: {
      herc: {
        title: { age13: 'Where did hip-hop start?', adult: 'The break as a unit' },
        line: {
          age13: 'A party in the Bronx in August 1973, and a DJ who played the drums twice.',
          adult: 'DJ Kool Herc, 1520 Sedgwick Avenue, August 1973.',
        },
      },
      machine: {
        title: { age13: 'The machine nobody wanted', adult: 'The Roland TR-808' },
        line: {
          age13: 'A drum machine that flopped, got cheap, and landed with the right people.',
          adult: 'How a commercial failure became cheap enough to reshape several genres.',
        },
      },
      tubby: {
        title: { age13: 'Who turned records into raw material?', adult: "King Tubby's desk" },
        line: {
          age13: 'A radio repairman in Kingston who rewired his own mixing desk.',
          adult: 'Dub, version sides, and a modified MCI board in Waterhouse, Kingston.',
        },
      },
    },
    goalHeading: { age13: 'Your mission', adult: 'One to find' },
    progress: { age13: 'Mission', adult: 'Mission' },
    foundHeading: { age13: 'Found so far', adult: 'Found' },
    allFound: {
      age13: 'You found them all. There are dozens more crossings like these: look for lines that change colour as they go, because those join two different kinds of music.',
      adult: 'All found. Lines that change colour along their length are crossings between lineages, and the map has dozens more.',
    },
    // One entry per mission in reading/welcome.js. `title` names the
    // crossing once found; `goal` sits on the card, `chip` under the
    // search, and `found` shows for a moment when the reader gets there.
    missions: {
      planetRock: {
        title: { age13: "'Planet Rock', 1982", adult: "'Planet Rock', 1982" },
        goal: {
          age13: 'Find the 1982 record that joins a German band, a Bronx DJ and a Japanese drum machine.',
          adult: 'Find the 1982 record where Düsseldorf, the Bronx and a Roland drum machine meet.',
        },
        chip: {
          age13: 'Mission: find the 1982 record that joins Germany, the Bronx and a drum machine',
          adult: 'To find: the 1982 record where Düsseldorf meets the Bronx',
        },
        found: {
          age13: 'Found it. Three sources welded into one record. There are crossings like this all over the map.',
          adult: 'Found. This is the densest crossing on the map, and not the only one.',
        },
      },
      stylophone: {
        title: { age13: "'Space Oddity' and a toy", adult: "'Space Oddity' and the Stylophone" },
        goal: {
          age13: 'Find the toy, played with a metal pen, that a 1969 hit was written around.',
          adult: 'Find the toy synthesiser a 1969 hit was written around.',
        },
        chip: {
          age13: 'Mission: find the toy a 1969 hit was written around',
          adult: 'To find: the toy behind a 1969 hit',
        },
        found: {
          age13: "Found it. Bowie wrote 'Space Oddity' around a Stylophone, a children's gadget.",
          adult: 'Found. A single-voice toy, used as itself rather than disguised.',
        },
      },
      amen: {
        title: { age13: 'The Amen break', adult: 'The Amen break' },
        goal: {
          age13: 'Find six seconds of drumming from 1969 that ended up in Compton rap and then in British jungle.',
          adult: 'Find the 1969 drum break that runs from a soul record to Compton and then to British jungle.',
        },
        chip: {
          age13: 'Mission: find six seconds of 1969 drumming that crossed an ocean',
          adult: 'To find: the 1969 break behind Compton rap and British jungle',
        },
        found: {
          age13: "Found it. Gregory Coleman's drum solo on 'Amen, Brother'. The man who owned the song's rights never got paid.",
          adult: 'Found. One recording, retimed into the basis of a whole genre two decades later.',
        },
      },
      elpico: {
        title: { age13: 'A slashed speaker', adult: "'You Really Got Me' and a slashed speaker" },
        goal: {
          age13: 'Find the guitarist who cut up his own amplifier to make his guitar sound dirtier.',
          adult: 'Find the 1964 record whose distortion came from a deliberately damaged speaker.',
        },
        chip: {
          age13: 'Mission: find who cut up an amplifier to get a dirtier sound',
          adult: 'To find: the 1964 slashed speaker',
        },
        found: {
          age13: "Found it. Dave Davies cut the speaker, and 'You Really Got Me' got its buzz.",
          adult: 'Found. One amplifier, damaged once, on purpose.',
        },
      },
      slengTeng: {
        title: { age13: "'Under Mi Sleng Teng'", adult: "'Under Mi Sleng Teng' and the MT-40" },
        goal: {
          age13: 'Find the cheap keyboard setting that became the whole backing track of a 1985 reggae hit.',
          adult: 'Find the 1985 record that moved reggae toward fully computerised production.',
        },
        chip: {
          age13: 'Mission: find the keyboard setting that became a reggae hit',
          adult: 'To find: the preset that computerised reggae',
        },
        found: {
          age13: "Found it. A Casio MT-40's built-in 'rock' rhythm became 'Under Mi Sleng Teng'.",
          adult: "Found. A consumer keyboard's preset, and Prince Jammy's break from analogue technique.",
        },
      },
    },
    skip: { age13: 'Just let me explore', adult: 'Explore on my own' },
    golden: {
      heading: { age13: 'Golden threads', adult: 'Golden threads' },
      hint: {
        age13: 'A few lines on the map shimmer gold. They are the longest leaps here: one record reaching decades forward into a different kind of music. Open a gold line to collect it.',
        adult: 'Gold lines mark the longest documented leaps between lineages, measured from the earlier record to the later one. Open one to collect it.',
      },
      found: { age13: 'found', adult: 'found' },
      flash: { age13: 'Golden thread collected', adult: 'Golden thread collected' },
    },
  },

  // The demo block (reading/demoBlock.js), which carries the volume too.
  demo: {
    volume: { age13: 'Volume', adult: 'Volume' },
    heading: { age13: 'Try it', adult: 'Hear it' },
    play: { age13: 'Play', adult: 'Play' },
    stop: { age13: 'Stop', adult: 'Stop' },
    pads: { age13: 'Hit one', adult: 'Single hits' },
    keys: { age13: 'Play it yourself', adult: 'Keyboard' },
    version: { age13: 'Switch between', adult: 'Compare' },
    synthesized: {
      age13: 'Made live in your browser. This is not a recording.',
      adult: 'Synthesized in the browser, not a recording.',
    },
    draft: {
      age13: 'A demo for this is being built.',
      adult: 'A demo for this is planned and not playable yet.',
    },
    failed: {
      age13: 'Sound could not start in this browser.',
      adult: 'Audio could not start in this browser.',
    },
  },
  links: {
    youtube: { age13: 'Search YouTube', adult: 'Search YouTube' },
    newTab: { age13: 'opens in a new tab', adult: 'opens in a new tab' },
  },

  // Cards, the phone version (docs/cards-architecture.md).
  cards: {
    connectionOne: { age13: 'connection', adult: 'connection' },
    connectionMany: { age13: 'connections', adult: 'connections' },
    back: { age13: 'Back', adult: 'Back' },
    random: { age13: 'Random', adult: 'Random' },
    goTo: { age13: 'Go to', adult: 'Go to' },
    fullMap: { age13: 'Open the full map', adult: 'Open the full map' },
    toCards: { age13: 'Card view for phones', adult: 'Card view for phones' },
    loadFailed: {
      age13: 'This card did not load. Go back or try Random.',
      adult: 'This record failed to load. Go back or try Random.',
    },
  },
  headings: {
    whatToListenFor: { age13: 'What to listen for', adult: 'What to listen for' },
    followProducer: { age13: 'Show everyone they produced', adult: 'Show every production on the map' },
    howWeKnow: { age13: 'How we know', adult: 'How we know' },
    eitherEnd: { age13: 'Either end', adult: 'Either end' },
    changed: { age13: 'Changed', adult: 'Influenced' },
    changedBy: { age13: 'Changed by', adult: 'Influenced by' },
    listenTo: { age13: 'Listen to', adult: 'Signature tracks' },
    scenes: { age13: 'Scenes', adult: 'Scenes' },
    labels: { age13: 'Labels', adult: 'Labels' },
    producers: { age13: 'Worked with', adult: 'Key producers' },
    members: { age13: 'Who was there', adult: 'Members on the map' },
    whatItWasFor: { age13: 'What it was sold for', adult: 'Original purpose' },
    whatHappened: { age13: 'What actually happened', adult: 'What actually happened' },
    whatItCost: { age13: 'What it cost', adult: 'Price history' },
    founders: { age13: 'Started by', adult: 'Founders' },
    ownership: { age13: 'Who owned it', adult: 'Ownership' },
    songsAboutLabel: { age13: 'Songs about the label', adult: 'Songs about the label' },
    geopolitics: { age13: 'The conditions', adult: 'The conditions' },
    whatWasNew: { age13: 'What was new', adult: 'What was new' },
    production: { age13: 'How it was made', adult: 'Production' },
    sceneLabels: { age13: 'Who paid', adult: 'Labels and money' },
    politics: { age13: 'What it argued', adult: 'Politics' },
    noConnections: {
      age13: 'Nothing on the map connects here yet.',
      adult: 'No edges touch this record yet.',
    },
    loading: {
      age13: 'Loading…',
      adult: 'Loading…',
    },
    loadFailed: {
      age13: 'This page did not load. Close it and try again.',
      adult: 'This record failed to load. Close the panel and try again.',
    },
    offMap: {
      age13: 'This one has no year yet, so it cannot be placed on the map.',
      adult: 'This record has no start year, so the time axis cannot place it.',
    },
  },
};

// Short structural labels. Single words and names, not prose, so they are
// not register objects.
export const KIND_LABELS = {
  artist: 'Artist',
  machine: 'Machine',
  scene: 'Scene',
  label: 'Label',
};

export const EDGE_TYPE_LABELS = {
  direct: 'Direct influence',
  production: 'Production',
  technological: 'Technology',
  label: 'Label',
  scene: 'Scene',
  sample: 'Sample',
  'reaction-against': 'Reaction against',
  rediscovery: 'Rediscovery',
  cover: 'Cover',
};

// Drum lane and control names in the demo block. Names, not prose.
export const LANE_LABELS = {
  bd: 'Kick', sd: 'Snare', lt: 'Low tom', mt: 'Mid tom', ht: 'High tom', rs: 'Rimshot',
  cp: 'Clap', cb: 'Cowbell', ch: 'Closed hat', oh: 'Open hat', cy: 'Cymbal', ma: 'Maracas',
  cc: 'Crash', rc: 'Ride',
};

export const CONTROL_LABELS = {
  level: 'level', tone: 'tone', decay: 'decay', snappy: 'snap', tune: 'tuning', attack: 'attack',
  cutoff: 'cutoff', resonance: 'resonance', envMod: 'envelope', accent: 'accent', feedback: 'repeats',
};

// Effect names in the demo block's control labels (audio/fx.js).
export const FX_LABELS = {
  'tape-echo': 'Echo',
};
