import os
import math
from PIL import Image, ImageDraw

AVATAR_DIR = os.path.join(os.path.dirname(__file__), 'avatars')
os.makedirs(AVATAR_DIR, exist_ok=True)

SIZE = 64

def create_base_circle(bg_color):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, SIZE - 1, SIZE - 1], fill=bg_color)
    return img, draw

def save_gif(frames, name, duration=80):
    frames[0].save(
        os.path.join(AVATAR_DIR, name),
        save_all=True, append_images=frames[1:],
        duration=duration, loop=0, disposal=2
    )

# ── PAYSTACK: Green brand, flying rocket / lightning bolt ──
def gen_paystack():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((0, 110, 93, 255))  # Paystack dark green
        cx, cy = 32, 32
        # Orbiting sparkle
        sx = cx + int(18 * math.cos(t * 2 * math.pi))
        sy = cy + int(18 * math.sin(t * 2 * math.pi))
        draw.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=(255, 255, 255, 220))
        # Lightning bolt
        lx, ly = cx - 6, cy - 14
        pts = [(lx+5, ly), (lx, ly+8), (lx+5, ly+8), (lx, ly+22), (lx+12, ly+10), (lx+6, ly+10)]
        draw.polygon(pts, fill=(0, 230, 180, 255))
        frames.append(img)
    save_gif(frames, 'paystack.gif')

# ── OPAY: Vibrant blue/green, digital coins shower ──
def gen_opay():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((0, 75, 192, 255))
        cx, cy = 32, 32
        # Coin bounce positions
        for i in range(4):
            angle = (t + i / 4) * 2 * math.pi
            cx2 = cx + int(14 * math.cos(angle))
            cy2 = cy + int(14 * math.sin(angle))
            draw.ellipse([cx2 - 5, cy2 - 5, cx2 + 5, cy2 + 5], fill=(255, 215, 0, 230))
            draw.ellipse([cx2 - 3, cy2 - 3, cx2 + 3, cy2 + 3], fill=(255, 235, 100, 255))
        # ₦ center
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(255, 255, 255, 40))
        frames.append(img)
    save_gif(frames, 'opay.gif')

# ── KONGA: Orange e-commerce, price tag swinging ──
def gen_konga():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((230, 80, 20, 255))
        cx, cy = 32, 34
        # Shopping bag
        swing = int(4 * math.sin(t * 2 * math.pi))
        draw.rounded_rectangle([cx - 12, cy - 8 + swing, cx + 12, cy + 14 + swing], radius=3, fill=(255, 255, 255, 255))
        draw.arc([cx - 8, cy - 14 + swing, cx + 8, cy - 2 + swing], 200, 340, fill=(230, 80, 20, 255), width=3)
        # % tag
        draw.ellipse([cx - 4, cy - 2 + swing, cx, cy + 2 + swing], fill=(230, 80, 20, 255))
        draw.ellipse([cx + 1, cy + 4 + swing, cx + 5, cy + 8 + swing], fill=(230, 80, 20, 255))
        draw.line([cx - 4, cy + 6 + swing, cx + 5, cy - 2 + swing], fill=(230, 80, 20, 255), width=2)
        frames.append(img)
    save_gif(frames, 'konga.gif')

# ── JUMIA: Orange/red marketplace, package delivery ──
def gen_jumia():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((245, 130, 32, 255))
        cx, cy = 32, 33
        # Delivery box
        by = int(3 * math.sin(t * 2 * math.pi))
        draw.rounded_rectangle([cx - 13, cy - 8 + by, cx + 13, cy + 10 + by], radius=3, fill=(255, 255, 255, 255))
        draw.line([cx - 13, cy - 2 + by, cx + 13, cy - 2 + by], fill=(245, 130, 32, 200), width=2)
        draw.line([cx, cy - 8 + by, cx, cy + 10 + by], fill=(245, 130, 32, 200), width=2)
        # Speed lines
        for i in range(3):
            lx = cx - 18 + int(((t + i * 0.33) % 1) * 20)
            ly = cy + 13 + i * 3
            alpha = int(220 * (1 - ((t + i * 0.33) % 1)))
            draw.line([lx, ly, lx + 6, ly], fill=(255, 255, 255, alpha), width=1)
        frames.append(img)
    save_gif(frames, 'jumia.gif')

# ── FLUTTERWAVE: Purple/pink fintech, waving signal lines ──
def gen_flutterwave():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((103, 65, 217, 255))
        cx, cy = 32, 32
        # Animated wave lines
        for i in range(4):
            y = cy - 10 + i * 7
            pts = []
            for x in range(cx - 16, cx + 17, 2):
                pts.append((x, y + int(4 * math.sin((x / 8 + t * 3 + i * 0.5) * math.pi))))
            if len(pts) >= 2:
                draw.line(pts, fill=(255, 255, 255, 180 - i * 30), width=2)
        frames.append(img)
    save_gif(frames, 'flutterwave.gif')

# ── COWRYWISE: Teal savings, spinning coin stack ──
def gen_cowrywise():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((14, 165, 140, 255))
        cx, cy = 32, 32
        # Stacked coins with slight rotation effect
        for i in range(4):
            ry = 5 - i
            rx = 14
            offset = int(2 * math.sin((t + i * 0.2) * 2 * math.pi))
            draw.ellipse([cx - rx, cy - ry + 4 * i + offset, cx + rx, cy + ry + 4 * i + offset],
                         fill=(255, 215, 0, 200 - i * 20))
        # Glow
        draw.ellipse([cx - 6, cy - 14, cx + 6, cy - 6], fill=(255, 255, 255, int(100 + 80 * math.sin(t * 2 * math.pi))))
        frames.append(img)
    save_gif(frames, 'cowrywise.gif')

# ── WIZKID: Starboy purple/gold, orbiting star ──
def gen_wizkid():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((30, 15, 60, 255))
        cx, cy = 32, 32
        # Rotating stars
        for i in range(5):
            angle = (t + i / 5) * 2 * math.pi
            r = 14
            sx = cx + int(r * math.cos(angle))
            sy = cy + int(r * math.sin(angle))
            size = 3 if i % 2 == 0 else 2
            draw.ellipse([sx - size, sy - size, sx + size, sy + size], fill=(253, 224, 71, 240))
        # Center star
        star_alpha = int(200 + 55 * math.sin(t * 2 * math.pi))
        draw.polygon([(cx, cy - 10), (cx + 3, cy - 3), (cx + 10, cy - 3),
                      (cx + 4, cy + 2), (cx + 6, cy + 9), (cx, cy + 5),
                      (cx - 6, cy + 9), (cx - 4, cy + 2), (cx - 10, cy - 3),
                      (cx - 3, cy - 3)], fill=(253, 224, 71, star_alpha))
        frames.append(img)
    save_gif(frames, 'wizkid.gif')

# ── TIWA: Pink/gold queen crown & music note ──
def gen_tiwa():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((180, 30, 90, 255))
        cx, cy = 32, 32
        # Crown with sparkle
        crown_y = cy - 8 + int(2 * math.sin(t * 2 * math.pi))
        pts = [(cx - 16, cy + 6), (cx - 16, cy - 4), (cx - 8, cy + 2), (cx, cy - 10),
               (cx + 8, cy + 2), (cx + 16, cy - 4), (cx + 16, cy + 6)]
        draw.polygon(pts, fill=(255, 215, 0, 255))
        # Jewels
        for jx, jc in [(cx - 16, (239, 68, 68, 255)), (cx, (147, 197, 253, 255)), (cx + 16, (239, 68, 68, 255))]:
            draw.ellipse([jx - 3, crown_y - 5, jx + 3, crown_y + 1], fill=jc)
        # Music note
        draw.ellipse([cx + 6, cy + 8, cx + 14, cy + 14], fill=(255, 255, 255, 200))
        draw.line([cx + 14, cy + 8, cx + 14, cy - 2], fill=(255, 255, 255, 200), width=2)
        frames.append(img)
    save_gif(frames, 'tiwa.gif')

# ── REMA: Electric blue/green rave, equalizer bars ──
def gen_rema():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((5, 150, 200, 255))
        cx, cy = 32, 38
        # Equalizer bars
        for i in range(7):
            h = int(6 + 14 * abs(math.sin((t * 3 + i * 0.6) * math.pi)))
            bx = cx - 18 + i * 6
            color = (0, 255, 200, 230) if i % 2 == 0 else (100, 230, 255, 200)
            draw.rounded_rectangle([bx, cy - h, bx + 4, cy], radius=2, fill=color)
        frames.append(img)
    save_gif(frames, 'rema.gif')

# ── OLAMIDE: YBNL gold/dark, mic with bars ──
def gen_olamide():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((20, 15, 5, 255))
        cx, cy = 32, 32
        # Sound ripple
        for r_base in [8, 14, 20]:
            r = r_base + int(2 * math.sin((t + r_base / 20) * 2 * math.pi))
            alpha = int(160 - r_base * 5)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(245, 158, 11, alpha), width=2)
        # Microphone
        draw.rounded_rectangle([cx - 5, cy - 14, cx + 5, cy + 2], radius=5, fill=(245, 158, 11, 255))
        draw.arc([cx - 10, cy - 2, cx + 10, cy + 10], 0, 180, fill=(245, 158, 11, 255), width=2)
        draw.line([cx, cy + 10, cx, cy + 16], fill=(245, 158, 11, 255), width=2)
        draw.line([cx - 6, cy + 16, cx + 6, cy + 16], fill=(245, 158, 11, 255), width=2)
        frames.append(img)
    save_gif(frames, 'olamide.gif')

# ── MICHAEL: Lime/dark, pulsing ₦ symbol ──
def gen_michael():
    frames = []
    for f in range(12):
        t = f / 12
        img, draw = create_base_circle((8, 14, 4, 255))
        cx, cy = 32, 32
        # Glow ring
        ring_r = 22 + int(3 * math.sin(t * 2 * math.pi))
        alpha = int(120 + 80 * math.sin(t * 2 * math.pi))
        draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=(187, 242, 70, alpha), width=2)
        # ₦ symbol strokes
        draw.line([cx - 10, cy - 10, cx - 10, cy + 10], fill=(187, 242, 70, 255), width=3)
        draw.line([cx + 10, cy - 10, cx + 10, cy + 10], fill=(187, 242, 70, 255), width=3)
        draw.line([cx - 12, cy - 4, cx + 12, cy - 4], fill=(187, 242, 70, 200), width=2)
        draw.line([cx - 12, cy + 4, cx + 12, cy + 4], fill=(187, 242, 70, 200), width=2)
        draw.line([cx - 10, cy - 10, cx + 10, cy + 10], fill=(187, 242, 70, 180), width=2)
        frames.append(img)
    save_gif(frames, 'michael.gif')

if __name__ == '__main__':
    gen_paystack()
    gen_opay()
    gen_konga()
    gen_jumia()
    gen_flutterwave()
    gen_cowrywise()
    gen_wizkid()
    gen_tiwa()
    gen_rema()
    gen_olamide()
    gen_michael()
    print('All extended GIF avatars generated in:', AVATAR_DIR)
