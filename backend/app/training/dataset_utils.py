"""
Dataset Collection & Management Utilities

Tools for:
  1. Downloading and preparing the Food-101 dataset
  2. Exporting verified user data from Supabase → local training format
  3. Dataset statistics and validation
"""

import asyncio
import json
import logging
import os
from io import BytesIO
from typing import Optional

import httpx
from PIL import Image
from tqdm import tqdm

logger = logging.getLogger(__name__)


async def download_supabase_dataset(
    output_dir: str = "datasets/custom",
    verified_only: bool = True,
):
    """
    Export verified training samples from Supabase to local filesystem.
    Downloads images and organizes them into class folders for training.

    Output structure:
      datasets/custom/
        grilled_chicken/
          img_001.jpg
          img_002.jpg
        pizza/
          img_001.jpg
    """
    # Import here to avoid circular imports
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
    from app.services.supabase_service import get_dataset_samples

    logger.info("Fetching dataset samples from Supabase (verified_only=%s)", verified_only)
    samples = await get_dataset_samples(verified_only=verified_only, limit=10000)

    if not samples:
        logger.warning("No dataset samples found in Supabase")
        return

    logger.info("Found %d dataset samples", len(samples))
    os.makedirs(output_dir, exist_ok=True)

    async with httpx.AsyncClient() as client:
        for i, sample in enumerate(tqdm(samples, desc="Downloading images")):
            # Normalize food name to folder name
            class_name = sample["food_name"].lower().replace(" ", "_")
            class_dir = os.path.join(output_dir, class_name)
            os.makedirs(class_dir, exist_ok=True)

            # Download image
            try:
                response = await client.get(sample["image_url"], timeout=10.0)
                if response.status_code == 200:
                    img = Image.open(BytesIO(response.content)).convert("RGB")
                    img_path = os.path.join(class_dir, f"img_{i:05d}.jpg")
                    img.save(img_path, "JPEG", quality=95)
            except Exception as e:
                logger.warning("Failed to download image %s: %s", sample['image_url'], e)

    # Save metadata
    metadata = {
        "total_samples": len(samples),
        "verified_only": verified_only,
        "classes": list(set(s["food_name"].lower().replace(" ", "_") for s in samples)),
    }
    with open(os.path.join(output_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Downloaded %d images to %s", len(samples), output_dir)


def get_dataset_stats(data_dir: str = "datasets") -> dict:
    """
    Get statistics about available training datasets.
    Shows class counts, image counts, and balance info.
    """
    stats = {}

    for dataset_name in ["food101", "custom"]:
        dataset_dir = os.path.join(data_dir, dataset_name)
        if not os.path.exists(dataset_dir):
            stats[dataset_name] = {"status": "not_downloaded"}
            continue

        classes = {}
        total_images = 0

        # For Food-101 downloaded by torchvision, structure is different
        if dataset_name == "food101":
            food101_images = os.path.join(dataset_dir, "food-101", "images")
            if os.path.exists(food101_images):
                for class_name in sorted(os.listdir(food101_images)):
                    class_dir = os.path.join(food101_images, class_name)
                    if os.path.isdir(class_dir):
                        count = len([f for f in os.listdir(class_dir) if f.lower().endswith((".jpg", ".png"))])
                        classes[class_name] = count
                        total_images += count
        else:
            for class_name in sorted(os.listdir(dataset_dir)):
                class_dir = os.path.join(dataset_dir, class_name)
                if os.path.isdir(class_dir):
                    count = len([f for f in os.listdir(class_dir) if f.lower().endswith((".jpg", ".png", ".jpeg", ".webp"))])
                    classes[class_name] = count
                    total_images += count

        stats[dataset_name] = {
            "status": "available",
            "total_images": total_images,
            "num_classes": len(classes),
            "classes": classes,
            "avg_per_class": total_images / len(classes) if classes else 0,
        }

    return stats


def validate_images(data_dir: str, fix: bool = False) -> dict:
    """
    Validate all images in the dataset directory.
    Checks for corrupt files, wrong formats, etc.
    """
    results = {"valid": 0, "corrupt": 0, "fixed": 0, "errors": []}

    for root, dirs, files in os.walk(data_dir):
        for fname in files:
            if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue

            fpath = os.path.join(root, fname)
            try:
                img = Image.open(fpath)
                img.verify()
                results["valid"] += 1
            except Exception as e:
                results["corrupt"] += 1
                results["errors"].append({"file": fpath, "error": str(e)})
                if fix:
                    try:
                        os.remove(fpath)
                        results["fixed"] += 1
                    except:
                        pass

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Dataset Management")
    sub = parser.add_subparsers(dest="command")

    # Stats command
    sub.add_parser("stats", help="Show dataset statistics")

    # Download command
    dl = sub.add_parser("download", help="Download custom dataset from Supabase")
    dl.add_argument("--output", default="datasets/custom")
    dl.add_argument("--all", action="store_true", help="Include unverified samples")

    # Validate command
    val = sub.add_parser("validate", help="Validate image files")
    val.add_argument("--dir", default="datasets")
    val.add_argument("--fix", action="store_true", help="Remove corrupt files")

    args = parser.parse_args()

    if args.command == "stats":
        stats = get_dataset_stats()
        print(json.dumps(stats, indent=2))
    elif args.command == "download":
        asyncio.run(download_supabase_dataset(output_dir=args.output, verified_only=not args.all))
    elif args.command == "validate":
        results = validate_images(args.dir, fix=args.fix)
        print(json.dumps(results, indent=2))
    else:
        parser.print_help()
