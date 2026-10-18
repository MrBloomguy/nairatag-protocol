import os
from PIL import Image

src_path = r'C:\Users\olusegun\.gemini\antigravity-ide\brain\1700e9cd-3713-4783-baae-c38813594b77\.user_uploaded\media_1791571338773.png'
hub_dir = r'c:\Users\olusegun\.gemini\antigravity-ide\scratch\nairatag-network\hub'
root_dir = r'c:\Users\olusegun\.gemini\antigravity-ide\scratch\nairatag-network'

im = Image.open(src_path).convert('RGBA')

# 1. Full image copy for master reference
im.save(os.path.join(hub_dir, 'nairatag-brand-master.png'))

# 2. Extract the Icon Mark (Stylized ₦ with Lime accent)
# Mark bounds: X from 344 to 670, Y from 298 to 545
cx = (344 + 670) // 2  # 507
cy = (298 + 545) // 2  # 421
mark_w = 670 - 344     # 326
mark_h = 545 - 298     # 247

# Crop with nice balanced padding (e.g. 1.25x max dimension)
side = int(max(mark_w, mark_h) * 1.28)  # ~417
x0 = cx - side // 2
y0 = cy - side // 2
x1 = x0 + side
y1 = y0 + side

mark_square = im.crop((x0, y0, x1, y1))

# Save solid mark (on original pitch-black background)
mark_square.save(os.path.join(hub_dir, 'nairatag-icon.png'), format='PNG')
mark_square.save(os.path.join(root_dir, 'nairatag-icon.png'), format='PNG')

# 3. Transparent version of the Icon Mark
def make_transparent_smooth(img):
    img = img.convert('RGBA')
    width, height = img.size
    pixels = img.load()
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            brightness = max(r, g, b)
            if brightness <= 15:
                pixels[x, y] = (0, 0, 0, 0)
            elif brightness < 60:
                # Anti-aliased edge
                alpha = int(255 * (brightness - 15) / 45)
                # Un-premultiply so colors don't have dark fringe
                scale = 255.0 / max(1, brightness)
                nr = min(255, int(r * scale))
                ng = min(255, int(g * scale))
                nb = min(255, int(b * scale))
                pixels[x, y] = (nr, ng, nb, alpha)
            else:
                pixels[x, y] = (r, g, b, 255)
    return img

mark_transparent = make_transparent_smooth(mark_square.copy())
mark_transparent.save(os.path.join(hub_dir, 'nairatag-icon-transparent.png'), format='PNG')
mark_transparent.save(os.path.join(root_dir, 'nairatag-icon-transparent.png'), format='PNG')

# 4. Generate Favicon and App Icons
# Favicon on dark background with subtle rounded border is extremely crisp and visible in both light & dark browser tabs!
sizes = [16, 32, 48, 64, 128, 180, 192, 512]
for s in sizes:
    resized = mark_square.resize((s, s), Image.Resampling.LANCZOS)
    if s == 32:
        resized.save(os.path.join(hub_dir, 'favicon-32x32.png'))
        resized.save(os.path.join(root_dir, 'favicon-32x32.png'))
        resized.save(os.path.join(hub_dir, 'favicon.png'))
        resized.save(os.path.join(root_dir, 'favicon.png'))
    elif s == 180:
        resized.save(os.path.join(hub_dir, 'apple-touch-icon.png'))
        resized.save(os.path.join(root_dir, 'apple-touch-icon.png'))
    elif s == 192:
        resized.save(os.path.join(hub_dir, 'icon-192.png'))
        resized.save(os.path.join(root_dir, 'icon-192.png'))
    elif s == 512:
        resized.save(os.path.join(hub_dir, 'icon-512.png'))
        resized.save(os.path.join(root_dir, 'icon-512.png'))

# Multi-resolution favicon.ico
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
ico_imgs = [mark_square.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
ico_imgs[0].save(os.path.join(hub_dir, 'favicon.ico'), format='ICO', sizes=ico_sizes)
ico_imgs[0].save(os.path.join(root_dir, 'favicon.ico'), format='ICO', sizes=ico_sizes)

# 5. Extract Full Logo (Mark + Wordmark)
# Full bounds: X: 138..885 (width=747), Y: 298..740 (height=442)
logo_cx = (138 + 885) // 2  # 511
logo_cy = (298 + 740) // 2  # 519
logo_w = 885 - 138 + 60
logo_h = 740 - 298 + 60

logo_crop = im.crop((logo_cx - logo_w//2, logo_cy - logo_h//2, logo_cx + logo_w//2, logo_cy + logo_h//2))
logo_crop.save(os.path.join(hub_dir, 'nairatag-logo.png'), format='PNG')
logo_crop.save(os.path.join(root_dir, 'nairatag-logo.png'), format='PNG')

logo_transparent = make_transparent_smooth(logo_crop.copy())
logo_transparent.save(os.path.join(hub_dir, 'nairatag-logo-transparent.png'), format='PNG')
logo_transparent.save(os.path.join(root_dir, 'nairatag-logo-transparent.png'), format='PNG')

print('✓ All NairaTag brand assets generated successfully!')
