import os
import math
from PIL import Image, ImageDraw, ImageFont

AVATAR_DIR = os.path.join(os.path.dirname(__file__), 'avatars')
os.makedirs(AVATAR_DIR, exist_ok=True)

SIZE = 64
RADIUS = 32

def create_base_circle(bg_color):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, SIZE - 1, SIZE - 1], fill=bg_color)
    return img, draw

# 1. CHOWDECK: Vibrant orange background, cycling delivery burger/bag, food pulse
def gen_chowdeck():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((249, 115, 22, 255)) # Vibrant Chowdeck Orange
        # Halo pulse
        pulse = int(3 * math.sin(t * 2 * math.pi))
        draw.ellipse([6 - pulse, 6 - pulse, SIZE - 7 + pulse, SIZE - 7 + pulse], outline=(255, 255, 255, 70), width=2)
        
        # Burger/Bag icon in center
        cx, cy = 32, 33 + int(2 * math.sin(t * 2 * math.pi))
        # Bun top
        draw.chord([cx - 16, cy - 14, cx + 16, cy + 2], 180, 360, fill=(254, 240, 138, 255))
        # Patty
        draw.rounded_rectangle([cx - 17, cy - 2, cx + 17, cy + 5], radius=2, fill=(120, 53, 15, 255))
        # Lettuce/cheese wave
        green_x = int(4 * math.sin((t + 0.25) * 2 * math.pi))
        draw.line([cx - 15, cy + 1, cx + 15, cy + 1], fill=(132, 204, 22, 255), width=2)
        # Bun bottom
        draw.rounded_rectangle([cx - 15, cy + 6, cx + 15, cy + 12], radius=3, fill=(254, 240, 138, 255))
        
        # Speed dash / sparkles
        dash_offset = int((t * 24) % 24)
        draw.ellipse([cx + 12, cy - 12 + (dash_offset % 8), cx + 16, cy - 8 + (dash_offset % 8)], fill=(255, 255, 255, 220))
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'chowdeck.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)

# 2. CHICKEN REPUBLIC: Red background, golden flame & drumstick animation
def gen_chickenrepublic():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((220, 38, 38, 255)) # Chicken Republic Crimson Red
        
        cx, cy = 32, 33
        # Flame pulsation
        flame_h = 10 + int(4 * math.sin(t * 2 * math.pi))
        flame_color = (250, 204, 21, 255) if f % 2 == 0 else (251, 146, 60, 255)
        draw.polygon([(cx - 10, cy + 4), (cx, cy - flame_h - 10), (cx + 10, cy + 4)], fill=flame_color)
        
        # Crispy drumstick
        # Bone
        draw.line([cx - 10, cy + 14, cx - 18, cy + 20], fill=(255, 255, 255, 255), width=5)
        draw.ellipse([cx - 20, cy + 17, cx - 15, cy + 22], fill=(255, 255, 255, 255))
        # Meat bulb
        meat_y = cy + int(1.5 * math.sin(t * 2 * math.pi))
        draw.ellipse([cx - 10, meat_y - 8, cx + 16, meat_y + 14], fill=(217, 119, 6, 255))
        draw.ellipse([cx - 6, meat_y - 6, cx + 12, meat_y + 10], fill=(245, 158, 11, 255))
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'chickenrepublic.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)

# 3. MAMA JOY CANTEEN: Warm emerald / terracotta, steaming pot & aroma puffs
def gen_mamajoycanteen():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((16, 120, 68, 255)) # Fresh Kitchen Green
        cx, cy = 32, 37
        
        # Steam waves rising
        for s in range(3):
            sx = cx - 10 + (s * 10)
            sy_base = cy - 12
            sy = sy_base - int(((t + s*0.33) % 1.0) * 14)
            alpha = int(220 * (1 - ((t + s*0.33) % 1.0)))
            draw.arc([sx - 3, sy - 4, sx + 3, sy + 4], 220, 40, fill=(255, 255, 255, alpha), width=2)
            
        # Pot body
        draw.chord([cx - 18, cy - 8, cx + 18, cy + 18], 0, 180, fill=(180, 83, 9, 255))
        # Pot rim
        draw.rounded_rectangle([cx - 20, cy - 9, cx + 20, cy - 4], radius=2, fill=(245, 158, 11, 255))
        # Handles
        draw.arc([cx - 24, cy - 6, cx - 18, cy], 90, 270, fill=(245, 158, 11, 255), width=2)
        draw.arc([cx + 18, cy - 6, cx + 24, cy], 270, 90, fill=(245, 158, 11, 255), width=2)
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'mamajoycanteen.gif'), save_all=True, append_images=frames[1:], duration=90, loop=0)

# 4. ASAKE: Neon chartreuse / dark cyberpunk with pulsing sunglasses & beats
def gen_asake():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((15, 23, 42, 255)) # Deep Obsidian
        
        # Audio ring
        ring_r = 26 + int(3 * math.sin(t * 2 * math.pi))
        draw.ellipse([32 - ring_r, 32 - ring_r, 32 + ring_r, 32 + ring_r], outline=(187, 242, 70, 180), width=2)
        
        # Futuristic visor / glasses
        cx, cy = 32, 32
        glow_alpha = int(200 + 55 * math.sin(t * 2 * math.pi))
        # Visor bar
        draw.rounded_rectangle([cx - 18, cy - 6, cx + 18, cy + 6], radius=4, fill=(187, 242, 70, glow_alpha))
        # Visor shine streak
        streak_x = cx - 14 + int(t * 28)
        draw.line([streak_x, cy - 4, streak_x + 4, cy + 4], fill=(255, 255, 255, 240), width=2)
        
        # Afro hair silhouette
        draw.ellipse([cx - 16, cy - 22, cx + 16, cy - 6], fill=(30, 41, 59, 255))
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'asake.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)

# 5. BURNA BOY: Royal African Giant Gold Crown & Diamonds
def gen_burna():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((30, 15, 5, 255)) # Rich Bronze
        
        cx, cy = 32, 32
        # Rotating star glint
        glint_angle = t * 2 * math.pi
        glint_x = cx + int(14 * math.cos(glint_angle))
        glint_y = cy - 10 + int(4 * math.sin(glint_angle))
        draw.line([glint_x - 4, glint_y, glint_x + 4, glint_y], fill=(255, 255, 255, 255), width=2)
        draw.line([glint_x, glint_y - 4, glint_x, glint_y + 4], fill=(255, 255, 255, 255), width=2)
        
        # Golden Crown
        crown_points = [
            (cx - 18, cy + 8),
            (cx - 18, cy - 6),
            (cx - 9, cy + 2),
            (cx, cy - 10 + int(2 * math.sin(t * 2 * math.pi))),
            (cx + 9, cy + 2),
            (cx + 18, cy - 6),
            (cx + 18, cy + 8)
        ]
        draw.polygon(crown_points, fill=(245, 158, 11, 255))
        # Jewels on tips
        draw.ellipse([cx - 20, cy - 9, cx - 16, cy - 5], fill=(239, 68, 68, 255))
        draw.ellipse([cx - 2, cy - 13, cx + 2, cy - 9], fill=(59, 130, 246, 255))
        draw.ellipse([cx + 16, cy - 9, cx + 20, cy - 5], fill=(239, 68, 68, 255))
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'burna.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)

# 6. DAVIDO: Timeless Diamond Shimmer / 001
def gen_davido():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((10, 25, 47, 255)) # Midnight Sapphire
        cx, cy = 32, 32
        
        # Shimmering Diamond
        scale = 1.0 + 0.1 * math.sin(t * 2 * math.pi)
        top_y = cy - int(12 * scale)
        mid_y = cy
        bot_y = cy + int(14 * scale)
        left_x = cx - int(14 * scale)
        right_x = cx + int(14 * scale)
        
        # Top facets
        draw.polygon([(cx - 7, top_y), (cx + 7, top_y), (right_x, mid_y), (cx, mid_y)], fill=(147, 197, 253, 255))
        draw.polygon([(cx - 7, top_y), (cx, mid_y), (left_x, mid_y)], fill=(191, 219, 254, 255))
        # Bottom facets
        draw.polygon([(left_x, mid_y), (cx, bot_y), (cx, mid_y)], fill=(96, 165, 250, 255))
        draw.polygon([(cx, mid_y), (cx, bot_y), (right_x, mid_y)], fill=(59, 130, 246, 255))
        
        # Sparkle
        sp_x = cx + 8
        sp_y = cy - 8
        if f % 3 == 0:
            draw.line([sp_x - 3, sp_y, sp_x + 3, sp_y], fill=(255, 255, 255, 255), width=2)
            draw.line([sp_x, sp_y - 3, sp_x, sp_y + 3], fill=(255, 255, 255, 255), width=2)
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'davido.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)

# 7. MONIEPOINT: Blue POS Terminal & Green Success Pulse
def gen_moniepoint():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((3, 75, 162, 255)) # Moniepoint Brand Blue
        cx, cy = 32, 33
        
        # POS Machine Body
        draw.rounded_rectangle([cx - 13, cy - 16, cx + 13, cy + 17], radius=4, fill=(15, 23, 42, 255))
        # Screen
        screen_fill = (16, 185, 129, 255) if f % 4 < 2 else (52, 211, 153, 255)
        draw.rounded_rectangle([cx - 10, cy - 13, cx + 10, cy - 2], radius=2, fill=screen_fill)
        # Checkmark on screen
        draw.line([cx - 6, cy - 7, cx - 2, cy - 4], fill=(255, 255, 255, 255), width=2)
        draw.line([cx - 2, cy - 4, cx + 6, cy - 10], fill=(255, 255, 255, 255), width=2)
        # Keypad dots
        for row in range(3):
            for col in range(3):
                kx = cx - 7 + col * 7
                ky = cy + 3 + row * 4
                draw.ellipse([kx - 1, ky - 1, kx + 1, ky + 1], fill=(148, 163, 184, 255))
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'moniepoint.gif'), save_all=True, append_images=frames[1:], duration=90, loop=0)

# 8. THE PLACE: Nightlife Neon Magenta & Cocktails
def gen_theplace():
    frames = []
    num_frames = 12
    for f in range(num_frames):
        t = f / num_frames
        img, draw = create_base_circle((26, 10, 36, 255)) # Deep Plum
        cx, cy = 32, 33
        
        # Pulsing neon circle
        pulse = int(2 * math.sin(t * 2 * math.pi))
        draw.ellipse([8 - pulse, 8 - pulse, 56 + pulse, 56 + pulse], outline=(236, 72, 153, 150), width=2)
        
        # Martini / cocktail glass
        draw.polygon([(cx - 12, cy - 10), (cx + 12, cy - 10), (cx, cy + 4)], fill=(244, 114, 182, 220))
        # Stem and base
        draw.line([cx, cy + 4, cx, cy + 14], fill=(255, 255, 255, 255), width=2)
        draw.line([cx - 7, cy + 14, cx + 7, cy + 14], fill=(255, 255, 255, 255), width=2)
        # Olive / garnish
        g_x = cx + int(3 * math.sin(t * 2 * math.pi))
        draw.ellipse([g_x - 3, cy - 13, g_x + 3, cy - 7], fill=(163, 230, 53, 255))
        frames.append(img)
    frames[0].save(os.path.join(AVATAR_DIR, 'theplace.gif'), save_all=True, append_images=frames[1:], duration=80, loop=0)

if __name__ == '__main__':
    gen_chowdeck()
    gen_chickenrepublic()
    gen_mamajoycanteen()
    gen_asake()
    gen_burna()
    gen_davido()
    gen_moniepoint()
    gen_theplace()
    print("All GIF avatars generated successfully in:", AVATAR_DIR)
