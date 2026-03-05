Aseprite export and atlas packing utilities for the sprite pipeline.

1) Prepare exports from Aseprite:
   - Use tools/sprites/aseprite_export_template.json as a CLI template for batch export.
   - Exported files should be placed under assets/sprites/export/<entity>/<animation>/...

2) Packing atlas:
   - Configure tools/sprites/atlas_config.json and run:
       python3 tools/sprites/pack_atlas.py tools/sprites/atlas_config.json
   - Outputs: assets/sprites/atlas.png and assets/sprites/atlas.json

Keep this lightweight and adapt the templates to your Aseprite/TexturePacker workflow.
