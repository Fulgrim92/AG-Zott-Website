"""
Blender Cycles plate for the summary video: the Allen CCFv3 mouse brain (glass shell) with the hippocampus
glowing inside, on a slow camera orbit. Meshes come from public/assets/atlas (see scripts/build-atlas.py).
Runs with the `bpy` Python module (pip install bpy) or inside Blender:  python3 blender/render_brain.py
Writes PNG frames to video/public/plates/brain/.
"""
import json, math, os, sys
from pathlib import Path
import numpy as np
import bpy

ROOT = Path(__file__).resolve().parents[2]
ATLAS = ROOT / 'public/assets/atlas'
OUT = ROOT / 'video/public/plates/brain'
FRAMES = int(os.environ.get('FRAMES', 150))
SAMPLES = int(os.environ.get('SAMPLES', 24))
RES = (int(os.environ.get('W', 960)), int(os.environ.get('H', 540)))
S = 0.01

def load():
    m = json.loads((ATLAS / 'ccf.json').read_text())
    buf = (ATLAS / m['binary']).read_bytes()
    out = {}
    for st in m['structures']:
        q = np.frombuffer(buf, dtype='<u2', count=st['positions'][1] * 3, offset=st['positions'][0]).reshape(-1, 3)
        v = q * m['scale'] + np.array(m['origin'])
        t = np.frombuffer(buf, dtype='<u2', count=st['indices'][1], offset=st['indices'][0]).reshape(-1, 3)
        # CCF: AP = 528 − y, DV = 320 − z (see scripts/build-atlas-sagittal.py); Blender: X = ML, Y = anterior, Z = dorsal
        ml, ap, dv = v[:, 0], 528 - v[:, 1], 320 - v[:, 2]
        out[st['id']] = (np.stack([(ml - 228) * S, (264 - ap) * S, (160 - dv) * S], 1), t.astype(np.int64))
    return out

def mesh(name, v, t, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata(v.tolist(), [], t.tolist())
    me.update()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def shell_mat(rgb=(0.37, 0.83, 0.78), strength=0.45, power=2.6, base=0.0):
    m = bpy.data.materials.new('shell'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*rgb, 1); em.inputs['Strength'].default_value = strength
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    ramp = nt.nodes.new('ShaderNodeMath'); ramp.operation = 'POWER'; ramp.inputs[1].default_value = power
    nt.links.new(lw.outputs['Facing'], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m

def glow_mat(rgb, strength):
    m = bpy.data.materials.new('glow'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (*rgb, 1); em.inputs['Strength'].default_value = strength
    lw = nt.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.5
    em2 = nt.nodes.new('ShaderNodeEmission'); em2.inputs['Color'].default_value = (0.9, 1, 0.95, 1); em2.inputs['Strength'].default_value = strength * 1.6
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lw.outputs['Facing'], mix.inputs['Fac'])
    nt.links.new(em.outputs[0], mix.inputs[1]); nt.links.new(em2.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.cycles.transparent_max_bounces = 16
    sc.render.resolution_x, sc.render.resolution_y = RES
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.frame_start, sc.frame_end = 1, FRAMES
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0, 0, 0, 1)

    ms = load()
    mesh('brain', *ms[997], shell_mat())
    hv, ht, off = [], [], 0
    for k, (v, t) in ms.items():
        if k == 997: continue
        hv.append(v); ht.append(t + off); off += len(v)
    mesh('hippocampus', np.vstack(hv), np.vstack(ht), shell_mat((0.30, 1.0, 0.6), 0.55, 0.9))

    # camera on a slow half orbit, looking at the hippocampus region
    target = bpy.data.objects.new('target', None); sc.collection.objects.link(target); target.location = (0, -0.6, 0.2)
    cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 50
    cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    c = cam.constraints.new('TRACK_TO'); c.target = target; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    R, Z = 9.5, 3.2
    for f in range(1, FRAMES + 1):
        a = math.radians(-150 + 120 * (f - 1) / max(1, FRAMES - 1))
        cam.location = (R * math.cos(a), R * math.sin(a), Z)
        cam.keyframe_insert('location', frame=f)
    for fc in cam.animation_data.action.fcurves if hasattr(cam.animation_data.action, 'fcurves') else []:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

    OUT.mkdir(parents=True, exist_ok=True)
    start = int(os.environ.get('START', 1))
    for f in range(start, FRAMES + 1):
        p = OUT / f'f{f:04d}.png'
        if p.exists(): continue
        sc.frame_set(f)
        sc.render.filepath = str(p)
        bpy.ops.render.render(write_still=True)
        print('frame', f, flush=True)

main()
