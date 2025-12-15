O: Reduce churn in teams scaling from 30 to 50+ employees
  Supporting Data: 47% churn rate for teams 50+ employees
  Supporting Data: Average customer lifetime: 14 months (hits wall at scaling point)
  Supporting Data: 78% retention overall but sharp drop at 30-50 employee threshold
  OP: Complexity-Scale Mismatch
    Evidence: 73.5% of Reddit pain points relate to scaling. "Affordable tools aimed at small teams don't scale functionally or pricing-wise, while feature-rich tools are too complex or too expensive"
    "Affordable tools don't scale, scalable tools are too complex"
    SU: Teams outgrow basic features but don't need full enterprise complexity
      Evidence: "FlowCraft was perfect when we were 15 people... once we hit 35 and split into 3 squads, I had no idea what was happening" (churned customer interview)
      Problem: Simple kanban works at 15 people, breaks at 35. But enterprise tools require 2 weeks training + dedicated admin.
      S: Adaptive UI with Progressive Disclosure
        "Auto-hide advanced features until team hits size/usage thresholds. At 5-15 people: simple kanban. At 30+: dependencies, portfolio views, advanced filters auto-reveal. User override available."
      S: Lightweight Enterprise Features
        ""Enterprise-lite" versions: approval workflows (3-step max), custom fields (5 max), team hierarchies (2 levels) - power without bloat."
    SU: Feature discovery is overwhelming when everything activates at once
      Evidence: "Tools that are too complex/enterprise require extensive training" (Reddit recurring theme)
      Problem: Teams don't know which features they need at their scale. Analysis paralysis or feature bloat.
      S: Scale-Triggered Feature Recommendations
        "When team crosses 25, 40, 75 users, system suggests relevant features with 1-click setup: "Your team is growing - enable sprint planning?" Pre-configured templates based on team size."
    SU: Different roles need different complexity levels
      Evidence: "Individual contributors need simple views, leaders need aggregated data" (multiple Reddit posts about role confusion)
      Problem: Developers overwhelmed by exec dashboards. Execs can't find high-level views. Everyone sees everything.
      S: Role-Based Complexity Levels
        "Individual contributors: simple task lists. Team leads: team dashboards. Executives: portfolio rollups. Same data, appropriate lens per role. Auto-configured by role."
    SU: Initial setup doesn't account for team maturity
      Evidence: "Decision paralysis caused by extreme flexibility - user cannot determine correct information model" (Reddit Notion users at scale)
      Problem: Onboarding treats 10-person team same as 40-person team. Wrong defaults lead to immediate friction or future rework.
      S: Start Simple, Scale Smart Onboarding Paths
        "During setup: "How many people?" → 5-15 gets minimal config. 30-50 gets team structure, dependencies, reporting enabled by default. Pre-configured for growth."
  OP: Missing Cross-Team Visibility
    Evidence: "I had no idea what was actually happening... couldn't see dependencies between teams" (churned customer)
    Evidence: "Engineering blocked by Design on 3 items - surfaces issues without meetings" (Reddit)
    "Can't see what's happening across teams"
    SU: Teams can't identify which work blocks other teams
      Evidence: "Couldn't see dependencies between teams, couldn't tell if we were on track for the roadmap" (VP Product, churned)
      Problem: Dependencies between squads are invisible until someone asks. Critical path unknown. Blockers discovered in crisis.
      S: Cross-Team Dependency Map
        "Visual graph showing which team's work blocks another. Auto-detects linked tasks across boards. Highlights critical path and bottlenecks. Real-time updates."
    SU: Status reporting is manual and time-consuming
      Evidence: "I spent 4 hours every Monday manually building a status report from screenshots" (Head of Product, churned)
      Problem: PMs spend 3-5 hours weekly building exec reports from scattered data. Copy-paste from multiple boards into slides.
      S: Automatic Executive Briefing
        "Every Monday AM, generates 1-page status: top risks, blocked items, on-track/at-risk projects by team. Zero manual work. Shareable link or auto-posts to Slack."
    SU: Leaders can't assess overall health at a glance
      Evidence: "Couldn't give my CEO a straight answer about delivery dates" (churned customer)
      Problem: Executives ask "Are we on track?" and get no straight answer. Have to drill into 5 boards, talk to 3 leads, make judgment call.
      S: Portfolio Health Dashboard
        "Single view of all teams: capacity utilization, sprint velocity trends, overdue count, at-risk milestones. Traffic light indicators. Executive-ready in 5 seconds."
    SU: Resource conflicts across teams are invisible
      Evidence: Reddit: "Resource leveling" and "capacity conflict alerts" repeatedly mentioned as scaling needs
      Problem: Person X assigned to 3 teams simultaneously. Overlapping deadlines. No warning until someone burns out or misses deadline.
      S: Multi-Team Gantt with Resource Conflicts
        "All teams' timelines in one view. Auto-highlight when person over-allocated or deadlines conflict across dependent work. Visual warnings before crisis."
  OP: Workflow/Process Rigidity
    Evidence: "Every time I tried to add structure, it felt like I was fighting the tool... we spent more time maintaining workarounds than doing actual work" (Eng Manager, churned)
    "Tool doesn't flex as our process matures"
    SU: Can't customize workflows per team type
      Evidence: "QA team needed a different workflow than engineering, but we couldn't customize it per team" (churned customer)
      Problem: Engineering needs different stages than QA. Design needs different than Customer Success. One-size-fits-all breaks at scale.
      S: Per-Team Custom Workflows
        "Engineering: "Backlog → Dev → Review → Done". QA: "New → Reproduce → Fix Verified → Closed". Same workspace, different processes. Drag-drop workflow builder."
    SU: Can't enforce process standards without manual policing
      Evidence: Reddit: "Lack of structured artifacts that require early input... heavyweight retroactive governance managed as checkbox work"
      Problem: "Code review required" is just a guideline. Tasks move to Done without PR links. Manual nagging by leads.
      S: Smart Required Fields by Stage
        "Define rules: "Moving to 'In Review' requires PR link + test results." Task can't transition without them. Per-workflow config. Standards enforced automatically."
      S: Approval Gates with Escalation
        "Designate approvers per stage. Auto-notify. If not approved in 48hrs, escalates to manager. Audit trail built-in. Compliance-ready without micromanagement."
    SU: Task ownership unclear at scale
      Evidence: "Tasks would sit in 'In Progress' for weeks with no updates... nobody knew who owned it" (VP Eng, churned)
      Problem: With 12 people, you yell across room. With 50, tasks sit unowned. "Who's doing this?" is asked daily.
      S: Ownership Enforcement Rules
        "Require owner before tasks move to "Ready to Start". Auto-assign based on skills/capacity. Flag unowned tasks >24hrs old. No orphaned work."
      S: Stale Task Auto-Nudges
        "Task in "In Progress" >5 days, no updates → auto-DM owner: "Is this blocked?" No response in 24hrs → notify team lead. Configurable thresholds."
    SU: Role-based access and views missing
      Evidence: Reddit: "Role-specific dashboards and lightweight permissions plus activity transparency" needed for scaling
      Problem: Junior dev can accidentally complete exec-level tasks. Everyone sees everything. Information overload + permission chaos.
      S: Role-Based Board Views & Permissions
        "Developers: "My Active Tasks". Leads: "Team Capacity". Executives: "Milestone Progress". Same board, filtered views. Restrict edit/complete permissions by role."
  OP: Reporting/Analytics Gaps
    Evidence: "No simple, integrated roadmapping... add-ons are too messy/complex... PMs revert to MS Project or Excel" (Reddit recurring pattern)
    "Can't get the data leaders need"
    SU: No integrated roadmapping - forced to use external tools
      Evidence: "Lack of usable roadmapping in Jira... fallback to MS Project or Excel for roadmaps" (PM at large tech, Reddit)
      Problem: Executives want timeline with themes/milestones. Tool only shows tasks. So PMs maintain parallel roadmap in PowerPoint/Excel.
      S: Native Roadmap Builder
        "Timeline view: themes/initiatives → epics → tasks. Drag to adjust dates. Auto-updates from task progress. Export to PowerPoint/PDF for exec reviews. No external tools needed."
    SU: Can't plan or visualize resource allocation
      Evidence: Reddit repeatedly mentions "resource planning," "capacity utilization," "allocation visibility" as scaling pain
      Problem: Who's overloaded? Who has capacity? Guesswork until someone complains or burns out.
      S: Capacity & Resource Planning View
        "Team member workload by week. Forecast over-allocation. Rebalance with drag-drop. Integrates with time tracking or estimates. Prevents burnout, optimizes delivery."
    SU: Can't forecast delivery with confidence
      Evidence: "Couldn't give straight answer about delivery dates" (churned customer), need for "forecasting" mentioned in Reddit analytics gaps
      Problem: Stakeholders ask "When will this ship?" Answer: "Umm... June? Maybe?" No data-driven estimates.
      S: Predictive Delivery Forecasting
        "Based on team velocity + current backlog: "70% confidence Q2, 90% Q3." Monte Carlo simulation. Updates as work progresses. Data-driven commitments."
    SU: Leaders need custom metrics but dashboards are rigid
      Evidence: Reddit: "Custom metrics dashboard," "configurable KPIs," "per-team analytics" needed at scale
      Problem: CEO cares about feature adoption. CTO cares about cycle time. Each builds custom spreadsheet from exports.
      S: Custom Metrics Dashboard Builder
        "Drag-drop widgets: cycle time, throughput, bug rate, feature adoption. Per-team or company-wide. Save templates. Auto-refresh. Export to Slack/email weekly."
    SU: Can't differentiate "behind schedule" from "scope changed"
      Evidence: Reddit: "Transparency for stakeholders," need to "tie feedback themes to roadmap impact"
      Problem: Burndown shows team off-track. But is it slow execution or stakeholders adding work? Blame game ensues.
      S: Burndown Charts with Scope-Change Detection
        "Classic burndown + overlay showing when scope added. Answers: "Are we behind, or did requirements change?" Transparency, accountability, realistic expectations."
  OP: Knowledge/Onboarding Breakdown
    Evidence: "Automated way to transform raw content into structured, queryable documentation" (Reddit)
    Evidence: "What worked with 10 people breaks at 30"
    "Tribal knowledge doesn't scale"
    SU: Process knowledge exists only in people's heads
      Evidence: Reddit: "Unstructured knowledge capture... needs automated way to transform into documentation"
      Problem: "How do we deploy?" "Ask Sarah." Sarah's on vacation. Deploy delayed. No written process.
      S: Auto-Generated Process Documentation
        "Watches how teams use workflows for 30 days. Generates docs: "Engineering moves tasks through 5 stages, averaging 8 days in Review." Editable wiki. Tribal knowledge → written playbook."
    SU: New hires don't know how things work
      Evidence: "Onboarding friction for non-technical users," "guided setup" needed (Reddit recurring)
      Problem: Day 1: "What do I do?" No structured onboarding. Shadow someone, hope for best. 2 weeks to productivity.
      S: Smart Onboarding Checklists
        "New hire assigned → auto-creates role-based checklist: "Set up dev environment, complete first ticket, shadow sprint planning." Tracks completion. Structured ramp-up."
    SU: Repeated work has no templates or checklists
      Evidence: Reddit: "Templates," "recurring workflows," "checklist-style progress tracking" mentioned as needs
      Problem: Every production deploy is re-invented. 12 steps. Someone forgets one. Incident ensues.
      S: Contextual Task Templates with History
        "Save templates with pre-filled fields, subtasks, acceptance criteria. "Deploy to Production" = 12-step checklist from past deploys. Clone with 1 click. Repeatability at scale."
    SU: Documentation is disconnected from actual work
      Evidence: Reddit: "Built-in wiki with task linking," "knowledge attached to work"
      Problem: Wiki exists. No one updates it. No one reads it. Tasks have no context. "Where's the doc for this?" "Dunno."
      S: Built-In Wiki with Task Linking
        "Every project has wiki. Link tasks to relevant docs. Auto-suggest related pages when creating similar tasks. Knowledge lives where work happens."
    SU: Meeting decisions get lost
      Evidence: Reddit: "Convert discussions into actionable tasks," "meeting notes to action items"
      Problem: 1-hour planning meeting. 8 decisions made. No one creates tasks. Week later: "Wait, what did we decide?"
      S: Meeting Notes → Action Items Converter
        "Paste meeting notes. AI extracts action items, owners, deadlines. Creates tasks with one approval. Links back to notes. Decisions → execution."