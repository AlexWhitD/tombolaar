import os
from PIL import Image
import numpy as np

def extract_figures(image_path, prefix, output_dir):
    img = Image.open(image_path).convert('RGBA')
    data = np.array(img)
    
    # White background threshold: treat near-white as transparent
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    # White threshold: R > 245, G > 245, B > 245
    mask_white = (r > 245) & (g > 245) & (b > 245)
    
    # Make non-white alpha smooth or transparent
    # Soft alpha for edges
    alpha = np.where(mask_white, 0, 255).astype(np.uint8)
    
    # Smooth edge antialiasing
    # For pixels that are close to white, attenuate alpha
    whiteness = np.minimum(r, np.minimum(g, b))
    soft_mask = (whiteness > 230) & ~mask_white
    alpha[soft_mask] = ((255 - whiteness[soft_mask]) / (255 - 230) * 255).astype(np.uint8)
    
    data[:, :, 3] = alpha
    clean_img = Image.fromarray(data, mode='RGBA')
    
    # The 4 views are laid out horizontally across 393 px
    # Total width is 393, approx 4 characters: each is around 98 px wide.
    # Let's find columns with non-transparent content
    col_content = (alpha > 0).any(axis=0)
    
    # Split into 4 segments approx
    w, h = img.size
    segments = [
        (0, int(w * 0.25)),
        (int(w * 0.25), int(w * 0.50)),
        (int(w * 0.50), int(w * 0.74)),
        (int(w * 0.74), w)
    ]
    
    view_names = ["front", "three_quarters", "profile", "back"]
    results = []
    
    for i, (start_x, end_x) in enumerate(segments):
        view_crop = clean_img.crop((start_x, 0, end_x, h))
        # Find exact bounding box of non-zero alpha in this view
        bbox = view_crop.getbbox()
        if bbox:
            # Add small padding
            pad = 4
            pad_bbox = (
                max(0, bbox[0] - pad),
                max(0, bbox[1] - pad),
                min(view_crop.width, bbox[2] + pad),
                min(view_crop.height, bbox[3] + pad)
            )
            cropped = view_crop.crop(pad_bbox)
        else:
            cropped = view_crop
            
        out_name = f"{prefix}_{view_names[i]}.png"
        out_path = os.path.join(output_dir, out_name)
        cropped.save(out_path, format="PNG")
        print(f"Saved {out_path} with size {cropped.size}")
        results.append(out_path)
        
    return results

if __name__ == "__main__":
    out_dir = "assets/characters"
    os.makedirs(out_dir, exist_ok=True)
    f1 = "a8f903d8-a65f-4ed5-a97f-f45357f40957.jpeg" # female
    f2 = "c5232d37-6e3a-4b8f-a7e0-8c41b8e32581.jpeg" # male
    
    print("Extracting female cyclist views...")
    extract_figures(f1, "female", out_dir)
    print("Extracting male cyclist views...")
    extract_figures(f2, "male", out_dir)
    print("Done!")
