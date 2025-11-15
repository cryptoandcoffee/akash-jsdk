# AGENTS.md - Multi-Agent Collaboration Guide

This document explains how multiple AI agents should collaborate on this Akash JSDK repository.

## Agent Roles and Responsibilities

### 🔬 Explorer Agent
**Purpose**: Understand the codebase structure, find files, answer architecture questions

**When to use**:
- "What packages are in this monorepo?"
- "Where is the deployment manager implemented?"
- "How does the SDK structure work?"
- "Find all files that import X"
- "What's the overall architecture?"

**What they have access to**:
- File system exploration tools (Glob, Grep, Read)
- Codebase search and pattern matching
- Should use "quick" thoroughness for simple questions, "very thorough" for complex architecture questions

**Deliverable**: Clear understanding of code locations, patterns, and architecture

---

### 🏗️ Architect Agent
**Purpose**: Design systems, plan refactorings, determine best practices

**When to use**:
- "How should we structure the release system?"
- "What's wrong with the current workflow?"
- "How should we fix dependency issues?"
- "Design a new validation system"
- "Analyze why this keeps failing"

**What they should do**:
1. Use Explorer agents to understand current state
2. Identify problems and root causes
3. Design solutions with clear tradeoffs
4. Create implementation plans with specific files to change
5. Document the reasoning

**Deliverable**: A detailed analysis and implementation plan with clear steps

---

### ⚙️ Implementation Agent
**Purpose**: Write code, execute changes, run tests

**When to use**:
- "Create validation-release.js script"
- "Update the workflow file"
- "Fix package.json versions"
- "Run tests to verify"
- Implement a design plan from Architect

**What they have access to**:
- All file manipulation tools (Read, Write, Edit)
- Bash/terminal tools for running commands
- Git operations
- Todo tracking to show progress

**Deliverable**: Working code changes, passing tests, clean commits

---

### 📝 Documentation Agent
**Purpose**: Write clear guides, documentation, troubleshooting

**When to use**:
- "Create CLAUDE.md for AI assistants"
- "Write AGENTS.md for multi-agent collaboration"
- "Document the release process"
- "Create troubleshooting guide"
- "Write API documentation"

**What they should do**:
1. Understand the system thoroughly
2. Write from the audience's perspective
3. Include examples and common mistakes
4. Structure for easy navigation
5. Keep it up to date

**Deliverable**: Clear, actionable documentation

---

### 🧪 Tester Agent
**Purpose**: Verify changes work correctly, run comprehensive tests

**When to use**:
- "Test that the new release system works"
- "Run the full test suite"
- "Verify the packages can be released"
- "Check that validation catches errors"
- "Integration testing"

**What they should do**:
1. Run tests locally first
2. Test both happy path and error cases
3. Verify git operations
4. Check npm publishing (dry-run)
5. Document any issues found

**Deliverable**: Test results, verification of working state

---

## Multi-Agent Workflows

### Workflow 1: Understanding a Problem

```
User: "Why does the release keep failing?"
  ↓
Explorer Agent → Examine git history, workflow files, error logs
  ↓
Architect Agent → Analyze root causes, design solution
  ↓
Documentation Agent → Document findings in CLAUDE.md
  ↓
User: Understands the problem and solution
```

### Workflow 2: Fixing a Release System

```
User: "Fix the broken release workflow"
  ↓
Architect Agent → Design new system with validation
  ↓
Implementation Agent → Create validate-release.js, update workflow
  ↓
Tester Agent → Test validation works correctly
  ↓
Documentation Agent → Update CLAUDE.md with new process
  ↓
Implementation Agent → Commit and push changes
  ↓
User: Has working release system
```

### Workflow 3: Adding a Feature

```
User: "Add JWT authentication feature"
  ↓
Explorer Agent → Find existing auth code, understand patterns
  ↓
Architect Agent → Design JWT implementation
  ↓
Implementation Agent → Write code changes
  ↓
Tester Agent → Run tests, verify functionality
  ↓
Implementation Agent → Commit changes
  ↓
Documentation Agent → Update README with new feature
  ↓
User: Has new feature, documented and tested
```

## Agent Communication Protocol

### Information Sharing

1. **Pass context** - When handing off between agents, include:
   - What was accomplished
   - What failed or is unclear
   - Current git state
   - Outstanding questions

2. **Use todo lists** - Track progress across agents:
   ```
   - [ ] Understand current state (Explorer)
   - [ ] Design solution (Architect)
   - [ ] Implement changes (Implementation)
   - [ ] Test thoroughly (Tester)
   - [ ] Document results (Documentation)
   ```

3. **Clear deliverables** - Each agent should state what they found/created

### Problem Escalation

If an agent finds an issue:

1. **Document it clearly** - What is the problem?
2. **Suggest a solution** - What could fix it?
3. **Mark as blocker** - Don't proceed if it blocks the work
4. **Ask for clarification** - If requirements are unclear

---

## Tool Usage Guide by Agent

### Explorer Agent Tools
- `Glob` - Find files by pattern
- `Grep` - Search code for keywords
- `Read` - Examine file contents
- `Task` (Explore) - Comprehensive codebase search

**Good for**:
- Finding where something is implemented
- Understanding code patterns
- Answering "how does X work?"
- "Where is Y defined?"

### Architect Agent Tools
- `Read` - Understand current implementation
- `Grep` - Search for related patterns
- `Task` (Explore) - Comprehensive analysis
- Pen and paper thinking!

**Good for**:
- Analyzing problems
- Designing solutions
- Planning changes
- Trade-off analysis

### Implementation Agent Tools
- `Read` - Before editing, always read first
- `Edit` - Make targeted changes
- `Write` - Create new files
- `Bash` - Run build/test/git commands
- `TodoWrite` - Track progress

**Good for**:
- Writing code
- Running commands
- Making commits
- Testing locally

### Tester Agent Tools
- `Bash` - Run tests and commands
- `Read` - Check test files
- `BashOutput` - Monitor long-running tests
- `TodoWrite` - Document test results

**Good for**:
- Running test suites
- Integration testing
- Verifying changes work
- Catching regressions

### Documentation Agent Tools
- `Read` - Understand the system
- `Write` - Create documentation
- `Edit` - Update existing docs
- `Grep` - Find examples to reference

**Good for**:
- Writing guides
- Creating troubleshooting docs
- Recording processes
- User-facing documentation

---

## Common Patterns

### Pattern: Parallel Exploration

When you need to understand multiple aspects in parallel:

```
User needs to understand:
1. Current release system
2. What went wrong
3. What should be built

→ Launch 3 Explorer agents in parallel with different searches
→ Merge findings
→ Pass to Architect for analysis
```

### Pattern: Sequential Implementation

Always follow this order:

```
1. Read existing code (understand before changing)
2. Make changes (targeted edits)
3. Run tests (verify it works)
4. Commit (record in git)
5. Document (update CLAUDE.md if needed)
```

### Pattern: Validation Loop

For critical changes (like release system):

```
1. Architect designs
2. Implementation builds
3. Tester verifies thoroughly
4. If issue found → back to Architect
5. If passes → deploy and document
```

---

## Coordination Rules

### 1. Always Have a Plan
Before implementing, have the Architect create a plan with:
- What files to change
- What to create
- What to remove
- Expected outcome

### 2. Read Before Editing
**Never edit without reading first** - you need to understand the current state

### 3. One Agent at a Time
- Don't have multiple Implementation agents editing the same file
- Use todo list to coordinate who's doing what
- Communicate state clearly

### 4. Test Changes
- Every code change should be tested
- Testing should be done by Tester agent or Implementation agent
- Document test results

### 5. Document as You Go
- Don't leave documentation for the end
- Update CLAUDE.md if you change how things work
- Keep AGENTS.md updated if you add new patterns

### 6. Clear Commit Messages
Each commit should be atomic and have a clear message:
```
git commit -m "type(scope): description

Detailed explanation if needed.
What problem does this solve?
How does it fix it?"
```

---

## Anti-Patterns to Avoid

### ❌ Don't: Make Large Unfocused Changes
```
Bad: 10 files changed in 1 commit with unclear purpose
Good: 3 focused commits, each with clear purpose
```

### ❌ Don't: Change Without Understanding
```
Bad: Update release.yml without knowing why it's broken
Good: Architect analyzes first, then Implementation fixes
```

### ❌ Don't: Skip Testing
```
Bad: Assume code works without running tests
Good: Tester verifies everything passes
```

### ❌ Don't: Forget Documentation
```
Bad: Change a process but don't update CLAUDE.md
Good: Update docs when you change how things work
```

### ❌ Don't: Parallel Edits to Same File
```
Bad: Two agents editing release.yml at same time
Good: Coordinate using todo list, one agent per file
```

---

## Quality Checklist

Before considering work "done":

- [ ] Code compiles/runs without errors
- [ ] All tests pass
- [ ] Changes are atomic and well-committed
- [ ] Commit messages are clear
- [ ] Documentation updated (CLAUDE.md, README, etc.)
- [ ] No merge conflicts
- [ ] Changes reviewed (if applicable)
- [ ] Can be safely shipped to production

---

## Example: Full Workflow

### Scenario: Fix Release System (Like We Did)

1. **User requests**: "Fix the release workflow - it keeps breaking"

2. **Explorer Agent** (parallel agents for each aspect):
   - Agent A: Examines .github/workflows/release.yml
   - Agent B: Looks at git history of version changes
   - Agent C: Checks changesets configuration and behavior
   - *Report back findings*

3. **Architect Agent**:
   - Analyzes reports from Explorer
   - Identifies root cause: Changesets incompatible with tightly-coupled monorepo
   - Designs new system: validation + direct publishing
   - Creates plan:
     - Remove .changeset/ directory
     - Create scripts/validate-release.js
     - Create scripts/publish-release.js
     - Update workflow to use manual trigger
     - Document in CLAUDE.md

4. **Implementation Agent**:
   - Executes plan from Architect
   - Creates validation script
   - Creates publish script
   - Updates workflow file
   - Updates package.json
   - Makes atomic commits with clear messages

5. **Tester Agent**:
   - Runs validate-release.js manually
   - Tests against various scenarios
   - Verifies dry-run publish works
   - Confirms git operations work
   - Documents test results

6. **Documentation Agent**:
   - Writes CLAUDE.md explaining new system
   - Creates troubleshooting guide
   - Documents the release process
   - Updates this file (AGENTS.md) if new patterns discovered

7. **User**: Has working system, documented and tested

---

## For New Agents

When you join a project:

1. **Read CLAUDE.md first** - Understand how this project works
2. **Read AGENTS.md** (this file) - Understand how to collaborate
3. **Read relevant package READMEs** - Understand the code
4. **Start with Explorer** - Don't make changes until you understand
5. **Communicate before acting** - Ask what needs doing
6. **Follow the patterns** - Use established workflows
7. **Document your work** - Help future agents understand

---

## Questions for Architects

Before an Implementation Agent starts, Architects should be able to answer:

- [ ] What problem are we solving?
- [ ] What files change and why?
- [ ] What gets created/deleted?
- [ ] How do we test it works?
- [ ] How do we know when it's done?
- [ ] What are the risks?
- [ ] How do we revert if needed?

---

**Remember**: Good multi-agent collaboration means clear communication, coordinated effort, and always knowing what each agent did last. 🤝
