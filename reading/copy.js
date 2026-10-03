// Interface text for the reading surface, written under the same rules as
// the data (CLAUDE.md "Writing rules"): plain enough for the primary reader,
// without leaving a fact out.

export const COPY = {
  // SPEC.md "Confidence tiers as curriculum". The difference between these
  // three is one of the things the project exists to teach.
  tiers: {
    documented: {
      name: 'Documented',
      explain: 'Someone involved said so on the record, in an interview, a credit, a liner note, or a court case.',
    },
    consensus: {
      name: 'Consensus',
      explain: 'Historians and critics mostly agree this happened, but nobody involved spelled it out.',
    },
    asserted: {
      name: 'Our reading',
      explain: 'This is our own reading. We hear a likeness, but nobody has shown that one led to the other.',
    },
  },

  // The permanent confidence legend (SPEC.md, docs/m3-architecture.md
  // section 5) and the version stamp beneath it (A20).
  legend: {
    title: 'How sure are we?',
    intro: 'Every line on the map is a claim that one thing changed another. How the line is drawn shows how sure we are.',
    close: 'Hide this',
    reopen: 'Show how sure we are',
    version: 'Map version',
    updated: 'last updated',
  },

  search: {
    label: 'Search the map',
    placeholder: 'Find a name, a city, or a year',
    none: 'Nothing on the map matches that yet.',
    goToYear: 'Go to',
    names: 'Names',
    from: 'From',
  },

  // The first-run card (reading/welcome.js). Every door and the goal point
  // at records already on the map, and the text only says what those
  // records say.
  // The control dock's buttons (reading/dock.js). Each names its row.
  dock: {
    label: 'Map controls',
    show: 'Show',
    changed: 'changed from the start',
  },

  // An edge's overlay tags (data/SCHEMA.md, edge `tags`), named in its
  // panel under "Part of the story of". Each line says what the tag covers,
  // in the words the tag is used with in data/SCHEMA.md. The order here is
  // the order they are listed in.
  tags: {
    heading: 'Part of the story of',
    production: {
      name: 'Production',
      line: 'Made in the studio: producers, engineers, and the way a record was put together.',
    },
    labels: {
      name: 'Labels',
      line: 'Carried by record labels and the business of releasing records: who put out whose records, and which labels built a sound.',
    },
    politics: {
      name: 'Politics',
      line: 'Politics is part of why this happened. Few connections are tagged this way so far, which reflects how far the map has got, not how much politics mattered.',
    },
    technology: {
      name: 'Technology',
      line: 'Carried by machines: instruments, drum machines, samplers and effects, often used in ways their makers did not intend.',
    },
  },

  // The thread player (reading/threads.js).
  // Six Degrees of Weird Al (reading/sixDegrees.js). Names and numbers are
  // joined on in code, so each string is a whole phrase on its own.
  sixDegrees: {
    kicker: 'Six Degrees of Weird Al',
    doorTitle: 'Six Degrees of Weird Al',
    doorLine: 'Get from a random artist to "Weird Al" Yankovic in six hops or fewer.',
    startHere: 'Six Degrees of Weird Al from here',
    intro: 'Each hop follows one connection on the map: a cover, a sample, a producer, a scene they both belonged to. Pick where to go next. Six hops or fewer wins.',
    hopsLabel: 'Hops',
    hopsWord: 'hops',
    overLimit: 'past six, but keep going',
    youAreAt: 'You are at',
    readStop: 'Read about them',
    readLink: 'How you got here',
    whereNext: 'Where next?',
    sceneLink: 'Same scene',
    showRoute: 'Show me a route',
    routeHeading: 'One shortest way from here',
    newStart: 'New game',
    sameStart: 'Try the same start again',
    won: 'You reached Weird Al!',
    onPar: 'That is the shortest route there is.',
    shortestWas: 'The shortest route possible was',
    yourRoute: 'Your route',
    isTarget: 'This is Weird Al himself. Start from someone else!',
    isAway: 'is',
    tooFar: 'hops from Weird Al on the map so far, more than six. The map is still growing. Try a closer start.',
    noRoute: 'has no route to Weird Al on the map yet. The map is still growing.',
    chip: 'Six Degrees',
    backTo: 'Back to your game',
    end: 'Stop playing',
  },

  threads: {
    kicker: 'A thread',
    listHeading: 'Follow a thread',
    listLine: 'A thread walks you through the map one stop at a time.',
    stops: 'stops',
    stop: 'Stop',
    of: 'of',
    start: 'Start',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    again: 'Start again',
    finished: 'finished',
    more: 'More threads',
    backTo: 'Back to the thread',
    end: 'End the thread',
    ended: 'The end of the thread',
    partOf: 'Part of a thread',
    searchGroup: 'Threads',
  },

  welcome: {
    kicker: 'Start here',
    title: 'Where do you want to start?',
    intro: 'Every dot is an artist, a machine or a label, placed at the year it started. Every line says one of them changed another.',
    doors: {
      herc: {
        title: 'Where did hip-hop start?',
        line: 'A party at 1520 Sedgwick Avenue in the Bronx in August 1973, and a DJ who played the drums twice.',
      },
      machine: {
        title: 'The machine nobody wanted',
        line: 'A drum machine that flopped, got cheap, and landed with the right people.',
      },
      tubby: {
        title: 'Who turned records into raw material?',
        line: 'A radio repairman in Kingston who rewired his own mixing desk.',
      },
    },
    goalHeading: 'Your mission',
    progress: 'Mission',
    foundHeading: 'Found so far',
    allFound: 'You found them all. There are dozens more crossings like these: look for lines that change colour as they go, because those join two different kinds of music.',
    // One entry per mission in reading/welcome.js. `title` names the
    // crossing once found; `goal` sits on the card, `chip` under the
    // search, and `found` shows for a moment when the reader gets there.
    missions: {
      planetRock: {
        title: "'Planet Rock', 1982",
        goal: 'Find the 1982 record that joins a German band, a Bronx DJ and a Japanese drum machine.',
        chip: 'Mission: find the 1982 record that joins Germany, the Bronx and a drum machine',
        found: 'Found it. Three sources welded into one record, the busiest crossing on the map. There are crossings like this all over it.',
      },
      stylophone: {
        title: "'Space Oddity' and the Stylophone",
        goal: 'Find the toy, played with a metal pen, that a 1969 hit was written around.',
        chip: 'Mission: find the toy a 1969 hit was written around',
        found: "Found it. Bowie wrote 'Space Oddity' around a Stylophone, a children's gadget, and let it sound like exactly what it was.",
      },
      amen: {
        title: 'The Amen break',
        goal: 'Find six seconds of drumming from 1969 that ended up in Compton rap and then in British jungle.',
        chip: 'Mission: find six seconds of 1969 drumming that crossed an ocean',
        found: "Found it. Gregory Coleman's drum solo on 'Amen, Brother', retimed two decades later into the base of a whole genre. The man who owned the song's rights never got paid.",
      },
      elpico: {
        title: "'You Really Got Me' and a slashed speaker",
        goal: 'Find the guitarist who cut up his own amplifier to make his guitar sound dirtier.',
        chip: 'Mission: find who cut up an amplifier to get a dirtier sound',
        found: "Found it. Dave Davies cut the speaker on purpose, and 'You Really Got Me' got its buzz.",
      },
      slengTeng: {
        title: "'Under Mi Sleng Teng'",
        goal: 'Find the cheap keyboard setting that became the whole backing track of a 1985 reggae hit.',
        chip: 'Mission: find the keyboard setting that became a reggae hit',
        found: "Found it. A Casio MT-40's built-in 'rock' rhythm became 'Under Mi Sleng Teng', and Prince Jammy's break from making reggae by hand.",
      },
    },
    skip: 'Just let me explore',
    golden: {
      heading: 'Golden threads',
      hint: 'A few lines on the map shimmer gold. They are the longest documented leaps here, measured from the earlier record to the later one: one record reaching decades forward into a different kind of music. Open a gold line to collect it.',
      found: 'found',
      flash: 'Golden thread collected',
    },
  },

  // The demo block (reading/demoBlock.js), which carries the volume too.
  demo: {
    volume: 'Volume',
    heading: 'Try it',
    play: 'Play',
    stop: 'Stop',
    pads: 'Hit one',
    keys: 'Play it yourself',
    version: 'Switch between',
    synthesized: 'Made live in your browser. This is not a recording.',
    draft: 'A demo for this is being built.',
    failed: 'Sound could not start in this browser.',
  },
  links: {
    youtube: 'Search YouTube',
    newTab: 'opens in a new tab',
  },

  // Cards, the phone version (docs/cards-architecture.md).
  cards: {
    connectionOne: 'connection',
    connectionMany: 'connections',
    back: 'Back',
    random: 'Random',
    goTo: 'Go to',
    fullMap: 'Open the full map',
    toCards: 'Card view for phones',
    loadFailed: 'This card did not load. Go back or try Random.',
  },
  headings: {
    whatToListenFor: 'What to listen for',
    followProducer: 'Show everyone they produced',
    howWeKnow: 'How we know',
    eitherEnd: 'Either end',
    changed: 'Changed',
    changedBy: 'Changed by',
    listenTo: 'Listen to',
    scenes: 'Scenes',
    labels: 'Labels',
    producers: 'Worked with',
    members: 'Who was there',
    whatItWasFor: 'What it was sold for',
    whatHappened: 'What actually happened',
    whatItCost: 'What it cost',
    founders: 'Started by',
    ownership: 'Who owned it',
    songsAboutLabel: 'Songs about the label',
    geopolitics: 'The conditions',
    whatWasNew: 'What was new',
    production: 'How it was made',
    sceneLabels: 'Who paid',
    politics: 'What it argued',
    noConnections: 'Nothing on the map connects here yet.',
    loading: 'Loading…',
    loadFailed: 'This page did not load. Close it and try again.',
    offMap: 'This one has no year yet, so it cannot be placed on the map.',
  },
};

// Short structural labels: single words and names, not prose.
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
