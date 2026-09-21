# M1, session 2: build the data layer

Run after the architecture plan is approved.

---

Implement the plan in docs/m1-architecture.md. Still no UI code of any kind.

Scope for this session:

1. Create the sharded directory layout and the manifest.
2. Migrate data/seed.json into individual record files. The seed's content does
   not change. Not one word of prose is rewritten, reworded, or improved. It is
   the reference standard and altering it destroys its purpose. Keep the
   original file at data/seed.json as a frozen reference copy.
3. Write tools/validate.js. Stdlib only, no dependencies, runs from the command
   line, exits non-zero on failure.
4. Write tools/serve.js. Stdlib only, one command, serves the project for
   development.
5. Write tools/bundle.js. One command, inlines all JSON into a single module
   for offline release.
6. Write config.js with the CONFIG object. Populate it with whatever tuning
   values already exist. It stays empty of magic numbers from elsewhere.

Commit each of the six as its own commit.

When done, show me: the output of the validator on the migrated seed, the tree
of the data directory, and the exact commands for dev and release.

Then update ASSUMPTIONS.md and BACKLOG.md and stop.
