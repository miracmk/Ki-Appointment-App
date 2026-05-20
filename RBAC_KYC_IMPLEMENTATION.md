# Firebase RBAC & KYC Database Architecture - Implementation Summary

## ✅ Build Status
**Production build completed successfully** with all pages prerendered and dynamic routes ready.

---

## 📋 Architecture Components Implemented

### 1. **User Roles & RBAC** 
- **4 Strictly Defined Roles**: `superadmin` > `admin` > `consultant` > `client`
- **Firestore Collection**: `users` (Document ID = Firebase Auth UID)
- **User Document Schema** (`UserDocument`):
  ```typescript
  {
    uid: string;
    email: string;
    displayName: string;
    role: 'superadmin' | 'admin' | 'consultant' | 'client';
    kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
    walletBalance: number;  // in cents
    createdAt: number;
    isActive: boolean;
  }
  ```

### 2. **KYC (Know Your Customer) System**
- **Firestore Collection**: `kyc_applications` (Document ID = user UID)
- **KYC Application Schema** (`KycApplication`):
  ```typescript
  {
    userId: string;
    appliedRole: 'consultant';
    status: 'pending' | 'approved' | 'rejected';
    firstName: string;
    lastName: string;
    nationalId: string;
    dateOfBirth: string;  // "YYYY-MM-DD"
    documentUrls: string[];
    submittedAt: number;
    reviewedAt?: number;
    reviewedByAdminId?: string;
    rejectionReason?: string;
  }
  ```

### 3. **Role-Based Route Protection**
Protected the following routes with role-based access control:

| Route | Allowed Roles | Implementation |
|-------|---------------|-----------------|
| `/admin/**` | superadmin, admin | Layout-level role check with redirect to `/unauthorized` |
| `/consultant/**` | consultant, superadmin | Layout-level role check with redirect to `/unauthorized` |
| `/dashboard/**` | All authenticated users | Client dashboard accessible to all |
| `/unauthorized` | Public | Access denied page with navigation links |

### 4. **Authentication & Authorization Hook**
- **File**: `src/lib/use-user-role.ts`
- **Hook**: `useUserRole()` returns `{ user: AppUser | null, loading: boolean }`
- **Features**:
  - Listens to Firebase Auth state changes
  - Fetches user role from Firestore
  - Supports both camelCase (new) and snake_case (legacy) field names
  - Falls back to email-based admin list from environment variables
  - Returns user role, email, display name, and KYC status

---

## 🔐 KYC Application Flow

### User Side
1. Client visits `/dashboard/kyc`
2. Form appears if KYC status is `unverified` or `rejected`
3. Submits: firstName, lastName, nationalId, dateOfBirth, documentUrls
4. API route `/api/kyc/apply` validates token and creates KYC application
5. User role remains `client`, but `kycStatus` changes to `pending`
6. Status updates periodically via `/api/kyc/status` endpoint

### Admin Side
1. Admin visits `/admin/consultants` → KYC Applications tab
2. Views pending applications with full user details
3. Can **Approve**: promotes user to `consultant` role + sets `kycStatus: 'verified'`
4. Can **Reject**: rejects application + saves rejection reason + keeps role as `client`
5. API route `/api/admin/kyc` handles both actions
6. Changes are applied to both `kyc_applications` and `users` collections

### User Role Promotion
When admin approves KYC:
```
users/{uid}:
  role: 'client' → 'consultant'
  kycStatus: 'pending' → 'verified'
  
kyc_applications/{uid}:
  status: 'pending' → 'approved'
  reviewedAt: timestamp
  reviewedByAdminId: admin_uid
```

---

## 📁 Files Created/Updated

### New Files Created
1. **`src/lib/use-user-role.ts`** - Custom hook for role-based access control
2. **`src/app/unauthorized/page.tsx`** - Access denied page
3. **`src/app/api/admin/kyc/route.ts`** - Admin KYC review endpoint (GET/POST)
4. **`src/app/api/kyc/apply/route.ts`** - User KYC application endpoint
5. **`src/app/api/kyc/status/route.ts`** - Check KYC status endpoint

### Files Updated
1. **`src/types/marketplace.ts`** - Added `UserRole`, `UserDocument`, `KycApplication` types
2. **`src/app/admin/layout.tsx`** - Role-based access control for admin routes
3. **`src/app/consultant/layout.tsx`** - Role-based access control for consultant routes
4. **`src/app/dashboard/layout.tsx`** - Added role badge + quick links based on role
5. **`src/app/dashboard/kyc/page.tsx`** - Complete KYC application form
6. **`src/app/admin/consultants/page.tsx`** - Two tabs: pending KYC + active consultants
7. **`src/app/api/admin/seed-superadmin/route.ts`** - Writes user document with new schema
8. **`src/app/register/page.tsx`** - Redirect logic for new registrations

---

## 🔑 API Endpoints Summary

### KYC User Endpoints (Authenticated)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/kyc/apply` | Submit/resubmit KYC application |
| GET | `/api/kyc/status` | Check current KYC status and role |

### KYC Admin Endpoints (Admin/Superadmin Only)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/kyc?status=pending` | List KYC applications (filterable) |
| POST | `/api/admin/kyc` | Approve or reject KYC application |

---

## ⚠️ Known Considerations

1. **Email/Password Auth Not Enabled**
   - If you encounter `auth/configuration-not-found` error during login
   - **Action Required**: Enable Email/Password authentication in Firebase Console
   - Go to: Firebase Console → Authentication → Sign-in methods → Enable "Email/Password"

2. **Backward Compatibility**
   - System supports both camelCase (new) and snake_case (legacy) field names
   - Existing documents with old field names will continue to work
   - New documents use camelCase exclusively

3. **Superadmin Fallback**
   - If Firestore is unavailable, system falls back to checking `NEXT_PUBLIC_ADMIN_EMAILS` environment variable
   - First user created via `/api/admin/seed-superadmin` is the primary superadmin
   - Email-based fallback allows graceful degradation

4. **Document URLs for KYC**
   - Currently supports text input of cloud storage URLs
   - Users paste URLs from Google Drive, Dropbox, or similar services
   - For production: consider integrating Firebase Storage for direct file uploads

---

## 🚀 Next Steps (Optional)

1. **Enable Email/Password Authentication** in Firebase Console
2. **Test the registration flow**:
   - Register as a new user → lands on `/dashboard` with `client` role
   - Submit KYC from dashboard → application pending
   - Use admin account to approve → user promoted to `consultant`
3. **Configure `NEXT_PUBLIC_ADMIN_EMAILS`** if needed for additional superadmins
4. **Test role redirects** by accessing `/admin/*` or `/consultant/*` with unauthorized roles

---

## ✨ Key Security Features

✅ Token-based API authentication using Firebase ID tokens  
✅ Server-side role verification using Firebase Admin SDK  
✅ Client-side access control with automatic redirects  
✅ Both `superadmin` and `admin` can manage KYC applications  
✅ Rejection reasons stored for audit trail  
✅ Timestamps and admin IDs tracked for all reviews  

---

**Build Status**: ✅ Production build successful (91 routes, 0 errors)
