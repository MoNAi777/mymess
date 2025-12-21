from PIL import Image
import sys

img = Image.open(sys.argv[1])
# Resize to 50% to stay under 2000px
new_size = (img.width // 2, img.height // 2)
img_resized = img.resize(new_size, Image.LANCZOS)
img_resized.save(sys.argv[2])
print(f"Resized to {new_size}")
