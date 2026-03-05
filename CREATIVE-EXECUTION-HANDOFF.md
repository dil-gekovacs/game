# CREATIVE Execution Order Handoff

1. Implement gameplay constants/ability tables/status enums.
2. Implement enemy MVP archetypes + tell timings + tier scaler.
3. Build map rooms in indexed order (R0->R6) with required schema and spawn metadata.
4. Produce/export MVP sprite sets, validate naming/spec, then pack atlas.
5. Wire encounter scripts (timed + trigger + HP-threshold) into rooms.
6. Run checkpoint tests: timing integrity, map/content validation, multiplayer fairness.
7. Perform telemetry-driven tuning pass (clear times, downs, readability) and lock v1.

## Critical dependencies
- Stable gameplay/enemy IDs before script wiring.
- Stable room/spawn IDs before encounter authoring.
- Passing sprite export validation before atlas/runtime integration.
