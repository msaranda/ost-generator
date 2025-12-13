# OST Text Format Specification

## Overview

The OST (Opportunity Solution Tree) text format uses prefixes and indentation to create a hierarchical structure. It supports rich metadata through special fields.

## Node Types and Prefixes

### Primary Prefixes (Shorthand)
- `O:` - Outcome (root node)
- `OP:` - Opportunity
- `S:` - Solution
- `SU:` - Sub-opportunity

### Alternative Prefixes (Full)
- `OUTCOME:` - Outcome (root node)
- `OPP:` - Opportunity
- `SOL:` - Solution
- `SUB:` - Sub-opportunity

## Indentation Rules

- Use **2 spaces** per indentation level
- Indentation must be a multiple of 2
- Each child node is indented one level (2 spaces) deeper than its parent

## Hierarchy Rules

Valid parent-child relationships:
- **Outcome** → Opportunity
- **Opportunity** → Solution OR Sub-opportunity
- **Sub-opportunity** → Solution
- **Solution** → Sub-opportunity (for solution alternatives)

## Metadata Fields

Metadata fields are added as continuation lines (indented more than the parent node). They use specific prefixes:

### Supported Metadata Fields

- `Evidence:` - Supporting evidence or data points
- `Problem:` - Detailed problem description
- `Supporting Data:` - Quantitative data and metrics
- `Impact:` - Expected impact or value
- `Effort:` - Implementation effort estimate

### Quoted Descriptions

Lines starting with quotes (`"..."`) are treated as descriptions/summaries:

```
OP: Missing Cross-Team Visibility
  "Can't see what's happening across teams"
```

### Multi-line Content

Content can span multiple lines by indenting them further than the node:

```
OP: Complexity-Scale Mismatch
  Evidence: 73.5% of Reddit pain points relate to scaling.
  "Affordable tools don't scale, scalable tools are too complex"
  Additional context can be added here.
```

## Full Example Structure

```
O: Reduce customer churn

  OP: Users struggle with feature discovery
    "Can't find the features they need"
    Evidence: 65% of churned users never used key features
    Supporting Data: Average feature adoption: 23%
    
    S: Guided onboarding flow
      Show interactive tutorials on first login
      
    S: Feature recommendation engine
      Suggest relevant features based on usage patterns
  
  OP: Performance issues at scale
    Problem: App becomes slow with 1000+ items
    Evidence: Support tickets spike at this threshold
    
    SU: Database queries not optimized
      Problem: N+1 queries causing slowdowns
      
      S: Implement query caching
        Redis-based caching layer
        
      S: Add database indexes
        Index frequently queried columns
```

## Formatting Guidelines

1. **Node Content**: Put the main content immediately after the prefix
2. **Blank Lines**: Use blank lines to separate major sections (optional)
3. **Metadata Order**: Place metadata fields right after the node, before children
4. **Consistency**: Use either shorthand OR full prefixes throughout (don't mix)

## Best Practices

- Keep node content concise and descriptive
- Use Evidence fields to support opportunities with data
- Use Problem fields for sub-opportunities to clarify specific issues
- Use quoted descriptions for customer voice/pain points
- Add Supporting Data to outcomes for measurable goals