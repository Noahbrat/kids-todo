# 👨‍👩‍👧‍👦 Family Setup Instructions

This guide will help you set up your own family's todo list app in just a few minutes!

## 🚀 Quick Start (3 Steps)

### Step 1: Fork This Repository
1. Go to the main repository page
2. Click the **"Fork"** button in the top right
3. This creates your own copy at `yourusername/kids-todo`
4. Your app will be available at `https://yourusername.github.io/kids-todo/`

### Step 2: Enable GitHub Pages
1. Go to your forked repository
2. Click **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose **main branch**
5. Click **Save**
6. Your site will be live in a few minutes!

### Step 3: Set Up Your Data Storage
1. Go to [JSONBin.io](https://jsonbin.io/) and create a **free account**
2. Go to **API Keys** section - you'll see an **X-Master-Key** already created for you
3. **Copy this X-Master-Key** (starts with `$2a$10$...`)
4. Click **"Create Bin"** in the main dashboard
5. Give it a name like `"Family Todo Data"`
6. Put some sample data like `{"test": "data"}` and click **Create**
7. **Copy the Bin ID** from the URL (e.g. `67abc123def456789`)
8. In your forked repository, **edit the existing `config.js` file**:
   - Replace the `JSONBIN_API_KEY` with your X-Master-Key
   - Replace the `JSONBIN_BIN_ID` with your Bin ID
   - Customize the `APP_TITLE` and `APP_EMOJI` for your family

```javascript
window.APP_CONFIG = {
    JSONBIN_API_KEY: 'your_actual_x_master_key_here',
    JSONBIN_BIN_ID: 'your_actual_bin_id_here',
    APP_TITLE: 'Smith Family Tasks', // Customize this!
    APP_EMOJI: '⭐' // And this!
};
```

9. Commit and push your changes
10. Visit your app - you'll see a setup wizard!

## 🎯 First Time Setup

When you first visit your app:

1. **Setup Wizard Appears**: Enter your children's names
2. **Add/Remove Children**: Use the + button or × buttons  
3. **Click "Save & Continue"**
4. **Done!** Your personalized family app is ready and will save to your JSONBin

## ⚙️ Customization Options

### Change App Title & Emoji
Edit your `config.js`:
```javascript
APP_TITLE: 'Smith Family Tasks',
APP_EMOJI: '⭐'
```

### Add/Remove Children Later
- Go to **Edit Mode**
- The current version preserves your existing children
- For major changes, use the setup wizard again

### Typical Family Workflow
1. **Parents (Edit Mode)**:
   - Add daily/weekly tasks
   - Set emojis for each task
   - Write encouraging messages
   - Mark some tasks as N/A for specific children

2. **Kids (Todo Mode)**:
   - Check off completed tasks
   - See progress clearly
   - Read parent messages
   - Get celebration animations when done!

## 🔧 Advanced Configuration

### Custom Domain (Optional)
- Purchase a domain
- Point it to `yourusername.github.io`
- Update GitHub Pages settings

### Multiple Routines
- Fork multiple times for different routines:
  - `morning-routine` → Morning tasks
  - `bedtime-routine` → Evening tasks
  - `chores` → Weekly chores

### Backup Your Data
Your data is stored in two places:
- **JSONBin.io**: Cloud storage (primary)
- **Browser localStorage**: Local backup

## 🛠️ Troubleshooting

### App Shows Setup Wizard Every Time
- Make sure `config.js` exists and has valid credentials
- Check browser console for errors
- Verify API key is correct

### Changes Not Saving
- Check internet connection
- Verify JSONBin X-Master-Key is correct (not a custom API key)
- Verify Bin ID is correct (from the bin URL after creation)
- Check browser console for error messages
- Try creating a new bin manually if the current one isn't working

### Want to Reset Everything?
1. Delete all tasks in Edit mode
2. Use "Reset All Tasks" button
3. Or create a new JSONBin and update `config.js`

## 🔒 Privacy & Security

### Your Data
- **Private**: Only you can access your family's data
- **Secure**: JSONBin.io provides secure API storage
- **Yours**: You own all data and can export anytime

### API Key Security
- Keep your `config.js` private (it's git-ignored)
- Never share your JSONBin API key
- Free tier includes 10,000 requests/month (plenty for families)

### Safe for Kids
- No user accounts or passwords required
- No data collection or tracking
- Simple, distraction-free interface

## 🚀 You're Ready!

That's it! Your family now has:
- ✅ Private, customized todo app
- ✅ Cloud sync across all devices
- ✅ Easy daily management
- ✅ Kid-friendly interface with celebrations
- ✅ Completely free hosting and storage

## 💝 Tips for Success

1. **Start Simple**: Begin with 3-5 essential tasks
2. **Use Emojis**: Kids love visual cues!
3. **Write Messages**: Daily encouragement makes a huge difference
4. **Celebrate**: The app will celebrate completed tasks!
5. **Be Flexible**: Use N/A for tasks that don't apply to all children

---

**Need Help?** Open an issue in the main repository - we're here to help families succeed! 👨‍👩‍👧‍👦