# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.



<!-- To get the Project ID and work on the EAS build for ios and Android, getting the APK -->

## Why You Need an Expo Project ID

Expo requires a `projectId` to send push notifications because it needs to know which app the notification belongs to . This ID is created when you set up your project with Expo Application Services (EAS).

## Step-by-Step Setup Guide

### Step 1: Create an Expo Account (if you don't have one)

1. Go to [expo.dev/signup](https://expo.dev/signup)
2. Sign up using GitHub or Google (easiest)
3. Note your username

### Step 2: Install EAS CLI

Open your terminal in your project directory and run:

```bash
npm install -g eas-cli
```

### Step 3: Login to Expo

```bash
eas login
```

This will open a browser window for you to authenticate. After logging in, you'll see confirmation in your terminal.

### Step 4: Configure EAS for Your Project

Run this command in your project root:

```bash
eas build:configure
```

This command will:
- Check your project configuration
- Create or update `eas.json` file
- Register your project on Expo's servers
- Generate a unique **Project ID** for your app 

### Step 5: Find Your Project ID

After running the configuration, your Project ID will be automatically added to your `app.json`. Open `app.json` and look for:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "6871505d-550b-4d0e-8e87-b6537f15a5b4"
      }
    }
  }
}
```

The long string of letters and numbers is your Project ID. It should look something like `6871505d-550b-4d0e-8e87-b6537f15a5b4` .

### Step 6: Update Your `app.json` (if needed)

If the Project ID wasn't automatically added, manually add it to your `app.json`:

```json
{
  "expo": {
    "name": "SilverBackSentry",
    "slug": "SilverBackSentry",
    // ... other configurations
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID_HERE"
      }
    }
  }
}
```

### Step 7: Test Push Notifications

Now that you have your Project ID, push notifications should work. However, **important note**: Push notifications won't work in Expo Go! You need to build a development client or production app.

#### Option A: Build a Development Client (Recommended for Testing)

```bash
eas build --platform android --profile development
# or for iOS
eas build --platform ios --profile development
```

After the build completes, download and install the app on your physical device.

#### Option B: Build a Preview APK

```bash
eas build --platform android --profile preview
```

This creates an APK you can install directly on Android devices .

### Step 8: Run Your App with the Development Client

After installing the development client:

```bash
npx expo start --dev-client
```

Then open the app on your device. Push notifications should now work!

## Important Notes

### Push Notifications Won't Work in Expo Go

This is a critical point: **Expo Go does not support push notifications** . You must use a development build or production build to test notifications.

### For iOS Notifications

If you're testing on iOS, you'll need to:
1. Have an Apple Developer account
2. Configure Apple Push Notification service (APNs)
3. Upload your APNs key to Expo

### Your Current Code Already Has the Right Setup

Your `ChatScreen` already has the code to get the Project ID from `app.json`:

```javascript
const projectId = Constants.expoConfig?.extra?.eas?.projectId;
```

So once you add the Project ID to `app.json`, it will work automatically.

## Quick Troubleshooting

If notifications still aren't working:

1. **Check your `app.json`** - Make sure the Project ID is correctly added
2. **Rebuild your app** - Changes to `app.json` require a rebuild
3. **Check device permissions** - Make sure notifications are enabled for your app
4. **Check console logs** - Look for "Expo push token:" in your logs to confirm token generation

## Summary of What You Need

1. ✅ Expo account
2. ✅ EAS CLI installed
3. ✅ Run `eas build:configure` to get Project ID
4. ✅ Project ID added to `app.json`
5. ✅ Build the app (not Expo Go)
6. ✅ Run with `--dev-client` flag

Once you complete these steps, your push notifications will work exactly like WhatsApp!