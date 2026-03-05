# Coding Guidelines (Frontend — TypeScript)

> Adapted from team PR review conventions. React/MUI-specific rules removed; these apply to the game's TypeScript codebase.

---

## TypeScript

### No `any` — use `unknown` or specific types
Never use `any`. Use `unknown` for truly unknown types, or define proper types.

```ts
// Bad
catch (error: any) { ... }

// Good
catch (error: unknown) { ... }
```

### Use `type` over `interface`
Use `type` for type definitions. Only use `interface` when declaration merging is needed.

```ts
// Bad
interface PlayerState { ... }

// Good
type PlayerState = { ... };
```

### Type names must be PascalCase
```ts
// Bad
type entityType = "knight" | "mage" | "cleric" | "ranger";

// Good
type EntityType = "knight" | "mage" | "cleric" | "ranger";
```

### Prefer `Type[]` over `Array<Type>`
```ts
// Bad
entities: Array<Entity>;

// Good
entities: Entity[];
```

### Leverage utility types to avoid duplication
Use `Partial`, `Pick`, `Omit`, `Record`, etc. instead of duplicating type definitions.

### Use `import type` for type-only imports
```ts
import type { Position, Velocity } from "./components";
```

### Avoid type casts (`as Type`)
Use type narrowing (type guards, generics, conditional checks) instead. Casts hide nullability and type errors.

### Required parameters first, optional parameters last
```ts
// Bad
const spawnEnemy = (difficulty = 1, entityId: number, position: Position) => { ... };

// Good
const spawnEnemy = (entityId: number, position: Position, difficulty = 1) => { ... };
```

---

## Naming Conventions

### Functions and methods: `verbNoun`
```ts
// Bad
const enemyPosition = () => { ... };

// Good
const getEnemyPosition = () => { ... };
```

### Event handler callbacks start with `on`, handler functions start with `handle`
```ts
// Callback type
type Props = {
    onDamage: (entityId: number, amount: number) => void;
};

// Internal handler
const handleCollision = () => { ... };
```

### No single-letter variable names
Use descriptive names.

```ts
// Bad
entities.filter((e) => e.health > 0);

// Good
entities.filter((entity) => entity.health > 0);
```

### Avoid generic names like `data`, `result`, `value`
Use specific names that describe what the variable holds.

```ts
// Bad
const data = await fetchSnapshot();

// Good
const snapshot = await fetchSnapshot();
```

### Constants: `ALL_CAPS_SNAKE_CASE` or `camelCase` — never PascalCase for non-types
```ts
// Bad
const MaxRetries = 3;

// Good
const MAX_RETRIES = 3;
const maxRetries = 3;
```

### Boolean defaults are `false` — don't initialize explicitly
```ts
// Bad
let isMoving: boolean = false;

// Good
let isMoving = false;
```

---

## Code Style

### Always use arrow functions
Arrow functions are the standard for all functions — handlers, helpers, and top-level definitions.

```ts
// Bad
function applyDamage(entity: Entity, amount: number) { ... }

// Good
const applyDamage = (entity: Entity, amount: number) => { ... };
```

### Always use braces in `if`/`else` blocks
Even for single-line bodies.

```ts
// Bad
if (!entity) return;

// Good
if (!entity) {
    return;
}
```

### Use early returns to reduce nesting
Guard against invalid states early to eliminate repeated null checks.

```ts
const processInput = (player: Player | null) => {
    if (!player) {
        return;
    }

    // No need for player?.foo everywhere below
    player.move(input.direction);
};
```

### Eliminate unnecessary intermediate variables
Do not create variables that are only used once and add no readability.

### No unnecessary `async/await`
Do not mark functions `async` when there is no `await`.

```ts
// Bad
const sendInput = async () => {
    return socket.send(inputBuffer);
};

// Good
const sendInput = () => socket.send(inputBuffer);
```

### Prefer positive conditions in ternaries
```ts
// Bad
!isAlive ? despawn(entity) : update(entity)

// Good
isAlive ? update(entity) : despawn(entity)
```

### Use `.includes()`, `.some()`, `.find()` over manual loops
```ts
// Bad
let found = false;
for (const entity of entities) {
    if (entity.id === targetId) { found = true; break; }
}

// Good
const found = entities.some((entity) => entity.id === targetId);
```

### Extract magic numbers into named constants
```ts
// Bad
if (health > 100) { ... }
setTimeout(fn, 50);

// Good
const MAX_HEALTH = 100;
const TICK_INTERVAL_MS = 50;
```

### Use optional chaining and nullish coalescing
```ts
const abilities = player?.equippedAbilities ?? [];
```

### No variable shadowing
Inner scope variables must have different names from outer scope variables.

### Keep declarations in alphabetical order
Type properties, imports within groups, and enum-like constant objects should follow alphabetical order where practical.

---

## Imports

### Use `import type` for type-only imports
Separate type imports from value imports.

---

## Documentation

### No JSDoc for self-documenting code
TypeScript types provide sufficient documentation. Do not add JSDoc where the signature is self-explanatory. Only add comments where the logic is non-obvious.

---

## Testing

### Test helpers and data go outside `describe` blocks
Define helper utilities, mock data, and shared setup at the top of the test file.

### Do not refactor working tests for style
Only change tests when fixing bugs or adding functionality.

---

## Dead Code

Remove all unused imports, variables, functions, commented-out code, and unused function parameters. Do not leave dead code in the codebase.

---

## Architecture

### Extract duplicated logic
If the same expression or logic appears 2+ times, extract it into a shared utility function or constant.

### Do not over-engineer
Do not add defensive error handling, input validation, or fallback code for scenarios that cannot realistically occur. Trust validated inputs from upstream layers. Keep solutions simple and focused on the actual requirements.

### Define types, constants, and helpers at module level
Only state-dependent logic belongs inside closures or class bodies. Types, constants, config objects, and pure helper functions go at the module level.

```ts
// Bad — constant defined inside a function
const createEnemy = () => {
    const SPAWN_OFFSET = 16;
    // ...
};

// Good
const SPAWN_OFFSET = 16;

const createEnemy = () => { ... };
```
