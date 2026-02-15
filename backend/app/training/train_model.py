"""
Custom Model Training Pipeline (Option B)

Trains a ResNet-50 food classifier on:
  1. Food-101 dataset (101,000 images, 101 food categories)
  2. Your own custom dataset collected from user uploads

Usage:
  python -m app.training.train_model                          # Train on Food-101
  python -m app.training.train_model --include-custom         # Food-101 + custom data
  python -m app.training.train_model --custom-only            # Only custom dataset
  python -m app.training.train_model --epochs 20 --batch-size 32

After training, the model is saved to models/food_classifier.pth
Set USE_CUSTOM_MODEL=true in .env to activate hybrid mode.
"""

import os
import argparse
import json
import time
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split, ConcatDataset
from torchvision import transforms, datasets
from PIL import Image
from io import BytesIO
from tqdm import tqdm

# Add project root to path so we can import app modules
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.custom_model_service import FoodClassifier, FOOD101_CLASSES


# ── Training Transforms ───────────────────────────────────

TRAIN_TRANSFORM = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

VAL_TRANSFORM = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


# ── Custom Dataset Loader ─────────────────────────────────

class CustomFoodDataset(Dataset):
    """
    Loads custom food images from a local directory.
    Expected structure:
      datasets/custom/
        chicken_breast/
          img1.jpg
          img2.jpg
        pizza/
          img1.jpg
        ...
    """

    def __init__(self, root_dir: str, transform=None, class_names: list = None):
        self.root_dir = root_dir
        self.transform = transform
        self.samples = []
        self.class_names = class_names or []

        if not os.path.exists(root_dir):
            print(f"[Dataset] Custom dataset directory not found: {root_dir}")
            return

        # Build class mapping
        if not self.class_names:
            self.class_names = sorted(os.listdir(root_dir))
            self.class_names = [c for c in self.class_names if os.path.isdir(os.path.join(root_dir, c))]

        self.class_to_idx = {c: i for i, c in enumerate(self.class_names)}

        for class_name in self.class_names:
            class_dir = os.path.join(root_dir, class_name)
            if not os.path.isdir(class_dir):
                continue
            for img_name in os.listdir(class_dir):
                if img_name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    self.samples.append((os.path.join(class_dir, img_name), self.class_to_idx[class_name]))

        print(f"[Dataset] Loaded {len(self.samples)} custom samples across {len(self.class_names)} classes")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label


# ── Training Functions ─────────────────────────────────────

def load_food101_dataset(data_dir: str = "datasets/food101"):
    """
    Download and load the Food-101 dataset via torchvision.
    First run will download ~5GB of data.
    """
    print("[Dataset] Loading Food-101 dataset...")

    train_dataset = datasets.Food101(
        root=data_dir,
        split="train",
        transform=TRAIN_TRANSFORM,
        download=True,
    )

    test_dataset = datasets.Food101(
        root=data_dir,
        split="test",
        transform=VAL_TRANSFORM,
        download=True,
    )

    print(f"[Dataset] Food-101: {len(train_dataset)} train, {len(test_dataset)} test samples")
    return train_dataset, test_dataset


def train_model(
    epochs: int = 15,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    include_custom: bool = False,
    custom_only: bool = False,
    data_dir: str = "datasets",
    output_path: str = "models/food_classifier.pth",
):
    """
    Train the food classification model.

    Args:
        epochs: Number of training epochs
        batch_size: Training batch size
        learning_rate: Initial learning rate
        include_custom: Include custom dataset alongside Food-101
        custom_only: Train only on custom dataset
        data_dir: Root directory for datasets
        output_path: Where to save the trained model
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    print(f"[Training] Using device: {device}")

    # Load datasets
    train_datasets = []
    val_datasets = []
    num_classes = 101

    if not custom_only:
        food101_train, food101_test = load_food101_dataset(os.path.join(data_dir, "food101"))
        train_datasets.append(food101_train)
        val_datasets.append(food101_test)

    if include_custom or custom_only:
        custom_dir = os.path.join(data_dir, "custom")
        if os.path.exists(custom_dir):
            custom_dataset = CustomFoodDataset(custom_dir, transform=TRAIN_TRANSFORM, class_names=FOOD101_CLASSES)
            if len(custom_dataset) > 0:
                # Split custom dataset 80/20
                train_size = int(0.8 * len(custom_dataset))
                val_size = len(custom_dataset) - train_size
                custom_train, custom_val = random_split(custom_dataset, [train_size, val_size])
                train_datasets.append(custom_train)
                custom_val_dataset = CustomFoodDataset(custom_dir, transform=VAL_TRANSFORM, class_names=FOOD101_CLASSES)
                _, custom_val = random_split(custom_val_dataset, [train_size, val_size])
                val_datasets.append(custom_val)
        else:
            print(f"[Warning] Custom dataset directory not found: {custom_dir}")

    if not train_datasets:
        print("[Error] No training data available!")
        return

    # Combine datasets
    train_dataset = ConcatDataset(train_datasets) if len(train_datasets) > 1 else train_datasets[0]
    val_dataset = ConcatDataset(val_datasets) if len(val_datasets) > 1 else val_datasets[0]

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4, pin_memory=True)

    print(f"[Training] Train samples: {len(train_dataset)}, Val samples: {len(val_dataset)}")

    # Create model
    model = FoodClassifier(num_classes=num_classes, pretrained_backbone=True)
    model = model.to(device)

    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)

    # Training loop
    best_accuracy = 0.0
    training_history = []

    for epoch in range(epochs):
        start_time = time.time()

        # Train
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        progress = tqdm(train_loader, desc=f"Epoch {epoch + 1}/{epochs} [Train]")
        for images, labels in progress:
            images, labels = images.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

            progress.set_postfix(loss=loss.item(), acc=100.0 * correct / total)

        train_loss = running_loss / len(train_loader)
        train_acc = 100.0 * correct / total

        # Validate
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for images, labels in tqdm(val_loader, desc=f"Epoch {epoch + 1}/{epochs} [Val]"):
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()

        val_loss /= len(val_loader)
        val_acc = 100.0 * val_correct / val_total
        epoch_time = time.time() - start_time

        print(
            f"\nEpoch {epoch + 1}/{epochs} ({epoch_time:.1f}s) — "
            f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}% | "
            f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%"
        )

        training_history.append({
            "epoch": epoch + 1,
            "train_loss": train_loss,
            "train_acc": train_acc,
            "val_loss": val_loss,
            "val_acc": val_acc,
            "time_seconds": epoch_time,
        })

        # Save best model
        if val_acc > best_accuracy:
            best_accuracy = val_acc
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "num_classes": num_classes,
                    "class_names": FOOD101_CLASSES,
                    "accuracy": val_acc,
                    "epoch": epoch + 1,
                    "training_history": training_history,
                },
                output_path,
            )
            print(f"  ✓ New best model saved ({val_acc:.2f}%)")

        scheduler.step()

    # Save training report
    report = {
        "completed_at": datetime.now().isoformat(),
        "best_accuracy": best_accuracy,
        "total_epochs": epochs,
        "device": str(device),
        "history": training_history,
    }
    report_path = output_path.replace(".pth", "_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n[Training] Complete! Best accuracy: {best_accuracy:.2f}%")
    print(f"[Training] Model saved to: {output_path}")
    print(f"[Training] Report saved to: {report_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Food Classification Model")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--include-custom", action="store_true", help="Include custom dataset")
    parser.add_argument("--custom-only", action="store_true", help="Train only on custom dataset")
    parser.add_argument("--data-dir", type=str, default="datasets", help="Datasets root directory")
    parser.add_argument("--output", type=str, default="models/food_classifier.pth", help="Output model path")

    args = parser.parse_args()

    train_model(
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        include_custom=args.include_custom,
        custom_only=args.custom_only,
        data_dir=args.data_dir,
        output_path=args.output,
    )
