# An architecture review of the core, and a proposal for Discovery and Build

Received 2026-11-17. Kept as it came, in short; not edited later.

A review of the core at 0.10.0, read from its files (not run, not a
penetration test), listing two hundred practices in twenty areas: the
architecture, extensions and kits, TypeScript, the API and its safety, files
and paths, the agents' permissions and how they work together, prompts and
their evaluation, working copies and branches, processes, the records'
database, discovery and traceability, tests, continuous integration,
releases and upgrades, reliability, the user experience, accessibility,
performance, and the docs.

It put first: a pipeline that runs the core's checks on every pull request;
the local API's safety (a size limit on requests; the page's header); the
agents' limits (rules in Claude Code, not a sandbox of the system); the
factory's commits that skip git hooks; the records' tables version; and
docs that still called some things "to come".

With it came a proposal: make Discovery (what to improve, and why: observe,
hypothesise, experiment, validate, learn) and Build (analyse, plan,
implement, verify, deliver) the core's two processes, joined by the
knowledge they share; keep a hypothesis apart from what was observed; treat
a prototype as an experiment only when it says beforehand what would show
it works; keep what was learnt even when the answer is no; and let work
reach Build by an explicit decision, not by the most picks.

What came of it: [the decision on Discovery and Build](../decisions/0001-discovery-and-build.md)
and [the security notes](../../SECURITY.md).
