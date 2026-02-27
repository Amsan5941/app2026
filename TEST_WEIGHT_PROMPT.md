# Test Weight Prompt

## To test the daily weight prompt:

### Method 1: Clear AsyncStorage (Recommended)
In your app, navigate to any screen and run in the console:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.removeItem('@weight_skip_date');
```

Then close and reopen the app.

### Method 2: Check Current Status
Run this to see your current weight status:
```typescript
import { hasLoggedWeightToday, hasSkippedToday, hasCompletedWeightCheckToday } from '@/services/weightTracking';

const logged = await hasLoggedWeightToday();
const skipped = await hasSkippedToday();  
const completed = await hasCompletedWeightCheckToday();

console.log('Logged:', logged, 'Skipped:', skipped, 'Completed:', completed);
```

## Expected Behavior:

1. **On first app open each day (when logged in):**
   - Prompt appears automatically

2. **After entering weight:**
   - Prompt closes
   - Weight badge ⚖️ disappears from header

3. **After skipping:**  
   - Prompt closes
   - Weight badge ⚖️ appears in header (tap to log later)

4. **On subsequent app opens same day:**
   - No prompt (already logged or skipped)

## Troubleshooting:

- **Not logged in?** Login first, then the prompt will show
- **Already logged today?** The database already has an entry for today
- **Skipped earlier?** AsyncStorage has today's skip date stored
