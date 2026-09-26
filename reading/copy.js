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

  links: {
    youtube: { age13: 'Search YouTube', adult: 'Search YouTube' },
    newTab: { age13: 'opens in a new tab', adult: 'opens in a new tab' },
  },

  headings: {
    whatToListenFor: { age13: 'What to listen for', adult: 'What to listen for' },
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
    demoLater: {
      age13: 'There is a playable demo for this. It arrives with the audio engine.',
      adult: 'A playable demo is defined for this edge and arrives with the audio engine (M4).',
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
