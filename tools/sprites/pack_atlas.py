#!/usr/bin/env python3
"""
Simple atlas packer: packs PNGs from input_dir into a single atlas image and emits JSON metadata.
Usage: python tools/sprites/pack_atlas.py [path/to/atlas_config.json]
"""
import sys, json, os
from PIL import Image

def load_config(path):
    with open(path, 'r') as f:
        return json.load(f)


def find_images(input_dir):
    files=[]
    for root,_,filenames in os.walk(input_dir):
        for fn in filenames:
            if fn.lower().endswith('.png'):
                files.append(os.path.join(root,fn))
    return sorted(files)


def pack_images(paths, max_width, padding):
    rows=[]
    row_w=0; row_h=0; row=[]
    for p in paths:
        im=Image.open(p)
        w,h=im.size
        if row_w + w + (padding if row else 0) > max_width:
            rows.append((row_w,row_h,row))
            row=[]; row_w=0; row_h=0
        if row:
            row_w += padding
        row.append((p,im,w,h))
        row_w += w
        row_h = max(row_h,h)
    if row:
        rows.append((row_w,row_h,row))
    # compute atlas size
    atlas_w = min(max_width, max((r[0] for r in rows), default=0))
    atlas_h = sum((r[1] for r in rows)) + padding*(len(rows)-1 if rows else 0)
    # positions
    placements=[]
    y=0
    for _,rh,row in rows:
        x=0
        for (p,im,w,h) in row:
            placements.append((p,x,y,w,h,im))
            x += w + padding
        y += rh + padding
    return atlas_w, atlas_h, placements


def main():
    cfg_path = sys.argv[1] if len(sys.argv)>1 else 'tools/sprites/atlas_config.json'
    cfg = load_config(cfg_path)
    input_dir = cfg.get('input_dir','assets/sprites/export')
    out_image = cfg.get('output_image','assets/sprites/atlas.png')
    out_meta = cfg.get('output_meta','assets/sprites/atlas.json')
    max_width = cfg.get('max_width',2048)
    padding = cfg.get('padding',2)

    paths = find_images(input_dir)
    if not paths:
        print('No PNGs found in', input_dir); return
    atlas_w,atlas_h,placements = pack_images(paths, max_width, padding)
    atlas = Image.new('RGBA', (atlas_w, atlas_h), tuple(cfg.get('background',[0,0,0,0])))
    meta = {"frames":{}}
    for p,x,y,w,h,im in placements:
        atlas.paste(im, (x,y), im if im.mode=='RGBA' else None)
        key = os.path.relpath(p, input_dir).replace('\\','/')
        meta['frames'][key] = {"frame": {"x": x, "y": y, "w": w, "h": h}}
    os.makedirs(os.path.dirname(out_image) or '.', exist_ok=True)
    atlas.save(out_image)
    with open(out_meta,'w') as f:
        json.dump(meta, f, indent=2)
    print('Wrote', out_image, out_meta)

if __name__=='__main__':
    main()
