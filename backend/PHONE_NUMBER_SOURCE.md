# Where Does the App Get Phone Numbers From?

## 📱 Phone Number Source

The app retrieves phone numbers from **Supabase user metadata** in the following order:

### 1. Primary Sources (Checked in Order):
```javascript
// From backend/services/whatsappService.js - getUserPhone()
const phone = data?.user?.phone ||                    // Direct phone field
             data?.user?.user_metadata?.phone ||      // Phone in metadata
             data?.user?.user_metadata?.phone_number || // Alternative field name
             null;
```

### 2. Where Users Can Add Phone Numbers:

#### ✅ **Settings Page** (Current Implementation)
- Location: `Settings` → `Profile` section
- Users can enter their phone number
- Saved to: `user.user_metadata.phone`
- Code location: `src/pages/Settings.jsx` (line 67, 271, 579-584)

#### ❌ **Sign Up Page** (Not Currently Implemented)
- The sign-up form (`src/pages/Auth.jsx`) does NOT collect phone numbers
- Only collects: Email and Password

## 🔍 How It Works

### When Sending WhatsApp Messages:

1. **Budget Alerts:**
   ```javascript
   // backend/services/notificationService.js
   const userPhone = await getUserPhone(budget.user_id);
   ```

2. **Monthly Reports:**
   ```javascript
   // backend/services/notificationService.js
   const userPhone = user.phone || 
                    user.user_metadata?.phone || 
                    user.user_metadata?.phone_number;
   ```

3. **Phone Number Lookup:**
   ```javascript
   // backend/services/whatsappService.js
   export const getUserPhone = async (userId) => {
     const { data } = await supabase.auth.admin.getUserById(userId);
     return data?.user?.phone || 
            data?.user?.user_metadata?.phone || 
            data?.user?.user_metadata?.phone_number;
   }
   ```

## 📝 Current Flow

### For Users:
1. User signs up with **Email + Password** (no phone collected)
2. User goes to **Settings** page
3. User enters phone number in **Profile** section
4. Phone is saved to `user.user_metadata.phone`
5. WhatsApp notifications can now be sent

### For Backend:
1. Notification system runs (budget alerts or monthly reports)
2. Gets user ID from budget/transaction
3. Calls `getUserPhone(userId)` to fetch phone from Supabase
4. Formats phone number (adds country code if needed)
5. Sends WhatsApp message via Twilio

## ⚠️ Current Limitations

1. **No Phone During Sign Up:**
   - Users must manually add phone in Settings
   - Many users might forget to add it

2. **No Phone Validation:**
   - No format checking
   - No verification SMS/call

3. **No Phone Required:**
   - WhatsApp notifications won't work if phone is missing
   - System just logs a warning and skips the user

## 💡 Recommendations

### Option 1: Add Phone to Sign Up (Recommended)
Update `src/pages/Auth.jsx` to collect phone during sign-up:
```javascript
const [phone, setPhone] = useState('')

// In signUp function:
await signUp(email, password, { 
  data: { phone: phone } 
})
```

### Option 2: Make Phone Required in Settings
Add validation to ensure phone is added before allowing WhatsApp notifications.

### Option 3: Add Phone Verification
Send OTP via WhatsApp to verify phone numbers.

## 🔧 How to Check User Phone Numbers

### Via Supabase Dashboard:
1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click on a user
4. Check **User Metadata** section
5. Look for `phone` or `phone_number` field

### Via Code:
```javascript
// In backend
const { data } = await supabase.auth.admin.getUserById(userId);
console.log('Phone:', data?.user?.user_metadata?.phone);
```

## 📊 Summary

**Phone Number Storage:**
- ✅ Stored in: `user.user_metadata.phone` (via Settings page)
- ✅ Alternative: `user.user_metadata.phone_number`
- ✅ Fallback: `user.phone` (if set directly)

**Where Users Add It:**
- ✅ Settings → Profile → Phone Number field

**Where Backend Gets It:**
- ✅ `getUserPhone(userId)` function in `whatsappService.js`
- ✅ Checks Supabase user metadata
- ✅ Used by `notificationService.js` for alerts and reports

**Current Status:**
- ⚠️ Phone is optional (not collected during sign-up)
- ⚠️ Users must manually add it in Settings
- ✅ Once added, WhatsApp notifications work automatically

