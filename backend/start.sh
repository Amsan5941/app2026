
# AI Diet Tracker - Setup & Start Script

set -e

echo "🚀 AI Diet Tracker Backend Setup"
echo "================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi

echo "✓ Python $(python3 --version) detected"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1

# Install dependencies
echo "📦 Installing dependencies (this may take a few minutes)..."
pip install -r requirements.txt

# Check .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    echo "Please copy .env.example to .env and add your API keys"
    exit 1
fi

echo "✅ Setup complete!"
echo ""
echo "Starting server at http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
